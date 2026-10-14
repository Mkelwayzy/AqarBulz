import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { dbStore } from "@/lib/db/store";
import { isValidPhone, normalizeEgyptianPhone } from "@/lib/auth/security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({ user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNAUTHORIZED";
    const status = message === "ACCOUNT_SUSPENDED" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { name, phone, avatarUrl, whatsappEnabled, licenseNumber, companyName, bio } = body;

    if (phone) {
      if (!isValidPhone(phone)) {
        return NextResponse.json(
          { error: "رقم الهاتف غير صالح، يرجى كتابة رقم صحيح" },
          { status: 400 }
        );
      }
      const normalized = normalizeEgyptianPhone(phone);
      const existing = dbStore.findUserByPhone(normalized);
      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          { error: "رقم الهاتف المدخل مسجل بالفعل لدى مستخدم آخر في المنصة" },
          { status: 409 }
        );
      }
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    if (isUuid) {
      try {
        const { createClient: createSupabaseServerClient } = await import("@/utils/supabase/server");
        const supabase = createSupabaseServerClient();
        await supabase
          .from("profiles")
          .update({
            name: typeof name === "string" ? name.trim() : undefined,
            phone: typeof phone === "string" ? phone.trim() : undefined,
            avatar_url: typeof avatarUrl === "string" ? avatarUrl.trim() : undefined,
            bio: typeof bio === "string" ? bio.trim() : undefined,
            whatsapp_enabled: typeof whatsappEnabled === "boolean" ? whatsappEnabled : undefined,
            license_number: typeof licenseNumber === "string" ? licenseNumber.trim() : undefined,
            company_name: typeof companyName === "string" ? companyName.trim() : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch (cloudErr) {
        console.warn("[ProfilePUT] Supabase sync notice:", cloudErr);
      }
    }

    const updatedUser = dbStore.updateUserProfile(user.id, {
      name: typeof name === "string" ? name.trim() : undefined,
      phone: typeof phone === "string" ? phone.trim() : undefined,
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl.trim() : undefined,
      bio: typeof bio === "string" ? bio.trim() : undefined,
      whatsappEnabled: typeof whatsappEnabled === "boolean" ? whatsappEnabled : undefined,
      licenseNumber: typeof licenseNumber === "string" ? licenseNumber.trim() : undefined,
      companyName: typeof companyName === "string" ? companyName.trim() : undefined,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء تحديث الملف الشخصي";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
