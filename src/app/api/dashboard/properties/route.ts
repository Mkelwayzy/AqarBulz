import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { isSupabaseDirect } from "@/lib/services/propertyService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول للوصول إلى عقارات لوحة التحكم" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const supabase = createSupabaseServerClient();
    const { data: { user: supaUser } } = await supabase.auth.getUser();

    // Resolve verified advertiser UUID
    let advertiserUuid = supaUser?.id;
    if (!advertiserUuid) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      if (isUuid) {
        advertiserUuid = user.id;
      } else if (user.email) {
        const { data: dbUser } = await supabase.from("profiles").select("id").eq("email", user.email).single();
        if (dbUser?.id) {
          advertiserUuid = dbUser.id;
        }
      }
    }

    // 1. Direct Supabase Retrieval (100% cloud database in production)
    if (isSupabaseDirect() && advertiserUuid) {
      try {
        const { data: cloudProperties, error: cloudError } = await supabase
          .from("properties")
          .select(`
            *,
            property_images (url, alt, is_main, sort_order)
          `)
          .eq("advertiser_id", advertiserUuid)
          .order("created_at", { ascending: false });

        if (!cloudError && Array.isArray(cloudProperties)) {
          const properties = cloudProperties.map((row: any) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            description: row.description,
            price: Number(row.price),
            currency: row.currency || "EGP",
            transactionType: row.transaction_type,
            category: row.category,
            areaSqM: Number(row.area_sqm),
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            images: Array.isArray(row.property_images) && row.property_images.length > 0
              ? row.property_images
                  .sort((a: any, b: any) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0) || a.sort_order - b.sort_order)
                  .map((img: any) => img.url)
              : [],
            viewsCount: row.views_count || 0,
            inquiriesCount: row.inquiries_count || 0,
            addressDetails: row.address_details || "",
            moderationNotes: row.moderation_notes,
            isProject: Boolean(row.is_project || row.isProject),
          }));

          let filteredProps = properties;
          if (statusFilter && statusFilter !== "all") {
            filteredProps = filteredProps.filter((p) => p.status === statusFilter);
          }

          return NextResponse.json({
            success: true,
            properties: filteredProps,
            metrics: {
              total: properties.length,
              published: properties.filter((p) => p.status === "published").length,
              pending: properties.filter((p) => p.status === "pending_review").length,
              drafts: properties.filter((p) => p.status === "draft").length,
              rejected: properties.filter((p) => p.status === "rejected").length,
            },
            source: "supabase",
          });
        }
      } catch (err) {
        console.warn("Supabase fetch notice in dashboard/properties:", err);
      }
    }

    // 2. Fallback to local store only in offline test environments without Supabase
    const combinedPropertiesMap = new Map<string, any>();
    const db = await import("@/lib/db/store").then((m) => m.dbStore);
    const userPropIds = new Set([user.id, ...(advertiserUuid ? [advertiserUuid] : [])]);
    const allLocalProps = db.getAllPropertiesForAdmin().filter(
      (p) =>
        userPropIds.has(p.advertiserId) ||
        (user.email && (p as any).advertiserEmail === user.email) ||
        (user.phone && (p as any).advertiserPhone === user.phone)
    );

    for (const p of allLocalProps) {
      combinedPropertiesMap.set(p.id, {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        price: Number(p.price),
        currency: p.currency || "EGP",
        transactionType: p.transactionType,
        category: p.category,
        areaSqM: Number(p.areaSqM),
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        images: Array.isArray(p.images) ? p.images : [],
        viewsCount: p.viewsCount || 0,
        inquiriesCount: p.inquiriesCount || 0,
        addressDetails: p.addressDetails || "",
        moderationNotes: p.moderationNotes,
        isProject: p.isProject,
      });
    }

    const allUserProps = Array.from(combinedPropertiesMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    const metrics = {
      total: allUserProps.length,
      published: allUserProps.filter((p) => p.status === "published").length,
      pending: allUserProps.filter((p) => p.status === "pending_review").length,
      drafts: allUserProps.filter((p) => p.status === "draft").length,
      rejected: allUserProps.filter((p) => p.status === "rejected").length,
    };

    let filteredProps = allUserProps;
    if (statusFilter && statusFilter !== "all") {
      filteredProps = filteredProps.filter((p) => p.status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      properties: filteredProps,
      metrics,
      source: "hybrid_unified",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب عقارات لوحة التحكم";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
