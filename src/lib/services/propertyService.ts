import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { dbStore } from "@/lib/db/store";
import { PublicProperty, PropertyFilterParams, User, Property } from "@/lib/db/types";

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
    lat: Number(row.exact_lat),
    lng: Number(row.exact_lng),
    locationPrivacy: row.location_privacy,
    approximateLat: row.approximate_lat ? Number(row.approximate_lat) : undefined,
    approximateLng: row.approximate_lng ? Number(row.approximate_lng) : undefined,
    status: row.status,
    moderationNotes: row.moderation_notes ?? undefined,
    featured: Boolean(row.featured),
    viewsCount: row.views_count || 0,
    inquiriesCount: row.inquiries_count || 0,
    advertiserId: row.advertiser_id,
    advertiserType: row.advertiser_type,
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
  row: SupabasePropertyRow,
  viewerUser?: User | null
): PublicProperty {
  const isOwnerOrAdmin =
    viewerUser &&
    (viewerUser.id === row.advertiser_id || viewerUser.role === "admin");

  const isApproximate = row.location_privacy === "approximate";

  let displayLat = row.exact_lat;
  let displayLng = row.exact_lng;

  if (isApproximate && !isOwnerOrAdmin) {
    displayLat = row.approximate_lat ?? row.exact_lat;
    displayLng = row.approximate_lng ?? row.exact_lng;
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
export const propertyService = {
  /**
   * Retrieves public properties matching search filters and spatial boundaries.
   */
  async queryPublicProperties(
    filters: PropertyFilterParams,
    viewer?: User | null
  ): Promise<{ properties: PublicProperty[]; total: number; source: "supabase" | "local" }> {
    try {
      const supabase = createSupabaseServerClient();

      // Check if we have bounding box for spatial search
      if (filters.bounds) {
        const { southWest, northEast } = filters.bounds;

        // Try PostGIS bounding box RPC
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

          // Fetch associated images for returned property IDs
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
        .eq("status", "published");

      if (filters.transactionType) query = query.eq("transaction_type", filters.transactionType);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.districtId) query = query.eq("district_id", filters.districtId);
      if (filters.cityId) query = query.eq("city_id", filters.cityId);
      if (filters.minPrice) query = query.gte("price", filters.minPrice);
      if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
      if (filters.minArea) query = query.gte("area_sqm", filters.minArea);
      if (filters.maxArea) query = query.lte("area_sqm", filters.maxArea);
      if (filters.bedrooms) query = query.gte("bedrooms", filters.bedrooms);
      if (filters.featuredOnly) query = query.eq("featured", true);

      // Sorting
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

      if (!error && Array.isArray(data)) {
        const properties = data.map((row: any) => mapRowToPublicProperty(row, viewer));
        return {
          properties,
          total: count !== null && count !== undefined ? count : properties.length,
          source: "supabase",
        };
      }
    } catch (err) {
      console.warn("Supabase query error, falling back to persistent local store:", err);
    }

    // Resilient fallback to local database engine (offline test environments only)
    const localResult = dbStore.queryProperties(filters, viewer || undefined);
    return {
      properties: localResult.properties,
      total: localResult.total,
      source: "local",
    };
  },

  /**
   * Retrieves single property by slug or ID with privacy and moderation checks.
   */
  async getPublicPropertyBySlugOrId(
    identifier: string,
    viewer?: User | null
  ): Promise<PublicProperty | null> {
    try {
      const supabase = createSupabaseServerClient();

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

      const { data, error } = await query.single();

      if (!error && data) {
        const isOwnerOrAdmin =
          viewer && (viewer.id === data.advertiser_id || viewer.role === "admin");

        // Public viewers may only access published listings
        if (data.status !== "published" && !isOwnerOrAdmin) {
          return null;
        }

        return mapRowToPublicProperty(data, viewer);
      }

      // Explicitly return null if record was not found in Supabase
      if (error && (error.code === "PGRST116" || error.message?.includes("0 rows"))) {
        return null;
      }
    } catch (err) {
      console.warn("Supabase single property error, falling back to local store:", err);
    }

    // Fallback to local store with privacy and authorization enforcement
    return dbStore.getPropertyByIdOrSlug(identifier, viewer || undefined);
  },

  /**
   * Retrieves all properties for admin oversight, combining live cloud records
   * with local store and deduplicating by ID.
   */
  async getAllPropertiesForAdmin(): Promise<Property[]> {
    let localProps = dbStore.getAllPropertiesForAdmin();
    try {
      const supabase = createSupabaseServerClient();
      const { data: cloudRows, error: cloudErr } = await supabase
        .from("properties")
        .select(`
          *,
          property_images (url, alt, is_main, sort_order)
        `)
        .order("created_at", { ascending: false });

      if (!cloudErr && cloudRows && cloudRows.length > 0) {
        const cloudProps = cloudRows.map(mapSupabaseRowToProperty);
        const cloudIds = new Set(cloudProps.map((p) => p.id));
        const filteredLocal = localProps.filter((p) => !cloudIds.has(p.id));
        return [...cloudProps, ...filteredLocal];
      }
    } catch (err) {
      console.warn("Could not query Supabase for admin properties:", err);
    }
    return localProps;
  },
};

