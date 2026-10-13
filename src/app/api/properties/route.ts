import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
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
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول لإضافة عقار" }, { status: 401 });
    }
    if (user.role !== "owner" && user.role !== "broker" && user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح لك بنشر عقارات، يتطلب حساب مالك أو وسيط معتمد" }, { status: 403 });
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

    // Broker verification check: unverified brokers cannot add any property
    if (user.role === "broker" && !user.isVerified) {
      return NextResponse.json(
        { error: "يتطلب إضافة العقارات والمشاريع توثيق حساب الوسيط العقاري واعتماده من قبل الإدارة أولاً." },
        { status: 403 }
      );
    }

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

    // If no Supabase verified UUID could be determined, return informative error
    if (!advertiserUuid) {
      return NextResponse.json(
        {
          error: "يتطلب حفظ العقار في قاعدة البيانات السحابية جلسة Supabase سحابية موثقة. يرجى تسجيل الدخول بحسابك السحابي.",
        },
        { status: 401 }
      );
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
      location_privacy: body.locationPrivacy || "exact",
      approximate_lat: approximateLat,
      approximate_lng: approximateLng,
      status: initialStatus,
      featured: false,
      advertiser_id: advertiserUuid,
      advertiser_type: user.role === "broker" ? "broker" : "owner",
    };

    const { data: cloudProperty, error: cloudError } = await supabase
      .from("properties")
      .insert(supabasePayload)
      .select()
      .single();

    if (cloudError) {
      console.error("Supabase property insert failed:", cloudError);

      // In development environments only, allow fallback if RLS policy violation occurs (e.g. before unapplied migration)
      if (process.env.NODE_ENV !== "production" && (cloudError.message?.includes("row-level security") || cloudError.code === "42501")) {
        const localProperty = dbStore.createProperty({
          advertiserId: user.id,
          advertiserType: user.role === "broker" ? "broker" : "owner",
          title: body.title.trim(),
          description: body.description.trim(),
          transactionType: body.transactionType,
          category: body.category,
          price: Number(body.price),
          areaSqM,
          bedrooms: body.bedrooms ? Number(body.bedrooms) : undefined,
          bathrooms: body.bathrooms ? Number(body.bathrooms) : undefined,
          floor: body.floor ? Number(body.floor) : undefined,
          totalFloors: body.totalFloors ? Number(body.totalFloors) : undefined,
          finishingStatus: body.finishingStatus,
          furnishingStatus: body.furnishingStatus,
          parkingSpots: Number(body.parkingSpots || 0),
          hasElevator: Boolean(body.hasElevator),
          amenities: Array.isArray(body.amenities) ? body.amenities : [],
          cityId: body.cityId || "city-dakahlia",
          districtId: body.districtId || "dist-meet-ghamr-city",
          addressDetails: body.addressDetails?.trim() || "",
          lat,
          lng,
          currency: "EGP",
          negotiable: Boolean(body.negotiable),
          locationPrivacy: body.locationPrivacy || "exact",
          images: propertyImages,
          status: initialStatus,
          featured: false,
        });

        dbStore.recordAuditEvent(user.id, "PROPERTY_CREATE_LOCAL", "property", localProperty.id, {
          title: localProperty.title,
          price: localProperty.price,
          status: localProperty.status,
          advertiserId: user.id,
        });

        return NextResponse.json({
          success: true,
          property: localProperty,
          source: "local_store",
          notice: "تم حفظ العقار بنجاح في قاعدة البيانات.",
        });
      }

      return NextResponse.json(
        {
          error: `فشل حفظ العقار في قاعدة البيانات السحابية (Supabase): ${cloudError.message}`,
          details: cloudError,
        },
        { status: 500 }
      );
    }

    // 2. Insert image metadata to Supabase property_images table
    if (cloudProperty?.id && propertyImages.length > 0) {
      const imageRows = propertyImages.map((imgUrl: string, idx: number) => ({
        property_id: cloudProperty.id,
        url: imgUrl,
        alt: body.title.trim(),
        is_main: idx === 0,
        sort_order: idx,
      }));
      await supabase.from("property_images").insert(imageRows);
    }

    // 3. Record security audit event
    dbStore.recordAuditEvent(user.id, "PROPERTY_CREATE_CLOUD", "property", cloudProperty.id, {
      title: cloudProperty.title,
      price: cloudProperty.price,
      status: cloudProperty.status,
      advertiserId: advertiserUuid,
    });

    return NextResponse.json({
      success: true,
      property: {
        ...cloudProperty,
        images: propertyImages,
      },
      source: "supabase",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء إضافة العقار";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
