import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { createClient as createSupabaseServerClient, createAdminClient } from "@/utils/supabase/server";
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

    const isProd = process.env.NODE_ENV === "production";
    const hasCentralDb = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    );

    if (isProd && !hasCentralDb) {
      return NextResponse.json(
        { error: "قاعدة البيانات المركزية غير مهيأة في بيئة الإنتاج" },
        { status: 503 }
      );
    }

    let inquiries: any[] = [];
    const enrichInquiryWithPropertyAndUsers = (item: any) => {
      const prop = !isProd
        ? dbStore.getRawPropertyById(item.propertyId) || dbStore.getPropertyByIdOrSlug(item.propertyId)
        : null;
      const advId = item.advertiserId || prop?.advertiserId;
      const adv = !isProd && advId ? dbStore.findUserById(advId) : null;
      const seeker = !isProd && item.seekerId ? dbStore.findUserById(item.seekerId) : null;
      return {
        ...item,
        advertiserId: advId || item.advertiserId,
        advertiserName: item.advertiserName || adv?.companyName || adv?.name || "معلن موثق",
        advertiserPhone: item.advertiserPhone || adv?.phone || undefined,
        seekerName: item.seekerName || seeker?.name || "عميل مهتم",
        seekerPhone: item.seekerPhone || seeker?.phone || "",
        seekerEmail: item.seekerEmail || seeker?.email || "",
        propertyTitle: item.propertyTitle || prop?.title || "عقار موثق",
        propertySlug: item.propertySlug || prop?.slug,
        propertyPrice: item.propertyPrice ?? prop?.price,
        propertyImage: item.propertyImage || (Array.isArray(prop?.images) ? prop.images[0] : undefined),
      };
    };

    if (!hasCentralDb) {
      // Development / test fixture mode only
      if (user.role === "admin" && mode === "admin") {
        inquiries = dbStore.getAllInquiriesForAdmin().map(enrichInquiryWithPropertyAndUsers);
      } else if (mode === "seeker") {
        inquiries = dbStore.getInquiriesForSeeker(user.id, user.phone, user.email).map(enrichInquiryWithPropertyAndUsers);
      } else if (mode === "advertiser") {
        inquiries = dbStore.getInquiriesForAdvertiser(user.id).map(enrichInquiryWithPropertyAndUsers);
      } else {
        const adv = dbStore.getInquiriesForAdvertiser(user.id);
        const seek = dbStore.getInquiriesForSeeker(user.id, user.phone, user.email);
        const map = new Map<string, any>();
        [...adv, ...seek].forEach((item) => {
          map.set(item.id, enrichInquiryWithPropertyAndUsers(item));
        });
        inquiries = Array.from(map.values());
      }
    } else {
      const supabase = getPrivilegedSupabaseClient();
      let query = supabase
        .from("inquiries")
        .select("*, properties(id, title, slug, price, advertiser_id, user_id, owner_id)");

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

      const { data: cloudInquiries, error: cloudInqError } = await query;
      if (cloudInqError) {
        return NextResponse.json(
          { error: `فشل جلب طلبات التواصل من قاعدة البيانات المركزية: ${cloudInqError.message}` },
          { status: 503 }
        );
      }

      inquiries = (cloudInquiries || []).map((ci: any) => {
        const isUserSeeker =
          ci.seeker_id === user.id ||
          (Boolean(user.phone) && ci.seeker_phone === user.phone) ||
          (Boolean(user.email) && ci.seeker_email?.toLowerCase() === user.email?.toLowerCase());

        const resolvedAdvId =
          ci.advertiser_id ||
          ci.properties?.advertiser_id ||
          ci.properties?.user_id ||
          ci.properties?.owner_id;

        return enrichInquiryWithPropertyAndUsers({
          id: ci.id,
          propertyId: ci.property_id,
          propertyTitle: ci.properties?.title || "عقار موثق",
          propertySlug: ci.properties?.slug,
          propertyPrice: ci.properties?.price ? Number(ci.properties.price) : undefined,
          seekerId: isUserSeeker ? user.id : (ci.seeker_id || "guest"),
          seekerName: ci.seeker_name,
          seekerPhone: ci.seeker_phone,
          seekerEmail: ci.seeker_email,
          advertiserId: resolvedAdvId,
          message: ci.message,
          preferredContact: ci.preferred_contact || "call",
          status: ci.status || "new",
          createdAt: ci.created_at,
          lastMessageAt: ci.updated_at || ci.created_at,
        });
      });
    }

    let totalUnread = 0;
    const inquiryIds = inquiries.map((i: any) => i.id).filter(Boolean);

    const cloudUnreadMap = new Map<string, number>();
    const cloudCountMap = new Map<string, number>();
    const cloudLastMessageAtMap = new Map<string, string>();

    if (hasCentralDb && inquiryIds.length > 0) {
      const adminClient = createAdminClient();
      const { data: msgRows, error: msgError } = await adminClient
        .from("inquiry_messages")
        .select("inquiry_id, sender_id, is_read, created_at")
        .in("inquiry_id", inquiryIds)
        .order("created_at", { ascending: true });

      if (msgError && isProd) {
        return NextResponse.json(
          { error: `فشل جلب رسائل المحادثات من قاعدة البيانات المركزية: ${msgError.message}` },
          { status: 503 }
        );
      }

      if (msgRows) {
        const isAdminViewer = user.role === "admin" || (user.role as string) === "superadmin";
        for (const row of msgRows) {
          cloudCountMap.set(row.inquiry_id, (cloudCountMap.get(row.inquiry_id) || 0) + 1);
          if (row.created_at) {
            cloudLastMessageAtMap.set(row.inquiry_id, row.created_at);
          }
          if (row.is_read === false && (isAdminViewer || row.sender_id !== user.id)) {
            cloudUnreadMap.set(row.inquiry_id, (cloudUnreadMap.get(row.inquiry_id) || 0) + 1);
          }
        }
      }
    }

    const enrichedInquiries = inquiries
      .map((inq: any) => {
        const unread = hasCentralDb
          ? cloudUnreadMap.get(inq.id) || 0
          : dbStore.getInquiryUnreadCount(inq.id, user.id);
        totalUnread += unread;

        const messagesCount = hasCentralDb
          ? cloudCountMap.get(inq.id) || 1
          : Array.isArray(inq.messages)
            ? inq.messages.length
            : 1;

        const lastMessageAt =
          cloudLastMessageAtMap.get(inq.id) ||
          inq.lastMessageAt ||
          (Array.isArray(inq.messages) && inq.messages.length > 0
            ? inq.messages[inq.messages.length - 1].createdAt
            : inq.createdAt);

        return {
          ...inq,
          unreadCount: unread,
          messagesCount,
          lastMessageAt,
        };
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.lastMessageAt || b.createdAt).getTime() -
          new Date(a.lastMessageAt || a.createdAt).getTime()
      );

    return NextResponse.json({
      inquiries: enrichedInquiries,
      totalUnread,
    });
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

    const isProd = process.env.NODE_ENV === "production";
    const hasCentralDb = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    );

    if (isProd && !hasCentralDb) {
      return NextResponse.json(
        { error: "قاعدة البيانات المركزية غير مهيأة في بيئة الإنتاج" },
        { status: 503 }
      );
    }

    // 1. Authoritative property lookup: Central Supabase first when configured
    let canonicalPropId = propertyId;
    let propertyTitle: string | undefined = undefined;
    let advertiserId: string | undefined = undefined;
    let propertyStatus: string | undefined = undefined;
    let rawProp = !isProd ? dbStore.getRawPropertyById(propertyId) : null;

    if (hasCentralDb) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
      const supabaseAdmin = createAdminClient();
      let query = supabaseAdmin
        .from("properties")
        .select("id, title, status, advertiser_id, user_id, owner_id, price, project_details");

      if (isUuid) {
        query = query.eq("id", propertyId);
      } else {
        query = query.eq("slug", propertyId);
      }

      const { data: cloudData, error: queryErr } = await query.maybeSingle();
      if (queryErr && isProd) {
        return NextResponse.json(
          { error: `فشل التحقق من العقار في قاعدة البيانات المركزية: ${queryErr.message}` },
          { status: 503 }
        );
      }
      if (cloudData) {
        canonicalPropId = cloudData.id;
        propertyTitle = cloudData.title;
        advertiserId =
          cloudData.advertiser_id ||
          cloudData.user_id ||
          cloudData.owner_id ||
          cloudData.project_details?.creatorSessionId ||
          "admin";
        propertyStatus = cloudData.status;
      }
    }

    if (!propertyTitle && !isProd) {
      if (rawProp) {
        propertyTitle = rawProp.title;
        advertiserId = rawProp.advertiserId;
        propertyStatus = rawProp.status;
      } else {
        const bySlug = dbStore.getPropertyByIdOrSlug(propertyId, user || undefined);
        if (bySlug) {
          canonicalPropId = bySlug.id;
          propertyTitle = bySlug.title;
          advertiserId = bySlug.advertiserId || (bySlug as any).userId || (bySlug as any).ownerId || "admin";
          propertyStatus = bySlug.status;
        }
      }
    }

    // Strictly reject nonexistent properties
    if (!propertyTitle) {
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

    const finalAdvId: string = advertiserId || "admin";

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

    if (body.advertiserId && finalAdvId !== "admin" && body.advertiserId !== finalAdvId) {
      console.warn(`[Inquiries] Notice: advertiserId in body (${body.advertiserId}) differs from authoritative listing advertiser (${finalAdvId}). Using authoritative.`);
    }

    const isPropUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(canonicalPropId);
    let cloudInquiryId: string | undefined = undefined;

    const finalSeekerName = seekerName?.trim() || user.name || "عميل مهتم";
    const finalSeekerPhone = seekerPhone?.trim() || user.phone || "";
    const finalSeekerEmail = seekerEmail?.trim() || user.email || "";

    // Idempotency guard: prevent duplicate inquiry creation on rapid retry/double-click (within 15s)
    const existingLocalForSeeker = dbStore.getInquiriesForSeeker(user.id, finalSeekerPhone, finalSeekerEmail);
    const nowMs = Date.now();
    const recentIdentical = existingLocalForSeeker.find(
      (i) =>
        i.propertyId === canonicalPropId &&
        i.message.trim() === message.trim() &&
        nowMs - new Date(i.createdAt).getTime() < 15000
    );
    if (recentIdentical) {
      return NextResponse.json({ success: true, inquiry: recentIdentical, deduplicated: true });
    }

    if (hasCentralDb && isPropUuid) {
      const supabase = getPrivilegedSupabaseClient();

      let validAdvertiserId: string | null = null;
      if (finalAdvId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalAdvId)) {
        try {
          const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(finalAdvId);
          if (!authErr && authUser?.user?.id) {
            validAdvertiserId = authUser.user.id;
          }
        } catch {
          validAdvertiserId = null;
        }
      }

      let validSeekerId: string | null = null;
      if (user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
        try {
          const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(user.id);
          if (!authErr && authUser?.user?.id) {
            validSeekerId = authUser.user.id;
          }
        } catch {
          validSeekerId = null;
        }
      }

      const inquiryPayload = {
        property_id: canonicalPropId,
        seeker_id: validSeekerId,
        advertiser_id: validAdvertiserId,
        seeker_name: finalSeekerName,
        seeker_phone: finalSeekerPhone,
        seeker_email: finalSeekerEmail,
        message: message.trim(),
        preferred_contact: preferredContact || "call",
        status: "new",
      };

      let { data: cloudInquiry, error: cloudErr } = await supabase
        .from("inquiries")
        .insert(inquiryPayload)
        .select()
        .single();

      if (cloudErr && (cloudErr.code === "23503" || cloudErr.message?.includes("foreign key"))) {
        const retryRes = await supabase
          .from("inquiries")
          .insert({
            ...inquiryPayload,
            seeker_id: null,
            advertiser_id: null,
          })
          .select()
          .single();
        cloudInquiry = retryRes.data;
        cloudErr = retryRes.error;
      }

      if (cloudErr) {
        console.error("[Inquiries] Authoritative Supabase inquiry insert failed:", cloudErr);
        if (isProd) {
          return NextResponse.json(
            { error: `فشل حفظ طلب التواصل في قاعدة البيانات المركزية: ${cloudErr.message}` },
            { status: 503 }
          );
        }
      } else {
        cloudInquiryId = cloudInquiry?.id;
      }

      if (cloudInquiryId) {
        try {
          let { error: msgErr } = await supabase.from("inquiry_messages").insert({
            inquiry_id: cloudInquiryId,
            sender_id: validSeekerId,
            sender_name: finalSeekerName,
            sender_role: "buyer",
            content: message.trim(),
            is_read: false,
          });

          if (msgErr && (msgErr.code === "23503" || msgErr.message?.includes("foreign key"))) {
            await supabase.from("inquiry_messages").insert({
              inquiry_id: cloudInquiryId,
              sender_id: null,
              sender_name: finalSeekerName,
              sender_role: "buyer",
              content: message.trim(),
              is_read: false,
            });
          }
        } catch {}
      }
    }

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

