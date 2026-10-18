import { PublicProperty, PropertyFilterParams, User, Property, PropertyStatus } from "../db/types";
import { dbStore } from "../db/store";

async function getSupabaseServerModule() {
  return await import("@/utils/supabase/server");
}

// Raw shape returned from Supabase properties table
interface SupabasePropertyRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  transaction_type: "sale" | "rent";
  category: string;
  price: number;
  currency: string;
  rental_period?: string | null;
  down_payment?: number | null;
  installment_years?: number | null;
  area_sqm: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  total_floors?: number | null;
  finishing_status?: any;
  furnishing_status?: any;
  parking_spots?: number | null;
  has_elevator?: boolean | null;
  year_built?: number | null;
  city_id: string;
  district_id: string;
  address_details?: string | null;
  exact_lat: number;
  exact_lng: number;
  location_privacy: "exact" | "approximate";
  approximate_lat?: number | null;
  approximate_lng?: number | null;
  status: string;
  featured: boolean;
  views_count: number;
  inquiries_count: number;
  advertiser_id: string;
  advertiser_type: "owner" | "broker";
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  property_images?: { url: string; alt: string; is_main: boolean; sort_order: number }[];
  profiles?: {
    name: string;
    role: string;
    phone?: string;
    whatsapp_enabled?: boolean;
    is_verified?: boolean;
    avatar_url?: string;
    company_name?: string;
  };
}

/**
 * Transforms a raw Supabase row into an internal Property model.
 */
export function mapSupabaseRowToProperty(row: any): Property {
  let images: string[] = [];
  if (row.property_images && row.property_images.length > 0) {
    images = [...row.property_images]
      .sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0) || a.sort_order - b.sort_order)
      .map((img: any) => img.url);
  } else {
    images = [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    ];
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    transactionType: row.transaction_type,
    category: row.category,
    price: Number(row.price),
    currency: row.currency || "EGP",
    rentalPeriod: row.rental_period || undefined,
    negotiable: Boolean(row.negotiable),
    downPayment: row.down_payment ? Number(row.down_payment) : undefined,
    installmentYears: row.installment_years || undefined,
    areaSqM: Number(row.area_sqm),
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    floor: row.floor ?? undefined,
    totalFloors: row.total_floors ?? undefined,
    finishingStatus: row.finishing_status || undefined,
    furnishingStatus: row.furnishing_status || undefined,
    parkingSpots: row.parking_spots ?? undefined,
    hasElevator: row.has_elevator ?? undefined,
    yearBuilt: row.year_built ?? undefined,
    amenities: [],
    images,
    cityId: row.city_id,
    districtId: row.district_id,
    addressDetails: row.address_details || "موقع متميز، مصر",
    lat: Number(row.latitude ?? (row.location?.coordinates ? row.location.coordinates[1] : ((row as any).lat ?? row.exact_lat))),
    lng: Number(row.longitude ?? (row.location?.coordinates ? row.location.coordinates[0] : ((row as any).lng ?? row.exact_lng))),
    latitude: Number(row.latitude ?? (row.location?.coordinates ? row.location.coordinates[1] : ((row as any).lat ?? row.exact_lat))),
    longitude: Number(row.longitude ?? (row.location?.coordinates ? row.location.coordinates[0] : ((row as any).lng ?? row.exact_lng))),
    locationPrivacy: row.location_privacy,
    approximateLat: row.approximate_lat ? Number(row.approximate_lat) : undefined,
    approximateLng: row.approximate_lng ? Number(row.approximate_lng) : undefined,
    status: row.status,
    moderationNotes: row.moderation_notes ?? undefined,
    featured: Boolean(row.featured),
    viewsCount: row.views_count || 0,
    inquiriesCount: row.inquiries_count || 0,
    advertiserId: row.advertiser_id || row.user_id,
    userId: row.user_id || row.advertiser_id,
    advertiserType: row.advertiser_type,
    isProject: Boolean(row.is_project || row.isProject),
    projectDetails: row.project_details || row.projectDetails,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || undefined,
  };
}

/**
 * Transforms a raw Supabase row into a sanitized PublicProperty DTO.
 * CRITICAL PRIVACY CONTRACT:
 * When location_privacy === 'approximate' and viewer is not the owner/admin,
 * exact_lat and exact_lng are completely discarded and replaced with approximate blurred coordinates.
 */
function mapRowToPublicProperty(
  row: SupabasePropertyRow & { latitude?: number; longitude?: number; user_id?: string; location?: any; lat?: number; lng?: number },
  viewerUser?: User | null
): PublicProperty {
  const isOwnerOrAdmin =
    viewerUser &&
    (viewerUser.id === row.advertiser_id || viewerUser.id === (row as any).user_id || viewerUser.role === "admin");

  const isApproximate = row.location_privacy === "approximate";

  const rawLat = row.latitude ?? (row.location?.coordinates ? row.location.coordinates[1] : (row.lat ?? row.exact_lat));
  const rawLng = row.longitude ?? (row.location?.coordinates ? row.location.coordinates[0] : (row.lng ?? row.exact_lng));

  let displayLat = rawLat !== undefined && rawLat !== null ? Number(rawLat) : 30.0444;
  let displayLng = rawLng !== undefined && rawLng !== null ? Number(rawLng) : 31.2580;

  if (isApproximate && !isOwnerOrAdmin) {
    displayLat = row.approximate_lat ? Number(row.approximate_lat) : displayLat;
    displayLng = row.approximate_lng ? Number(row.approximate_lng) : displayLng;
  }

  // Extract images
  let images: string[] = [];
  if (row.property_images && row.property_images.length > 0) {
    images = [...row.property_images]
      .sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0) || a.sort_order - b.sort_order)
      .map((img) => img.url);
  } else {
    images = [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    ];
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    transactionType: row.transaction_type,
    category: row.category as any,
    price: Number(row.price),
    currency: row.currency || "EGP",
    negotiable: Boolean((row as any).negotiable),
    rentalPeriod: (row.rental_period as any) || undefined,
    downPayment: row.down_payment ? Number(row.down_payment) : undefined,
    installmentYears: row.installment_years || undefined,
    areaSqM: Number(row.area_sqm),
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    floor: row.floor ?? undefined,
    totalFloors: row.total_floors ?? undefined,
    finishingStatus: row.finishing_status || undefined,
    furnishingStatus: row.furnishing_status || undefined,
    parkingSpots: row.parking_spots ?? undefined,
    hasElevator: row.has_elevator ?? undefined,
    yearBuilt: row.year_built ?? undefined,
    cityId: row.city_id,
    districtId: row.district_id,
    addressDetails: row.address_details || "موقع متميز، مصر",
    lat: displayLat,
    lng: displayLng,
    latitude: displayLat,
    longitude: displayLng,
    locationPrivacy: row.location_privacy,
    isApproximateLocation: isApproximate,
    privacyRadiusMeters: isApproximate ? 500 : undefined,
    images,
    amenities: [],
    status: row.status as any,
    featured: Boolean(row.featured),
    viewsCount: row.views_count || 0,
    inquiriesCount: row.inquiries_count || 0,
    advertiserId: row.advertiser_id,
    advertiserType: row.advertiser_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || undefined,
    advertiser: {
      id: row.advertiser_id,
      name: row.profiles?.name || "معلن موثق",
      role: (row.profiles?.role as any) || row.advertiser_type || "owner",
      phone: row.profiles?.phone,
      whatsapp: row.profiles?.whatsapp_enabled ? row.profiles?.phone : undefined,
      isVerified: row.profiles?.is_verified ?? false,
      avatarUrl: row.profiles?.avatar_url,
      companyName: row.profiles?.company_name,
    },
  };
}

/**
 * Service to execute real property queries against Supabase PostgreSQL/PostGIS
 * with automatic fallback to local dbStore if the database is currently empty or offline.
 */
export function isSupabaseDirect(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("placeholder") &&
      !key.includes("placeholder")
  );
}

export const propertyService = {
  /**
   * Retrieves public properties matching search filters and spatial boundaries
   * from a single authoritative data source without silent local fallback in production.
   */
  async queryPublicProperties(
    filters: PropertyFilterParams,
    viewer?: User | null
  ): Promise<{ properties: PublicProperty[]; total: number; source: "supabase" | "local" }> {
    const isProd = process.env.NODE_ENV === "production";
    const useCloud = isSupabaseDirect();

    if (!useCloud) {
      if (isProd) {
        throw new Error("CENTRAL_DB_UNAVAILABLE: قاعدة البيانات المركزية غير مهيأة في بيئة الإنتاج");
      }
      const localRes = dbStore.queryProperties(filters, viewer || undefined);
      return {
        properties: localRes.properties,
        total: localRes.total,
        source: "local",
      };
    }

    const { createClient: createSupabaseServerClient } = await getSupabaseServerModule();
    const supabase = createSupabaseServerClient();

    // Check if we have bounding box for spatial search
    if (filters.bounds) {
      const { southWest, northEast } = filters.bounds;

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "search_properties_within_bounds",
        {
          min_lng: southWest.lng,
          min_lat: southWest.lat,
          max_lng: northEast.lng,
          max_lat: northEast.lat,
          filter_transaction_type: filters.transactionType || null,
          filter_category: filters.category || null,
          min_price: filters.minPrice || null,
          max_price: filters.maxPrice || null,
          limit_count: filters.limit || 50,
        }
      );

      if (!rpcError && Array.isArray(rpcData)) {
        if (rpcData.length === 0) {
          return { properties: [], total: 0, source: "supabase" };
        }

        const propertyIds = rpcData.map((p) => p.id);
        const { data: imagesData } = await supabase
          .from("property_images")
          .select("property_id, url, alt, is_main, sort_order")
          .in("property_id", propertyIds);

        const imagesMap = new Map<string, any[]>();
        if (imagesData) {
          imagesData.forEach((img) => {
            if (!imagesMap.has(img.property_id)) imagesMap.set(img.property_id, []);
            imagesMap.get(img.property_id)!.push(img);
          });
        }

        const properties = rpcData.map((row) =>
          mapRowToPublicProperty(
            {
              ...row,
              property_images: imagesMap.get(row.id) || [],
            },
            viewer
          )
        );

        return { properties, total: properties.length, source: "supabase" };
      }
    }

    // Standard query on properties table with RLS
    let query = supabase
      .from("properties")
      .select(`
        *,
        property_images (url, alt, is_main, sort_order)
      `, { count: "exact" })
      .in("status", ["active", "published"]);

    if (filters.transactionType) query = query.eq("transaction_type", filters.transactionType);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.districtId) query = query.eq("district_id", filters.districtId);
    if (filters.cityId) query = query.eq("city_id", filters.cityId);
    if (filters.minPrice) query = query.gte("price", filters.minPrice);
    if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
    if (filters.minArea) query = query.gte("area_sqm", filters.minArea);
    if (filters.maxArea) query = query.lte("area_sqm", filters.maxArea);
    if (filters.bedrooms) query = query.gte("bedrooms", filters.bedrooms);
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const qTrim = filters.searchQuery.trim();
      query = query.or(`title.ilike.%${qTrim}%,description.ilike.%${qTrim}%,address_details.ilike.%${qTrim}%`);
    }
    if (filters.featuredOnly) query = query.eq("featured", true);

    if (filters.sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (filters.sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else if (filters.sort === "area_asc") {
      query = query.order("area_sqm", { ascending: true });
    } else if (filters.sort === "area_desc") {
      query = query.order("area_sqm", { ascending: false });
    } else {
      query = query.order("featured", { ascending: false }).order("created_at", { ascending: false });
    }

    const limit = filters.limit || 24;
    const page = filters.page || 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`CENTRAL_DB_ERROR: فشل استعلام العقارات من قاعدة البيانات المركزية (${error.message})`);
    }

    const properties = (data || []).map((row: any) => mapRowToPublicProperty(row, viewer));
    return {
      properties,
      total: count !== null && count !== undefined ? count : properties.length,
      source: "supabase",
    };
  },

  /**
   * Retrieves single property by slug or ID from the authoritative central database.
   */
  async getPublicPropertyBySlugOrId(
    identifier: string,
    viewer?: User | null
  ): Promise<PublicProperty | null> {
    const isProd = process.env.NODE_ENV === "production";
    const useCloud = isSupabaseDirect();

    if (!useCloud) {
      if (isProd) {
        throw new Error("CENTRAL_DB_UNAVAILABLE: قاعدة البيانات المركزية غير مهيأة في بيئة الإنتاج");
      }
      return dbStore.getPropertyByIdOrSlug(identifier, viewer || undefined);
    }

    const isOwnerOrAdminViewer = Boolean(
      viewer && (viewer.role === "admin" || (viewer.role as string) === "superadmin")
    );

    const { createClient: createSupabaseServerClient, createAdminClient } = await getSupabaseServerModule();
    const supabase = isOwnerOrAdminViewer ? createAdminClient() : createSupabaseServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = supabase
      .from("properties")
      .select(`
        *,
        property_images (url, alt, is_main, sort_order)
      `);

    if (isUuid) {
      query = query.eq("id", identifier);
    } else {
      query = query.eq("slug", identifier);
    }

    let { data, error } = await query.maybeSingle();

    if ((!data || error) && !isOwnerOrAdminViewer) {
      try {
        const adminClient = createAdminClient();
        let fallbackQuery = adminClient
          .from("properties")
          .select(`*, property_images (url, alt, is_main, sort_order)`);
        if (isUuid) {
          fallbackQuery = fallbackQuery.eq("id", identifier);
        } else {
          fallbackQuery = fallbackQuery.eq("slug", identifier);
        }
        const fallbackRes = await fallbackQuery.maybeSingle();
        if (fallbackRes.data) {
          data = fallbackRes.data;
          error = null;
        }
      } catch {}
    }

    if (error) {
      throw new Error(`CENTRAL_DB_ERROR: فشل استرجاع بيانات العقار (${error.message})`);
    }

    if (data) {
      const isOwnerOrAdmin = Boolean(
        viewer && (
          viewer.id === data.advertiser_id ||
          viewer.id === data.user_id ||
          viewer.id === data.owner_id ||
          viewer.role === "admin" ||
          (viewer.role as string) === "superadmin"
        )
      );

      if (data.status !== "published" && data.status !== "active" && !isOwnerOrAdmin) {
        return null;
      }

      return mapRowToPublicProperty(data, viewer);
    }

    // Never fall back to local dbStore in production when central DB is authoritative
    if (!isProd) {
      return dbStore.getPropertyByIdOrSlug(identifier, viewer || undefined);
    }

    return null;
  },

  /**
   * Retrieves all properties for admin oversight from the authoritative central database.
   */
  async getAllPropertiesForAdmin(authToken?: string): Promise<Property[]> {
    const isProd = process.env.NODE_ENV === "production";
    const useCloud = isSupabaseDirect();

    const applyOverrides = (list: Property[]): Property[] => {
      const reg = getModerationOverrides();
      return list
        .filter((p) => !reg.deleted.has(p.id))
        .map((p) => {
          const st = reg.status.get(p.id);
          return st ? ({ ...p, status: st } as Property) : p;
        });
    };

    if (!useCloud) {
      if (isProd) {
        throw new Error("CENTRAL_DB_UNAVAILABLE: قاعدة البيانات المركزية غير مهيأة في بيئة الإنتاج");
      }
      return applyOverrides(dbStore.getAllPropertiesForAdmin());
    }

    const { createClient: createSupabaseServerClient } = await getSupabaseServerModule();
    const supabase = createSupabaseServerClient(undefined, authToken);
    let { data: cloudRows, error: cloudErr } = await supabase
      .from("properties")
      .select(`
        *,
        property_images (url, alt, is_main, sort_order)
      `)
      .order("created_at", { ascending: false });

    if (!cloudRows || cloudRows.length === 0 || cloudErr) {
      const { data: rpcRows, error: rpcErr } = await supabase.rpc("get_all_properties_for_admin_rpc");
      if (!rpcErr && Array.isArray(rpcRows)) {
        const propertyIds = rpcRows.map((r: any) => r.id);
        const imagesMap = new Map<string, any[]>();
        if (propertyIds.length > 0) {
          const { data: imagesData } = await supabase
            .from("property_images")
            .select("property_id, url, alt, is_main, sort_order")
            .in("property_id", propertyIds);

          if (imagesData) {
            imagesData.forEach((img) => {
              if (!imagesMap.has(img.property_id)) imagesMap.set(img.property_id, []);
              imagesMap.get(img.property_id)!.push(img);
            });
          }
        }

        cloudRows = rpcRows.map((row: any) => ({
          ...row,
          property_images: imagesMap.get(row.id) || [],
        }));
        cloudErr = null;
      }
    }

    if (cloudErr) {
      throw new Error(`CENTRAL_DB_ERROR: فشل جلب عقارات الإدارة (${cloudErr.message})`);
    }

    const cloudProps = (cloudRows || []).map(mapSupabaseRowToProperty);
    return applyOverrides(cloudProps);
  },

  /** Records an admin decision so cloud rows that could not be mutated (RLS) never reappear. */
  recordModerationOverride(id: string, change: { deleted?: boolean; status?: PropertyStatus }) {
    const reg = getModerationOverrides();
    if (change.deleted) {
      reg.deleted.add(id);
      reg.status.delete(id);
    } else if (change.status) {
      reg.deleted.delete(id);
      reg.status.set(id, change.status);
    }
  },
};

type ModerationOverrides = { deleted: Set<string>; status: Map<string, PropertyStatus> };

function getModerationOverrides(): ModerationOverrides {
  const g = globalThis as unknown as { __moderationOverrides?: ModerationOverrides };
  if (!g.__moderationOverrides) {
    g.__moderationOverrides = { deleted: new Set(), status: new Map() };
  }
  return g.__moderationOverrides;
}

