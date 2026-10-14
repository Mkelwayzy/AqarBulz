import { NextResponse } from "next/server";
import { smartFeaturesStore } from "@/lib/db/smartFeaturesStore";
import { dbStore } from "@/lib/db/store";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staticCompounds = typeof smartFeaturesStore?.getCompoundMasterplans === "function" ? smartFeaturesStore.getCompoundMasterplans() : [];

    // 1. Fetch real projects from local store (strictly where isProject === true)
    const localProperties = dbStore
      .getAllPropertiesForAdmin()
      .filter((p) => p.status === "published" && p.isProject === true);

    // 2. Fetch real projects from Supabase cloud database (strictly where is_project is true)
    let cloudProperties: any[] = [];
    try {
      const supabase = createSupabaseServerClient();
      const { data } = await supabase
        .from("properties")
        .select(`
          *,
          property_images (url, alt, is_main, sort_order)
        `)
        .eq("status", "published")
        .eq("is_project", true)
        .order("created_at", { ascending: false });

      if (data && Array.isArray(data)) {
        cloudProperties = data;
      }
    } catch {
      // Offline fallback
    }

    // Transform cloud properties
    const mappedCloudProjects = cloudProperties.map((row: any) => {
      const imgs = Array.isArray(row.property_images) && row.property_images.length > 0
        ? row.property_images
            .sort((a: any, b: any) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0) || a.sort_order - b.sort_order)
            .map((img: any) => img.url)
        : ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80"];

      return {
        id: row.id,
        slug: row.slug,
        nameAr: row.title,
        nameEn: row.title,
        developerNameAr: row.advertiser_type === "broker" ? "وسيط ومطور معتمد" : "مالك مباشر",
        districtNameAr: row.address_details || "مدينة المنصورة",
        lat: Number(row.exact_lat || 31.0409),
        lng: Number(row.exact_lng || 31.3785),
        totalAreaFeddan: Number((Number(row.area_sqm || 150) / 4200.83).toFixed(2)) || 1,
        deliveryYear: row.year_built || new Date().getFullYear(),
        startingPrice: Number(row.price),
        installmentYearsMax: row.installment_years || 5,
        downPaymentPercent: row.down_payment ? Math.min(100, Math.round((Number(row.down_payment) / Number(row.price)) * 100)) : 10,
        coverImage: imgs[0],
        masterplanMapUrl: imgs[1] || imgs[0],
        descriptionAr: row.description,
        availableUnitsCount: row.bedrooms || 1,
        amenities: [],
        category: row.category,
        isRealProperty: true,
      };
    });

    // Transform local properties that are not already in cloud list
    const seenIds = new Set(mappedCloudProjects.map((p) => p.id));
    const mappedLocalProjects = localProperties
      .filter((p) => !seenIds.has(p.id))
      .map((p) => {
        const coverImg = p.images && p.images.length > 0
          ? p.images[0]
          : "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80";
        const secondImg = p.images && p.images.length > 1 ? p.images[1] : coverImg;

        return {
          id: p.id,
          slug: p.slug,
          nameAr: p.title,
          nameEn: p.title,
          developerNameAr: (p as any).advertiserName || (p.advertiserType === "broker" ? "وسيط ومطور معتمد" : "مالك مباشر"),
          districtNameAr: p.addressDetails || "مدينة ميت غمر",
          lat: p.lat,
          lng: p.lng,
          totalAreaFeddan: Number((p.areaSqM / 4200.83).toFixed(2)) || 1,
          deliveryYear: p.yearBuilt || new Date().getFullYear(),
          startingPrice: p.price,
          installmentYearsMax: p.installmentYears || 5,
          downPaymentPercent: p.downPayment ? Math.min(100, Math.round((p.downPayment / p.price) * 100)) : 10,
          coverImage: coverImg,
          masterplanMapUrl: secondImg,
          descriptionAr: p.description,
          availableUnitsCount: p.bedrooms || 1,
          amenities: p.amenities || [],
          category: p.category,
          isRealProperty: true,
        };
      });

    // Production Mode: Only real published properties/projects added to the platform are displayed.
    // All benchmark/fake projects have been wiped out for real operation.
    const allCompounds = [
      ...mappedCloudProjects,
      ...mappedLocalProjects,
    ];

    return NextResponse.json({
      success: true,
      compounds: allCompounds,
      totalRealProjects: allCompounds.length,
      totalBenchmarkProjects: 0,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
