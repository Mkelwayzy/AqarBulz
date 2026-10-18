import { dbStore } from "@/lib/db/store";
import { Inquiry } from "@/lib/db/types";
import { createAdminClient } from "@/utils/supabase/server";

export async function resolveInquiry(id: string): Promise<Inquiry | null> {
  // 1. Check local dbStore first
  const local = dbStore.getInquiryById(id);
  if (local) {
    if (!local.propertySlug || !local.propertyImage || !local.propertyPrice) {
      const p = dbStore.getRawPropertyById(local.propertyId) || dbStore.getPropertyByIdOrSlug(local.propertyId);
      if (p) {
        local.propertySlug = local.propertySlug || p.slug;
        local.propertyPrice = local.propertyPrice || p.price;
        local.propertyImage = local.propertyImage || (Array.isArray(p.images) ? p.images[0] : undefined);
      }
    }
    if ((!local.advertiserName || !local.advertiserPhone) && local.advertiserId) {
      const adv = dbStore.findUserById(local.advertiserId);
      if (adv) {
        local.advertiserName = local.advertiserName || adv.companyName || adv.name;
        local.advertiserPhone = local.advertiserPhone || adv.phone;
      }
    }
    return local;
  }

  // 2. Authoritative Query in Supabase using Service Role (createAdminClient)
  try {
    const supabaseAdmin = createAdminClient();
    const { data: cloudInq, error: inqErr } = await supabaseAdmin
      .from("inquiries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!inqErr && cloudInq) {
      let propData: any = null;
      let propImage: string | undefined = undefined;

      if (cloudInq.property_id) {
        const isPropUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cloudInq.property_id);
        let propQuery = supabaseAdmin
          .from("properties")
          .select("id, title, slug, price, advertiser_id, user_id, owner_id");

        if (isPropUuid) {
          propQuery = propQuery.eq("id", cloudInq.property_id);
        } else {
          propQuery = propQuery.eq("slug", cloudInq.property_id);
        }

        const { data: propRow } = await propQuery.maybeSingle();
        propData = propRow;

        // Fetch property main image
        if (isPropUuid) {
          const { data: imgRows } = await supabaseAdmin
            .from("property_images")
            .select("url")
            .eq("property_id", cloudInq.property_id)
            .order("is_main", { ascending: false })
            .limit(1);
          if (imgRows && imgRows.length > 0) {
            propImage = imgRows[0].url;
          }
        }
      }

      // Check local property if cloud didn't resolve property image or slug
      if (!propData && cloudInq.property_id) {
        propData = dbStore.getRawPropertyById(cloudInq.property_id) || dbStore.getPropertyByIdOrSlug(cloudInq.property_id);
        if (propData && !propImage && Array.isArray(propData.images) && propData.images.length > 0) {
          propImage = propData.images[0];
        }
      }

      const resolvedAdvertiserId =
        cloudInq.advertiser_id ||
        propData?.advertiser_id ||
        propData?.advertiserId ||
        propData?.user_id ||
        propData?.userId ||
        propData?.owner_id ||
        propData?.ownerId ||
        undefined;

      let advertiserName: string | undefined = undefined;
      let advertiserPhone: string | undefined = undefined;

      if (resolvedAdvertiserId) {
        const localAdv = dbStore.findUserById(resolvedAdvertiserId);
        if (localAdv) {
          advertiserName = localAdv.companyName || localAdv.name;
          advertiserPhone = localAdv.phone;
        }
        if (!advertiserName || !advertiserPhone) {
          const isAdvUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedAdvertiserId);
          if (isAdvUuid) {
            const { data: advProfile } = await supabaseAdmin
              .from("profiles")
              .select("full_name, company_name, phone")
              .eq("id", resolvedAdvertiserId)
              .maybeSingle();
            if (advProfile) {
              advertiserName = advertiserName || advProfile.company_name || advProfile.full_name || undefined;
              advertiserPhone = advertiserPhone || advProfile.phone || undefined;
            }
          }
        }
      }

      const initialMsg = {
        id: `msg-${cloudInq.id}-initial`,
        inquiryId: cloudInq.id,
        senderId: cloudInq.seeker_id || "guest",
        senderName: cloudInq.seeker_name || "عميل / زائر",
        senderRole: "buyer" as const,
        content: cloudInq.message || "طلب معاينة واستفسار بخصوص العقار",
        createdAt: cloudInq.created_at,
        isRead: false,
      };

      const inqObj: Inquiry = {
        id: cloudInq.id,
        propertyId: cloudInq.property_id,
        propertyTitle: propData?.title || "عقار موثق",
        propertySlug: propData?.slug || undefined,
        propertyPrice: propData?.price ? Number(propData.price) : undefined,
        propertyImage: propImage || (Array.isArray(propData?.images) ? propData.images[0] : undefined),
        seekerId: cloudInq.seeker_id || "guest",
        seekerName: cloudInq.seeker_name || "عميل / زائر",
        seekerPhone: cloudInq.seeker_phone || "",
        seekerEmail: cloudInq.seeker_email || "",
        advertiserId: resolvedAdvertiserId || "",
        advertiserName,
        advertiserPhone,
        message: cloudInq.message || "",
        preferredContact: cloudInq.preferred_contact || "call",
        status: cloudInq.status || "new",
        messages: [initialMsg],
        lastMessageAt: cloudInq.updated_at || cloudInq.created_at,
        createdAt: cloudInq.created_at,
      };

      try {
        const created = dbStore.createInquiry({
          id: inqObj.id,
          propertyId: inqObj.propertyId,
          propertyTitle: inqObj.propertyTitle,
          propertySlug: inqObj.propertySlug,
          propertyPrice: inqObj.propertyPrice,
          propertyImage: inqObj.propertyImage,
          seekerId: inqObj.seekerId,
          seekerName: inqObj.seekerName,
          seekerPhone: inqObj.seekerPhone,
          seekerEmail: inqObj.seekerEmail,
          advertiserId: inqObj.advertiserId,
          advertiserName: inqObj.advertiserName,
          advertiserPhone: inqObj.advertiserPhone,
          message: inqObj.message,
          preferredContact: inqObj.preferredContact,
        });
        if (inqObj.status && inqObj.status !== "new") {
          dbStore.updateInquiryStatus(created.id, inqObj.status, inqObj.advertiserId || "admin", "admin");
        }
      } catch {}

      return inqObj;
    }
  } catch (err) {
    console.warn("[resolveInquiry] Could not fetch cloud inquiry:", err);
  }

  return null;
}
