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
    const mode = searchParams.get("mode"); // 'advertiser', 'seeker', or 'admin'

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
              row.in
