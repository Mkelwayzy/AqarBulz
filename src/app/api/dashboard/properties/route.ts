import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

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

    // Direct query against Supabase properties table if UUID exists
    if (advertiserUuid) {
      let query = supabase
        .from("properties")
        .select(`
          *,
          property_images (url, alt, is_main, sort_order)
        `)
        .eq("advertiser_id", advertiserUuid)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: cloudProperties, error: cloudError } = await query;

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
          images: Array.isArray(row.property_images)
            ? row.property_images
                .sort((a: any, b: any) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0) || a.sort_order - b.sort_order)
                .map((img: any) => img.url)
            : [],
          viewsCount: row.views_count || 0,
          inquiriesCount: row.inquiries_count || 0,
          addressDetails: row.address_details || "",
          moderationNotes: row.moderation_notes,
        }));

        const { data: allUserProps } = await supabase
          .from("properties")
          .select("status")
          .eq("advertiser_id", advertiserUuid);

        const statusList = (allUserProps || []).map((p: any) => p.status);
        const metrics = {
          total: statusList.length,
          published: statusList.filter((s: string) => s === "published").length,
          pending: statusList.filter((s: string) => s === "pending_review").length,
          drafts: statusList.filter((s: string) => s === "draft").length,
          rejected: statusList.filter((s: string) => s === "rejected").length,
        };

        return NextResponse.json({
          success: true,
          properties,
          metrics,
          source: "supabase",
        });
      }
    }

    // Resilient local store fallback for authenticated user
    const db = await import("@/lib/db/store").then((m) => m.dbStore);
    let localProps = db.getPropertiesByAdvertiser(user.id);
    if (statusFilter && statusFilter !== "all") {
      localProps = localProps.filter((p) => p.status === statusFilter);
    }
    const allUserProps = db.getPropertiesByAdvertiser(user.id);
    const metrics = {
      total: allUserProps.length,
      published: allUserProps.filter((p) => p.status === "published").length,
      pending: allUserProps.filter((p) => p.status === "pending_review").length,
      drafts: allUserProps.filter((p) => p.status === "draft").length,
      rejected: allUserProps.filter((p) => p.status === "rejected").length,
    };

    return NextResponse.json({
      success: true,
      properties: localProps,
      metrics,
      source: "local",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب عقارات لوحة التحكم";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
