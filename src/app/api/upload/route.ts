import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function validateImageMagicBytes(buffer: Buffer, declaredType: string): boolean {
  if (buffer.length < 12) return false;
  // JPEG: 0xFF 0xD8 0xFF
  if (declaredType === "image/jpeg" || declaredType === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // PNG: 0x89 0x50 0x4E 0x47
  if (declaredType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  // WebP: RIFF .... WEBP
  if (declaredType === "image/webp") {
    return (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    );
  }
  // AVIF: contains ftyp
  if (declaredType === "image/avif") {
    const headerStr = buffer.subarray(4, 12).toString("ascii");
    return headerStr.includes("ftyp");
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول لرفع الصور" },
        { status: 401 }
      );
    }
    if (user.isSuspended) {
      return NextResponse.json(
        { error: "تم تعليق هذا الحساب ولا يمكن رفع وسائط جديدة" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const propertyId = (formData.get("propertyId") as string) || "draft";

    if (!file) {
      return NextResponse.json(
        { error: "لم يتم اختيار أي ملف للرفع" },
        { status: 400 }
      );
    }

    // 1. Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم. الأنواع المسموحة فقط: JPG, PNG, WEBP, AVIF" },
        { status: 400 }
      );
    }

    // 2. Validate File Size (Max 10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "حجم الصورة يتجاوز الحد الأقصى المسموح به (10 ميجابايت)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Deep Magic Bytes inspection (Prevent spoofed mime-types)
    if (!validateImageMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "محتوى الملف لا يطابق نوع الصورة المصرح به. يرجى رفع ملف صورة سليم." },
        { status: 400 }
      );
    }

    // 4. Generate sanitized path scoped to authenticated user
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storagePath = `${user.id}/${propertyId}/${cleanFileName}`;

    // 5. Upload to Supabase Storage bucket 'property-images'
    try {
      const supabase = createSupabaseServerClient();
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(storagePath, buffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("property-images")
          .getPublicUrl(storagePath);

        // 6. If linked to an existing UUID property, insert into property_images table
        const isPropUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
        if (isPropUuid) {
          await supabase.from("property_images").insert({
            property_id: propertyId,
            url: publicUrlData.publicUrl,
            alt: file.name,
            is_main: false,
            sort_order: 1,
          });
        }

        return NextResponse.json({
          success: true,
          url: publicUrlData.publicUrl,
          path: storagePath,
          filename: file.name,
          source: "supabase_storage",
        });
      } else {
        console.warn("[Upload] Supabase Storage returned notice, falling back to local storage:", uploadError.message);
      }
    } catch (cloudErr) {
      console.warn("[Upload] Supabase Storage exception, using local fallback:", cloudErr);
    }

    // Resilient Fallback: Store securely in local public uploads directory
    const fs = await import("fs/promises");
    const path = await import("path");
    const uploadDir = path.join(process.cwd(), "public", "uploads", "properties", user.id);
    await fs.mkdir(uploadDir, { recursive: true });
    const localFilePath = path.join(uploadDir, cleanFileName);
    await fs.writeFile(localFilePath, buffer);

    const localPublicUrl = `/uploads/properties/${user.id}/${cleanFileName}`;
    return NextResponse.json({
      success: true,
      url: localPublicUrl,
      path: `local/${user.id}/${cleanFileName}`,
      filename: file.name,
      source: "local_storage",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء معالجة الصورة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "مسار الصورة مطلوب" }, { status: 400 });
    }

    // Strict ownership verification: path MUST start with user.id
    if (!path.startsWith(`${user.id}/`) && !path.startsWith(`local/${user.id}/`)) {
      return NextResponse.json(
        { error: "غير مصرح لك بحذف ملفات لا تملكها" },
        { status: 403 }
      );
    }

    if (path.startsWith("local/")) {
      try {
        const fs = await import("fs/promises");
        const pathModule = await import("path");
        const relativeFilePath = path.replace(/^local\//, "");
        const localFilePath = pathModule.join(process.cwd(), "public", "uploads", "properties", relativeFilePath);
        await fs.unlink(localFilePath);
      } catch (e) {
        // Ignored
      }
      return NextResponse.json({ success: true, message: "تم حذف الصورة بنجاح" });
    }

    try {
      const supabase = createSupabaseServerClient();
      await supabase.storage.from("property-images").remove([path]);
    } catch (e) {
      // Ignored
    }

    return NextResponse.json({ success: true, message: "تم حذف الصورة بنجاح" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ في حذف الصورة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
