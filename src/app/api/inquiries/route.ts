import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { propertyService } from "@/lib/services/propertyService";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // 'advertiser' or 'seeker'

    let inquiries = [];
    if (mode === "advertiser" || user.role === "broker" || user.role === "owner") {
      inquiries = dbStore.getInquiriesForAdvertiser(user.id);
    } else {
      inquiries = dbStore.getInquiriesForSeeker(user.id);
    }

    // Attempt cloud inquiries merge if user has a cloud UUID
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    if (isUserUuid) {
      try {
        const supabase = createSupabaseServerClient();
        let query = supabase.from("inquiries").select("*");
        if (mode === "advertiser" || user.role === "broker" || user.role === "owner") {
          query = query.eq("advertiser_id", user.id);
        } else {
          query = query.eq("seeker_id", user.id);
        }
        const { data: cloudInquiries } = await query;
        if (cloudInquiries && cloudInquiries.length > 0) {
          const mapped = cloudInquiries.map((ci: any) => ({
            id: ci.id,
            propertyId: ci.property_id,
            propertyTitle: "عقار سحابي موثق",
            seekerId: ci.seeker_id || "guest",
            seekerName: ci.seeker_name,
            seekerPhone: ci.seeker_phone,
            seekerEmail: ci.seeker_email,
            advertiserId: ci.advertiser_id,
            message: ci.message,
            preferredContact: ci.preferred_contact || "call",
            status: ci.status || "new",
            createdAt: ci.created_at,
          }));
          const existingIds = new Set(inquiries.map((i) => i.id));
          const uniqueCloud = mapped.filter((m: any) => !existingIds.has(m.id));
          inquiries = [...inquiries, ...uniqueCloud];
        }
      } catch (e) {
        console.warn("Could not fetch cloud inquiries:", e);
      }
    }

    return NextResponse.json({ inquiries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب طلبات التواصل";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { propertyId, message, seekerName, seekerPhone, seekerEmail, preferredContact } = body;

    if (!propertyId || !message || !seekerName || !seekerPhone) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف والرسالة مطلوبة" }, { status: 400 });
    }

    // 1. Resilient property lookup (Local DB -> Property Service -> Supabase Direct)
    let rawProp = dbStore.getRawPropertyById(propertyId);
    let propertyTitle = rawProp?.title;
    let advertiserId = rawProp?.advertiserId;

    if (!propertyTitle || !advertiserId) {
      // 2. Try propertyService which queries Supabase PostGIS rows and local records
      const resolved = await propertyService.getPublicPropertyBySlugOrId(propertyId, user);
      if (resolved) {
        propertyTitle = resolved.title;
        advertiserId = resolved.advertiserId;
      } else {
        // 3. Try local store by slug
        const bySlug = dbStore.getPropertyByIdOrSlug(propertyId, user || undefined);
        if (bySlug) {
          propertyTitle = bySlug.title;
          advertiserId = bySlug.advertiserId;
        } else {
          // 4. Try direct Supabase query
          try {
            const supabase = createSupabaseServerClient();
            const { data: cloudData } = await supabase
              .from("properties")
              .select("id, title, advertiser_id")
              .or(`id.eq.${propertyId},slug.eq.${propertyId}`)
              .single();
            if (cloudData) {
              propertyTitle = cloudData.title;
              advertiserId = cloudData.advertiser_id;
            }
          } catch (e) {
            console.warn("Direct Supabase property lookup fallback:", e);
          }
        }
      }
    }

    if (!propertyTitle || !advertiserId) {
      if (body.propertyTitle) {
        propertyTitle = body.propertyTitle;
      }
      if (!advertiserId) {
        const adminUser = dbStore.getUsers().find((u: { role: string; id: string }) => u.role === "admin");
        advertiserId = adminUser ? adminUser.id : "user-admin";
      }
    }

    if (!propertyTitle) {
      return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });
    }

    const finalAdvId: string = advertiserId || "user-admin";

    // 2. Create Inquiry in local store
    const inquiry = dbStore.createInquiry({
      propertyId,
      propertyTitle,
      seekerId: user ? user.id : "guest-" + Date.now(),
      seekerName,
      seekerPhone,
      seekerEmail: seekerEmail || (user?.email ? user.email : "guest@example.com"),
      advertiserId: finalAdvId,
      message,
      preferredContact: preferredContact || "call",
    });

    // 3. Cloud synchronization if UUID exists
    try {
      const isPropUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
      const isAdvUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalAdvId);
      if (isPropUuid && isAdvUuid) {
        const supabase = createSupabaseServerClient();
        const isUserUuid = user && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
        await supabase.from("inquiries").insert({
          property_id: propertyId,
          seeker_id: isUserUuid ? user?.id : null,
          advertiser_id: finalAdvId,
          seeker_name: seekerName,
          seeker_phone: seekerPhone,
          seeker_email: seekerEmail || (user?.email ? user.email : "guest@example.com"),
          message,
          preferred_contact: preferredContact || "call",
        });
      }
    } catch (cloudErr) {
      console.warn("Could not sync inquiry to Supabase:", cloudErr);
    }

    return NextResponse.json({ success: true, inquiry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء إرسال طلب التواصل";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
