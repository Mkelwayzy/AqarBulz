import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function getPrivilegedSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    return createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return createSupabaseServerClient();
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // 'advertiser' or 'seeker'

    let inquiries = [];
    if (user.role === "admin" && mode === "admin") {
      inquiries = dbStore.getAllInquiriesForAdmin();
    } else if (mode === "seeker") {
      inquiries = dbStore.getInquiriesForSeeker(user.id, user.phone, user.email);
    } else if (mode === "advertiser") {
      inquiries = dbStore.getInquiriesForAdvertiser(user.id);
    } else {
      // Unified account: return both incoming and sent inquiries strictly for this user
      const adv = dbStore.getInquiriesForAdvertiser(user.id);
      const seek = dbStore.getInquiriesForSeeker(user.id, user.phone, user.email);
      const map = new Map<string, any>();
      [...adv, ...seek].forEach((item) => map.set(item.id, item));
      inquiries = Array.from(map.values());
    }

    // Attempt cloud inquiries merge with strict user boundary (matching user.id, phone, or email)
    try {
      const supabase = getPrivilegedSupabaseClient();
      let query = supabase.from("inquiries").select("*, properties(id, title, slug)");

      const seekerConditions = [`seeker_id.eq.${user.id}`];
      if (user.phone && typeof user.phone === "string" && user.phone.trim()) {
        seekerConditions.push(`seeker_phone.eq.${user.phone.trim()}`);
      }
      if (user.email && typeof user.email === "string" && user.email.trim()) {
        seekerConditions.push(`seeker_email.eq.${user.email.trim().toLowerCase()}`);
      }

      if (!(user.role === "admin" && mode === "admin")) {
        if (mode === "seeker") {
          query = query.or(seekerConditions.join(","));
        } else if (mode === "advertiser") {
          query = query.eq("advertiser_id", user.id);
        } else {
          const advCondition = `advertiser_id.eq.${user.id}`;
          query = query.or([advCondition, ...seekerConditions].join(","));
        }
      }
      const { data: cloudInquiries } = await query;
      if (cloudInquiries && cloudInquiries.length > 0) {
        const mapped = cloudInquiries.map((ci: any) => {
          const isUserSeeker =
            ci.seeker_id === user.id ||
            (Boolean(user.phone) && ci.seeker_phone === user.phone) ||
            (Boolean(user.email) && ci.seeker_email?.toLowerCase() === user.email?.toLowerCase());

          return {
            id: ci.id,
            propertyId: ci.property_id,
            propertyTitle: ci.properties?.title || "عقار موثق",
            seekerId: isUserSeeker ? user.id : (ci.seeker_id || "guest"),
            seekerName: ci.seeker_name,
            seekerPhone: ci.seeker_phone,
            seekerEmail: ci.seeker_email,
            advertiserId: ci.advertiser_id,
            message: ci.message,
            preferredContact: ci.preferred_contact || "call",
            status: ci.status || "new",
            createdAt: ci.created_at,
          };
        });
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
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً لإرسال طلب استفسار أو حجز معاينة." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { propertyId, message, seekerName, seekerPhone, seekerEmail, preferredContact } = body;

    if (!propertyId || !message || typeof message !== "string" || !message.trim() || !seekerName || !seekerPhone) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف والرسالة مطلوبة" }, { status: 400 });
    }

    if (message.trim().length > 5000) {
      return NextResponse.json({ error: "محتوى الرسالة طويل جداً (الحد الأقصى 5000 حرف)" }, { status: 400 });
    }

    // 1. Authoritative property lookup (Supabase live -> Local DB)
    let canonicalPropId = propertyId;
    let rawProp = dbStore.getRawPropertyById(propertyId);
    let propertyTitle = rawProp?.title;
    let advertiserId = rawProp?.advertiserId;
    let propertyStatus = rawProp?.status;

    // Check Cloud Supabase for live data (resolves canonical UUID and accurate status)
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
      const supabase = getPrivilegedSupabaseClient();
      let query = supabase.from("properties").select("id, title, advertiser_id, status");
      if (isUuid) {
        query = query.eq("id", propertyId);
      } else {
        query = query.or(`id.eq.${propertyId},slug.eq.${propertyId}`);
      }
      const { data: cloudData } = await query.maybeSingle();
      if (cloudData) {
        canonicalPropId = cloudData.id;
        propertyTitle = cloudData.title;
        advertiserId = cloudData.advertiser_id;
        propertyStatus = cloudData.status;
      }
    } catch (e) {
      console.warn("Direct Supabase property lookup notice:", e);
    }

    if (!propertyTitle || !advertiserId) {
      const bySlug = dbStore.getPropertyByIdOrSlug(propertyId, user || undefined);
      if (bySlug) {
        canonicalPropId = bySlug.id;
        propertyTitle = bySlug.title;
        advertiserId = bySlug.advertiserId;
        propertyStatus = bySlug.status;
      }
    }

    // Strictly reject nonexistent properties
    if (!propertyTitle || !advertiserId) {
      return NextResponse.json({ error: "العقار المطلوب غير موجود" }, { status: 404 });
    }

    // Allow inquiries on active and published properties
    const isAvailable = propertyStatus === "active" || propertyStatus === "published";
    if (!isAvailable) {
      return NextResponse.json(
        { error: "لا يمكن إرسال طلب تواصل لعقار غير متاح أو قيد المراجعة" },
        { status: 400 }
      );
    }

    const finalAdvId: string = advertiserId;

    // Prevent property owner from submitting an inquiry to their own listing
    if (
      user &&
      (user.id === finalAdvId ||
       user.id === rawProp?.userId ||
       user.id === (rawProp as any)?.ownerId)
    ) {
      return NextResponse.json(
        { error: "لا يمكنك إرسال استفسار أو طلب معاينة لإعلانك الخاص." },
        { status: 400 }
      );
    }

    // Seeker & Advertiser Impersonation Guard
    if (user && body.seekerId && body.seekerId !== user.id) {
      return NextResponse.json(
        { error: "لا يمكن انتحال هوية باحث آخر (Seeker Impersonation Violation)" },
        { status: 400 }
      );
    }

    if (body.advertiserId && body.advertiserId !== finalAdvId) {
      return NextResponse.json(
        { error: "معرف المعلن غير مطابق للسجل المعتمد للعقار (Advertiser Tampering Violation)" },
        { status: 400 }
      );
    }

    // 2. Authoritative Cloud write to Supabase if UUID exists
    const isPropUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(canonicalPropId);
    const isAdvUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalAdvId);
    let cloudInquiryId: string | undefined = undefined;

    const finalSeekerName = seekerName?.trim() || user.name || "عميل مهتم";
    const finalSeekerPhone = seekerPhone?.trim() || user.phone || "";
    const finalSeekerEmail = seekerEmail?.trim() || user.email || "";

    if (isPropUuid && isAdvUuid) {
      const supabase = getPrivilegedSupabaseClient();
      const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      let validSeekerId: string | null = null;
      if (isUserUuid) {
        try {
          const { data: profileExists } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (profileExists) {
            validSeekerId = user.id;
          }
        } catch {
          validSeekerId = null;
        }
      }

      const { data: cloudInquiry, error: cloudErr } = await supabase
        .from("inquiries")
        .insert({
          property_id: canonicalPropId,
          seeker_id: validSeekerId,
          advertiser_id: finalAdvId,
          seeker_name: finalSeekerName,
          seeker_phone: finalSeekerPhone,
          seeker_email: finalSeekerEmail,
          message: message.trim(),
          preferred_contact: preferredContact || "call",
        })
        .select()
        .single();

      if (cloudErr) {
        console.error("[Inquiries] Authoritative Supabase inquiry insert failed:", cloudErr);
        return NextResponse.json(
          { error: `فشل تسجيل طلب التواصل في قاعدة البيانات السحابية: ${cloudErr.message}` },
          { status: 500 }
        );
      }
      cloudInquiryId = cloudInquiry?.id;

      // Also record initial message in inquiry_messages if the table exists
      if (cloudInquiryId) {
        try {
          await supabase.from("inquiry_messages").insert({
            inquiry_id: cloudInquiryId,
            sender_id: validSeekerId,
            sender_name: finalSeekerName,
            sender_role: "buyer",
            content: message.trim(),
          });
        } catch {
          // Non-blocking if table is not yet migrated in Supabase
        }
      }
    }

    // 3. Mirror in local store only after authoritative write succeeds
    const inquiry = dbStore.createInquiry({
      id: cloudInquiryId,
      propertyId: canonicalPropId,
      propertyTitle,
      seekerId: user.id,
      seekerName: finalSeekerName,
      seekerPhone: finalSeekerPhone,
      seekerEmail: finalSeekerEmail || undefined,
      advertiserId: finalAdvId,
      message: message.trim(),
      preferredContact: preferredContact || "call",
    });

    return NextResponse.json({ success: true, inquiry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء إرسال طلب التواصل";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

