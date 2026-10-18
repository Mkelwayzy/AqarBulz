import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { createClient as createSupabaseServerClient, createAdminClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/session";
import { isCentralDbEnabled } from "@/lib/services/inquiryResolver";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const mode = searchParams.get("mode");

    const isProd = process.env.NODE_ENV === "production";
    const hasCentralDb = isCentralDbEnabled();

    if (isProd && !hasCentralDb) {
      return NextResponse.json(
        { error: "قاعدة البيانات المركزية غير مهيأة في بيئة الإنتاج" },
        { status: 503 }
      );
    }

    const isAdminUser =
      user.role === "admin" ||
      (user as any).role === "superadmin" ||
      (user as any).role === "moderator" ||
      (user as any).role === "support";

    let inquiries: any[] = [];
    const enrichInquiryWithPropertyAndUsers = (item: any, profileMap?: Map<string, any>) => {
      const prop = !isProd
        ? dbStore.getRawPropertyById(item.propertyId) ||
          dbStore.getPropertyByIdOrSlug(item.propertyId)
        : null;
      const advId = item.advertiserId || prop?.advertiserId;
      const cloudAdv = advId && profileMap ? profileMap.get(advId) : null;
      const cloudSeeker = item.seekerId && profileMap ? profileMap.get(item.seekerId) : null;
      const adv = !isProd && advId ? dbStore.findUserById(advId) : null;
      const seeker = !isProd && item.seekerId ? dbStore.findUserById(item.seekerId) : null;

      return {
        ...item,
        advertiserId: advId || item.advertiserId,
        advertiserName:
          item.advertiserName ||
          cloudAdv?.company_name ||
          cloudAdv?.name ||
          cloudAdv?.full_name ||
          adv?.companyName ||
          adv?.name ||
          "معلن موثق",
        advertiserPhone:
          item.advertiserPhone || cloudAdv?.phone || adv?.phone || undefined,
        seekerName:
          item.seekerName ||
          cloudSeeker?.name ||
          cloudSeeker?.full_name ||
          seeker?.name ||
          "عميل مهتم",
        seekerPhone:
          item.seekerPhone || cloudSeeker?.phone || seeker?.phone || "",
        seekerEmail:
          item.seekerEmail || cloudSeeker?.email || seeker?.email || "",
        propertyTitle: item.propertyTitle || prop?.title || "عقار موثق",
        propertySlug: item.propertySlug || prop?.slug,
        propertyPrice: item.propertyPrice ?? prop?.price,
        propertyImage:
          item.propertyImage ||
          (Array.isArray(prop?.images) ? prop.images[0] : undefined),
      };
    };

    if (!hasCentralDb) {
      if (isAdminUser && mode === "admin") {
        inquiries = dbStore
          .getAllInquiriesForAdmin()
          .map((i) => enrichInquiryWithPropertyAndUsers(i));
      } else if (mode === "seeker") {
        inquiries = dbStore
          .getInquiriesForSeeker(user.id, user.phone, user.email)
          .map((i) => enrichInquiryWithPropertyAndUsers(i));
      } else if (mode === "advertiser") {
        inquiries = dbStore
          .getInquiriesForAdvertiser(user.id)
          .map((i) => enrichInquiryWithPropertyAndUsers(i));
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

      if (!(isAdminUser && mode === "admin")) {
        const ownedPropertyIds: string[] = [];
        if (mode !== "seeker" && UUID_REGEX.test(user.id)) {
          try {
            const { data: ownedProps } = await supabase
              .from("properties")
              .select("id")
              .or(
                `advertiser_id.eq.${user.id},user_id.eq.${user.id},owner_id.eq.${user.id}`
              );
            if (Array.isArray(ownedProps)) {
              ownedProps.forEach((p: any) => {
                if (p?.id && UUID_REGEX.test(p.id)) ownedPropertyIds.push(p.id);
              });
            }
          } catch {}
        }

        const advConditions = [`advertiser_id.eq.${user.id}`];
        if (ownedPropertyIds.length > 0) {
          advConditions.push(`property_id.in.(${ownedPropertyIds.join(",")})`);
        }

        if (mode === "seeker") {
          query = query.or(seekerConditions.join(","));
        } else if (mode === "advertiser") {
          query = query.or(advConditions.join(","));
        } else {
          query = query.or([...advConditions, ...seekerConditions].join(","));
        }
      }

      const { data: cloudInquiries, error: cloudInqError } = await query;
      if (cloudInqError) {
        return NextResponse.json(
          {
            error: `فشل جلب طلبات التواصل من قاعدة البيانات المركزية: ${cloudInqError.message}`,
          },
          { status: 503 }
        );
      }

      const profileIdsToFetch = new Set<string>();
      (cloudInquiries || []).forEach((ci: any) => {
        const advId =
          ci.advertiser_id ||
          ci.properties?.advertiser_id ||
          ci.properties?.user_id ||
          ci.properties?.owner_id;
        if (advId && UUID_REGEX.test(advId)) profileIdsToFetch.add(advId);
        if (ci.seeker_id && UUID_REGEX.test(ci.seeker_id)) {
          profileIdsToFetch.add(ci.seeker_id);
        }
      });

      const profileMap = new Map<string, any>();
      if (profileIdsToFetch.size > 0) {
        try {
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("*")
            .in("id", Array.from(profileIdsToFetch));
          if (Array.isArray(profileRows)) {
            profileRows.forEach((p: any) => {
              if (p?.id) profileMap.set(p.id, p);
            });
          }
        } catch {}
      }

      inquiries = (cloudInquiries || []).map((ci: any) => {
        const isUserSeeker =
          ci.seeker_id === user.id ||
          (Boolean(user.phone?.trim()) &&
            ci.seeker_phone?.trim() === user.phone.trim()) ||
          (Boolean(user.email?.trim()) &&
            ci.seeker_email?.trim().toLowerCase() ===
              user.email?.trim().toLowerCase());

      const resolvedAdvId =
      ci.advertiser_id ||
      ci.properties?.advertiser_id ||
      ci.properties?.user_id ||
      ci.properties?.owner_id;

        return enrichInquiryWithPropertyAndUsers(
          {
            id: ci.id,
            propertyId: ci.property_id,
            propertyTitle: ci.properties?.title || "عقار موثق",
            propertySlug: ci.properties?.slug,
            propertyPrice: ci.properties?.price
              ? Number(ci.properties.price)
              : undefined,
            seekerId: isUserSeeker ? user.id : ci.seeker_id || "guest",
            seekerName: ci.seeker_name,
            seekerPhone: ci.seeker_phone,
            seekerEmail: ci.seeker_email,
            advertiserId: resolvedAdvId,
            message: ci.message,
            preferredContact: ci.preferred_contact || "call",
            status: ci.status || "new",
            createdAt: ci.created_at,
            lastMessageAt: ci.updated_at || ci.created_at,
          },
          profileMap
        );
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
        .select("inquiry_id, sender_id, is_read, content, created_at")
        .in("inquiry_id", inquiryIds)
        .order("created_at", { ascending: true });

      if (msgError && isProd) {
        return NextResponse.json(
          {
            error: `فشل جلب رسائل المحادثات من قاعدة البيانات المركزية: ${msgError.message}`,
          },
          { status: 503 }
        );
      }

      if (msgRows) {
        for (const row of msgRows) {
          const isInternal =
            Boolean((row as any).is_internal_note) ||
            String(row.content || "").startsWith("[ملاحظة داخلية للإدارة]");

          if (isInternal && !isAdminUser) {
            continue;
          }

          cloudCountMap.set(
            row.inquiry_id,
            (cloudCountMap.get(row.inquiry_id) || 0) + 1
          );
          if (row.created_at) {
            cloudLastMessageAtMap.set(row.inquiry_id, row.created_at);
          }
          if (
            row.is_read === false &&
            (isAdminUser || row.sender_id !== user.id)
          ) {
            cloudUnreadMap.set(
              row.inquiry_id,
              (cloudUnreadMap.get(row.inquiry_id) || 0) + 1
            );
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
    const message =
      err instanceof Error ? err.message : "خطأ أثناء جلب طلبات التواصل";
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

    const {
      propertyId,
      message,
      seekerName,
      seekerPhone,
      seekerEmail,
      preferredContact,
    } = body;

    if (
      !propertyId ||
      !message ||
      typeof message !== "string" ||
      !message.trim() ||
      !seekerName ||
      !seekerPhone
    ) {
      return NextResponse.json(
        { error: "الاسم ورقم الهاتف والرسالة مطلوبة" },
        { status: 400 }
      );
    }

    if (message.trim().length > 5000) {
      return NextResponse.json(
        { error: "محتوى الرسالة طويل جداً (الحد الأقصى 5000 حرف)" },
        { status: 400 }
      );
    }

    const isProd = process.env.NODE_ENV === "production";
    const hasCentralDb = isCentralDbEnabled();

    if (isProd && !hasCentralDb) {
      return NextResponse.json(
        { error: "قاعدة البيانات المركزية غير مهيأة في بيئة الإنتاج" },
        { status: 503 }
      );
    }

    let canonicalPropId = propertyId;
    let propertyTitle: string | undefined = undefined;
    let propertySlug: string | undefined = undefined;
    let propertyPrice: number | undefined = undefined;
    let advertiserId: string | undefined = undefined;
    let propertyStatus: string | undefined = undefined;
    const rawProp = !isProd ? dbStore.getRawPropertyById(propertyId) : null;

    if (hasCentralDb) {
      const isUuid = UUID_REGEX.test(propertyId);
      const supabaseAdmin = createAdminClient();
      let query = supabaseAdmin
        .from("properties")
        .select("id, title, slug, status, advertiser_id, user_id, owner_id, price, project_details");

      if (isUuid) {
        query = query.eq("id", propertyId);
      } else {
        query = query.eq("slug", propertyId);
      }

      const { data: cloudData, error: queryErr } = await query.maybeSingle();
      if (queryErr && isProd) {
        return NextResponse.json(
          {
            error: `فشل التحقق من العقار في قاعدة البيانات المركزية: ${queryErr.message}`,
          },
          { status: 503 }
        );
      }
      if (cloudData) {
        canonicalPropId = cloudData.id;
        propertyTitle = cloudData.title;
        propertySlug = cloudData.slug;
        propertyPrice = cloudData.price ? Number(cloudData.price) : undefined;
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
        propertySlug = rawProp.slug;
        propertyPrice = rawProp.price;
        advertiserId = rawProp.advertiserId;
        propertyStatus = rawProp.status;
      } else {
        const bySlug = dbStore.getPropertyByIdOrSlug(propertyId, user || undefined);
        if (bySlug) {
          canonicalPropId = bySlug.id;
          propertyTitle = bySlug.title;
          propertySlug = bySlug.slug;
          propertyPrice = bySlug.price;
          advertiserId =
            bySlug.advertiserId ||
            (bySlug as any).userId ||
            (bySlug as any).ownerId ||
            "admin";
          propertyStatus = bySlug.status;
        }
      }
    }

    if (!propertyTitle) {
      return NextResponse.json(
        { error: "العقار المطلوب غير موجود" },
        { status: 404 }
      );
    }

    const isAvailable =
      propertyStatus === "active" || propertyStatus === "published";
    if (!isAvailable) {
      return NextResponse.json(
        { error: "لا يمكن إرسال طلب تواصل لعقار غير متاح أو قيد المراجعة" },
        { status: 400 }
      );
    }

    const finalAdvId: string = advertiserId || "admin";

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

    if (user && body.seekerId && body.seekerId !== user.id) {
      return NextResponse.json(
        {
          error:
            "لا يمكن انتحال هوية باحث آخر (Seeker Impersonation Violation)",
        },
        { status: 400 }
      );
    }

    const isPropUuid = UUID_REGEX.test(canonicalPropId);
