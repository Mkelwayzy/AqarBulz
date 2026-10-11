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
    if (user.role === "admin") {
      inquiries = dbStore.getAllInquiriesForAdmin();
    } else if (mode === "advertiser" || user.role === "broker" || user.role === "owner") {
      inquiries = dbStore.getInquiriesForAdvertiser(user.id);
    } else {
      inquiries = dbStore.getInquiriesForSeeker(user.id);
    }

    // Attempt cloud inquiries merge
    try {
      const supabase = createSupabaseServerClient();
      let query = supabase.from("inquiries").select("*");
      if (user.role !== "admin") {
        if (mode === "advertiser" || user.role === "broker" || user.role === "owner") {
          query = query.eq("advertiser_id", user.id);
        } else {
          query = query.eq("seeker_id", user.id);
        }
      }
      const { data: cloudInquiries } = await query;
      if (cloudInquiries && cloudInquiries.length > 0) {
        const mapped = cloudInquiries.map((ci: any) => ({
          id: ci.id,
          propertyId: ci.property_id,
          propertyTitle: "عقار موثق",
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
    } catch {
      // Offline fallback
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

    if (!propertyId || !message || typeof message !== "string" || !message.trim() || !seekerName || !seekerPhone) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف والرسالة مطلوبة" }, { status: 400 });
    }

    if (message.trim().length > 5000) {
      return NextResponse.json({ error: "محتوى الرسالة طويل جداً (الحد الأقصى 5000 حرف)" }, { status: 400 });
    }

    // 1. Authoritative property lookup (Local DB -> Supabase)
    let rawProp = dbStore.getRawPropertyById(propertyId);
    let propertyTitle = rawProp?.title;
    let advertiserId = rawProp?.advertiserId;
    let propertyStatus = rawProp?.status;

    if (!rawProp) {
      const bySlug = dbStore.getPropertyByIdOrSlug(propertyId, user || undefined);
      if (bySlug) {
        propertyTitle = bySlug.title;
        advertiserId = bySlug.advertiserId;
        propertyStatus = bySlug.status;
      } else {
        // Query Supabase directly
        try {
          const supabase = createSupabaseServerClient();
          const { data: cloudData } = await supabase
            .from("properties")
            .select("id, title, advertiser_id, status")
            .or(`id.eq.${propertyId},slug.eq.${propertyId}`)
            .single();
          if (cloudData) {
            propertyTitle = cloudData.title;
            advertiserId = cloudData.advertiser_id;
            propertyStatus = cloudData.status;
          }
        } catch (e) {
          console.warn("Direct Supabase property lookup notice:", e);
        }
      }
    }

    // Strictly reject nonexistent properties
    if (!propertyTitle || !advertiserId) {
      return NextResponse.json({ error: "العقار المطلوب غير موجود" }, { status: 404 });
    }

    // Strictly reject inquiries for unpublished or ineligible properties
    if (propertyStatus && propertyStatus !== "published") {
      return NextResponse.json(
        { error: "لا يمكن إرسال طلب تواصل لعقار غير متاح أو قيد المراجعة" },
        { status: 400 }
      );
    }

    const finalAdvId: string = advertiserId;

    // 2. Create Inquiry in local store
    const inquiry = dbStore.createInquiry({
      propertyId,
      propertyTitle,
      seekerId: user ? user.id : "guest-" + Date.now(),
      seekerName: user ? (user.name || seekerName) : seekerName,
      seekerPhone: user ? (user.phone || seekerPhone) : seekerPhone,
      seekerEmail: user?.email ? user.email : (seekerEmail || undefined),
      advertiserId: finalAdvId,
      message: message.trim(),
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
