import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { propertyService } from "@/lib/services/propertyService";
import { PropertyCategory, TransactionType, LocationPrivacy, FinishingStatus, FurnishingStatus } from "@/lib/db/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const viewer = await getCurrentUser();

    // Parse Bounding Box [swLat, swLng, neLat, neLng]
    let bounds = undefined;
    const boundsParam = searchParams.get("bounds");
    if (boundsParam) {
      try {
        const [swLat, swLng, neLat, neLng] = boundsParam.split(",").map(Number);
        if (!isNaN(swLat) && !isNaN(swLng) && !isNaN(neLat) && !isNaN(neLng)) {
          bounds = {
            southWest: { lat: swLat, lng: swLng },
            northEast: { lat: neLat, lng: neLng },
          };
        }
      } catch {
        // Ignored
      }
    }

    // Parse Radius [lat, lng, radiusKm]
    let radius = undefined;
    const radiusParam = searchParams.get("radius");
    if (radiusParam) {
      try {
        const [lat, lng, radiusKm] = radiusParam.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(radiusKm)) {
          radius = {
            center: { lat, lng },
            radiusKm,
          };
        }
      } catch {
        // Ignored
      }
    }

    // Parse Polygon if provided
    let polygon = undefined;
    const polyParam = searchParams.get("polygon");
    if (polyParam) {
      try {
        polygon = JSON.parse(polyParam);
      } catch {
        // Ignored
      }
    }

    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const minArea = searchParams.get("minArea") ? Number(searchParams.get("minArea")) : undefined;
    const maxArea = searchParams.get("maxArea") ? Number(searchParams.get("maxArea")) : undefined;
    const bedrooms = searchParams.get("bedrooms") ? Number(searchParams.get("bedrooms")) : undefined;
    const bathrooms = searchParams.get("bathrooms") ? Number(searchParams.get("bathrooms")) : undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 24;

    const result = await propertyService.queryPublicProperties(
      {
        transactionType: searchParams.get("transactionType") as TransactionType || undefined,
        category: searchParams.get("category") as PropertyCategory || undefined,
        cityId: searchParams.get("cityId") || undefined,
        districtId: searchParams.get("districtId") || undefined,
        minPrice,
        maxPrice,
        minArea,
        maxArea,
        bedrooms,
        bathrooms,
        finishingStatus: searchParams.get("finishingStatus") as FinishingStatus || undefined,
        furnishingStatus: searchParams.get("furnishingStatus") as FurnishingStatus || undefined,
        advertiserType: searchParams.get("advertiserType") as "owner" | "broker" || undefined,
        verifiedOnly: searchParams.get("verifiedOnly") === "true",
        featuredOnly: searchParams.get("featuredOnly") === "true",
        searchQuery: searchParams.get("q") || undefined,
        bounds,
        radius,
        polygon,
        sort: searchParams.get("sort") as "newest" | "price_asc" | "price_desc" | "area_asc" | "area_desc" | "relevance" || "newest",
        page,
        limit,
      },
      viewer || undefined
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ في البحث عن العقارات";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
import { resolveCityUuid, resolveDistrictUuid } from "@/lib/db/taxonomy-map";
import { createClient as createSupabaseServerClient, createAdminClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول لإضافة عقار" }, { status: 401 });
    }
    if (user.isSuspended) {
      return NextResponse.json({ error: "تم تعليق هذا الحساب ولا يمكن إضافة عقارات جديدة" }, { status: 403 });
    }

    const body = await req.json();

    // Required fields validation
    if (!body.title?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: "عنوان العقار والوصف التفصيلي مطلوبان" }, { status: 400 });
    }

    const price = Number(body.price);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: "سعر العقار يجب أن يكون رقماً صحيحاً وموجباً" }, { status: 400 });
    }

    const areaSqM = Number(body.areaSqM);
    if (isNaN(areaSqM) || areaSqM <= 0) {
      return NextResponse.json({ error: "مساحة العقار يجب أن تكون رقماً موجباً" }, { status: 400 });
    }

    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "الإحداثيات الجغرافية غير صالحة" }, { status: 400 });
    }

    // Egypt geographic boundary sanity check (Egypt spans roughly Lat 21-32, Lng 24-37)
    if (lat < 21 || lat > 32.5 || lng < 24 || lng > 37.5) {
      return NextResponse.json({ error: "الموقع الجغرافي يجب أن يقع ضمن حدود جمهورية مصر العربية" }, { status: 400 });
    }

    // Unified accounts: Any authenticated user can submit their properties directly

    // Status enforcement: Ordinary owners/brokers cannot force "published"
    let initialStatus: "draft" | "pending_review" | "published" = "pending_review";
    if (body.status === "draft") {
      initialStatus = "draft";
    } else if (user.role === "admin" && body.status === "published") {
      initialStatus = "published";
    } else {
      initialStatus = "pending_review";
    }

    // Resolve geographic foreign keys to valid PostgreSQL UUIDs
    const cityIdUuid = resolveCityUuid(body.cityId);
    const districtIdUuid = resolveDistrictUuid(body.districtId);

    // Verify Supabase Cloud session & identity
    const authHeader = req.headers.get("authorization");
    const authToken = authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.substring(7).trim()
      : undefined;

    const isSupabaseJwt = Boolean(authToken && authToken.split(".").length === 3);
    const supabase = createSupabaseServerClient(undefined, isSupabaseJwt ? authToken : undefined);
    const supabaseAdmin = createAdminClient();

    let supaUser = null;
    if (isSupabaseJwt) {
      try {
        const { data: { user: foundUser } } = await supabase.auth.getUser();
        supaUser = foundUser;
      } catch {
        // Ignored
      }
    }

    // Resolve advertiser UUID candidate
    let advertiserUuid = supaUser?.id;
    if (!advertiserUuid) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      if (isUuid) {
        advertiserUuid = user.id;
      } else if (user.email) {
        try {
          const { data: dbUser } = await supabaseAdmin.from("profiles").select("id").eq("email", user.email).maybeSingle();
          if (dbUser?.id) {
            advertiserUuid = dbUser.id;
          }
        } catch {}
      }
    }

    // Verify advertiser foreign key integrity against cloud database before attaching
    let validAdvertiserId: string | null = null;
    if (advertiserUuid) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(advertiserUuid);
      if (isUuid) {
        try {
          const { data: userExists } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("id", advertiserUuid)
            .maybeSingle();

          if (userExists?.id) {
            validAdvertiserId = advertiserUuid;
          }
        } catch {
          validAdvertiserId = null;
        }
      }
    }

    // Fallback: Check profiles by email if validAdvertiserId is still not found
    if (!validAdvertiserId && user.email) {
      try {
        const { data: userByEmail } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (userByEmail?.id) {
          validAdvertiserId = userByEmail.id;
        }
      } catch {}
    }

    // Unique slug generation
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const rawSlug = (body.slug || body.title)
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 45);
    const slug = `${rawSlug || "property"}-${Date.now().toString(36)}-${randomSuffix}`;

    // Location privacy obfuscation if approximate
    let approximateLat: number | null = null;
    let approximateLng: number | null = null;
    if (body.locationPrivacy === "approximate") {
      const latOffset = Math.sin(lat * 1000) * 0.0035;
      const lngOffset = Math.cos(lng * 1000) * 0.0035;
      approximateLat = Number((lat + latOffset).toFixed(6));
      approximateLng = Number((lng + lngOffset).toFixed(6));
    }

    const defaultImages = [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    ];
    const propertyImages = Array.isArray(body.images) && body.images.length > 0 ? body.images : defaultImages;

    // Strict numerical sanitation to avoid DB overflows and invalid null states
    const sanitizedPrice = Math.max(0, Number(price));
    const sanitizedAreaSqM = Math.max(0.01, Number(areaSqM));
    const sanitizedDownPayment = (body.hasInstallment && body.downPayment != null && !isNaN(Number(body.downPayment)))
      ? Math.max(0, Number(body.downPayment))
      : null;
    const sanitizedInstallmentYears = (body.hasInstallment && body.installmentYears != null && !isNaN(Number(body.installmentYears)))
      ? Math.max(1, parseInt(String(body.installmentYears), 10))
      : null;
    const sanitizedBedrooms = (body.bedrooms != null && !isNaN(Number(body.bedrooms)))
      ? Math.max(0, parseInt(String(body.bedrooms), 10))
      : null;
    const sanitizedBathrooms = (body.bathrooms != null && !isNaN(Number(body.bathrooms)))
      ? Math.max(0, parseInt(String(body.bathrooms), 10))
      : null;
    const sanitizedFloor = (body.floor != null && body.floor !== "" && !isNaN(Number(body.floor)))
      ? parseInt(String(body.floor), 10)
      : null;
    const sanitizedTotalFloors = (body.totalFloors != null && body.totalFloors !== "" && !isNaN(Number(body.totalFloors)))
      ? Math.max(1, parseInt(String(body.totalFloors), 10))
      : null;
    const hasBuildingPermit = Boolean(body.hasBuildingPermit);

    // 1. Primary write directly to Supabase cloud database
    const supabasePayload = {
      slug,
      title: body.title.trim(),
      description: body.description.trim(),
      transaction_type: body.transactionType || "sale",
      category: body.category || "apartment",
      price: sanitizedPrice,
      currency: "EGP",
      rental_period: body.rentalPeriod || null,
      negotiable: Boolean(body.negotiable),
      down_payment: sanitizedDownPayment,
      installment_years: sanitizedInstallmentYears,
      area_sqm: sanitizedAreaSqM,
      bedrooms: sanitizedBedrooms,
      bathrooms: sanitizedBathrooms,
      floor: sanitizedFloor,
      total_floors: sanitizedTotalFloors,
      has_building_permit: hasBuildingPermit,
      finishing_status: body.finishingStatus || "fully_finished",
      furnishing_status: body.furnishingStatus || "unfurnished",
      parking_spots: body.parkingSpots ? Math.max(0, parseInt(String(body.parkingSpots), 10)) : 0,
      has_elevator: Boolean(body.hasElevator),
      year_built: body.yearBuilt ? parseInt(String(body.yearBuilt), 10) : new Date().getFullYear(),
      city_id: cityIdUuid,
      district_id: districtIdUuid,
      address_details: body.addressDetails?.trim() || null,
      exact_lat: lat,
      exact_lng: lng,
      latitude: lat,
      longitude: lng,
      location_privacy: body.locationPrivacy || "exact",
      approximate_lat: approximateLat,
      approximate_lng: approximateLng,
      status: initialStatus,
      featured: false,
      advertiser_id: validAdvertiserId,
      user_id: validAdvertiserId,
      owner_id: validAdvertiserId,
      advertiser_type: user.role === "broker" ? "broker" : "owner",
    };

    let { data: cloudProperty, error: cloudError } = await supabase
      .from("properties")
      .insert(supabasePayload)
      .select()
      .single();

    // Fallback to supabaseAdmin if anonymous/internal user hits RLS permission restriction
    if (cloudError && (cloudError.code === "42501" || cloudError.message?.includes("row-level security") || !cloudProperty)) {
      const adminRes = await supabaseAdmin
        .from("properties")
        .insert(supabasePayload)
        .select()
        .single();
      if (adminRes.data) {
        cloudProperty = adminRes.data;
        cloudError = adminRes.error;
      }
    }

    let createdPropertyId = cloudProperty?.id;

    // 2. Insert image metadata to Supabase property_images table if cloud succeeded
    if (cloudProperty?.id && propertyImages.length > 0) {
      const imageRows = propertyImages.map((imgUrl: string, idx: number) => ({
        property_id: cloudProperty.id,
        url: imgUrl,
        alt: body.title.trim(),
        is_main: idx === 0,
        sort_order: idx,
      }));
      const imgRes = await supabase.from("property_images").insert(imageRows);
      if (imgRes.error) {
        await supabaseAdmin.from("property_images").insert(imageRows);
      }
    }

    if (cloudError || !cloudProperty) {
      console.error("[properties/create] Supabase insert failed:", cloudError);
      return NextResponse.json(
        { error: cloudError?.message || "فشل تسجيل العقار في قاعدة البيانات السحابية" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      property: {
        id: cloudProperty.id,
        slug: cloudProperty.slug,
        title: cloudProperty.title,
        description: cloudProperty.description,
        price: Number(cloudProperty.price),
        currency: cloudProperty.currency || "EGP",
        transactionType: cloudProperty.transaction_type,
        category: cloudProperty.category,
        areaSqM: Number(cloudProperty.area_sqm),
        status: cloudProperty.status,
        latitude: lat,
        longitude: lng,
        lat: lat,
        lng: lng,
        addressDetails: cloudProperty.address_details || "",
        advertiserId: cloudProperty.advertiser_id || user.id,
        userId: cloudProperty.user_id || user.id,
        isProject: Boolean(cloudProperty.is_project),
        images: propertyImages,
        createdAt: cloudProperty.created_at,
        updatedAt: cloudProperty.updated_at,
      },
      source: "supabase",
      notice: "تم إرسال العقار بنجاح إلى الإدارة للمراجعة والموافقة عليه (منشور مقيد).",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء إضافة العقار";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
