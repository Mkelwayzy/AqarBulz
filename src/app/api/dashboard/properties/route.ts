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
      } else if (user.email === "tarek.broker@aqarpulse.eg") {
        advertiserUuid = "a0000000-0000-0000-0000-000000000001";
      }
    }

    if (!advertiserUuid) {
      return NextResponse.json(
        { error: "يتطلب الوصول إلى لوحة تحكم العقارات جلسة موثقة في قاعدة البيانات السحابية." },
        { status: 401 }
      );
    }

    // Direct query against Supabase properties table
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

    // Strict rule: No silent fallback disguising cloud query failures!
    if (cloudError) {
      console.error("Supabase dashboard properties query error:", cloudError);
      return NextResponse.json(
        { error: `فشل جلب عقارات لوحة التحكم من قاعدة البيانات السحابية: ${cloudError.message}` },
        { status: 500 }
      );
    }

    const properties = (cloudProperties || []).map((row: any) => ({
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

    // Calculate metrics directly from user's cloud listings
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب عقارات لوحة التحكم";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
