import { dbStore } from "@/lib/db/store";
import { Inquiry } from "@/lib/db/types";

export async function resolveInquiry(id: string): Promise<Inquiry | null> {
  // 1. Check local dbStore
  const local = dbStore.getInquiryById(id);
  if (local) return local;

  // 2. Query Supabase for cloud-stored or guest inquiries
  try {
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (url && key) {
      const supabase = createSupabaseClient(url, key, { auth: { persistSession: false } });
      const { data: cloudInq } = await supabase
        .from("inquiries")
        .select(`*, properties (id, title, slug)`)
        .eq("id", id)
        .maybeSingle();

      if (cloudInq) {
        const initialMsg = {
          id: `msg-${cloudInq.id}-initial`,
          inquiryId: cloudInq.id,
          senderId: cloudInq.seeker_id || "guest",
          senderName: cloudInq.seeker_name || "عميل / زائر",
          senderRole: "buyer" as const,
          content: cloudInq.message || "طلب معاينة واستفسار بخصوص العقار",
          createdAt: cloudInq.created_at,
        };

        const inqObj: Inquiry = {
          id: cloudInq.id,
          propertyId: cloudInq.property_id,
          propertyTitle: cloudInq.properties?.title || "عقار موثق",
          seekerId: cloudInq.seeker_id || "guest",
          seekerName: cloudInq.seeker_name || "عميل / زائر",
          seekerPhone: cloudInq.seeker_phone || "",
          seekerEmail: cloudInq.seeker_email || undefined,
          advertiserId: cloudInq.advertiser_id,
          message: cloudInq.message || "",
          preferredContact: cloudInq.preferred_contact || "call",
          status: cloudInq.status || "new",
          messages: [initialMsg],
          lastMessageAt: cloudInq.created_at,
          createdAt: cloudInq.created_at,
        };

        try {
          dbStore.createInquiry({
            id: inqObj.id,
            propertyId: inqObj.propertyId,
            propertyTitle: inqObj.propertyTitle,
            seekerId: inqObj.seekerId,
            seekerName: inqObj.seekerName,
            seekerPhone: inqObj.seekerPhone,
            seekerEmail: inqObj.seekerEmail,
            advertiserId: inqObj.advertiserId,
            message: inqObj.message,
            preferredContact: inqObj.preferredContact,
          });
        } catch {}

        return inqObj;
      }
    }
  } catch (err) {
    console.warn("Could not fetch cloud inquiry:", err);
  }

  return null;
}
