import fs from "fs";
import path from "path";
import {
  Property,
  PublicProperty,
  User,
  City,
  District,
  PropertyFilterParams,
  Inquiry,
  Favorite,
  SavedSearch,
  ModerationLog,
  AuditEvent,
  DuplicateCheckResult,
  SmartMatchResult,
  GeoPoint,
  PropertyStatus,
  PropertyReport,
  ReportStatus,
  ReportReasonCategory,
  UserRole,
  CmsHomepageSettings,
  CmsStaticPage,
  CmsMediaAsset,
  CmsRevision,
} from "./types";
import { normalizeEgyptianPhone } from "../auth/security";
import { initialUsers, initialCities, initialDistricts, initialProperties } from "./seed-data";

export interface DatabaseState {
  users: User[];
  cities: City[];
  districts: District[];
  properties: Property[];
  inquiries: Inquiry[];
  favorites: Favorite[];
  savedSearches: SavedSearch[];
  moderationLogs: ModerationLog[];
  auditEvents: AuditEvent[];
  reports: PropertyReport[];
  cmsHomepage?: CmsHomepageSettings;
  cmsPages?: CmsStaticPage[];
  cmsMedia?: CmsMediaAsset[];
  cmsRevisions?: CmsRevision[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "aqarpulse_db.json");

// ==============================================================================
// Geospatial Math Utilities (PostGIS equivalents in pure TypeScript)
// ==============================================================================

/**
 * Calculates Haversine distance in meters between two coordinates.
 */
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates if a coordinate point falls inside a bounding box [southWest, northEast].
 */
export function isPointInBoundingBox(point: GeoPoint, southWest: GeoPoint, northEast: GeoPoint): boolean {
  const latOk = point.lat >= Math.min(southWest.lat, northEast.lat) && point.lat <= Math.max(southWest.lat, northEast.lat);
  let lngOk = false;
  if (southWest.lng <= northEast.lng) {
    lngOk = point.lng >= southWest.lng && point.lng <= northEast.lng;
  } else {
    // Crosses antimeridian
    lngOk = point.lng >= southWest.lng || point.lng <= northEast.lng;
  }
  return latOk && lngOk;
}

/**
 * Ray-casting algorithm to test whether a coordinate point is inside a polygon.
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Generates a deterministic approximate coordinate (approx. 350m - 500m offset)
 * for advertisers who select locationPrivacy = 'approximate'.
 */
export function calculateApproximateCoordinates(exactLat: number, exactLng: number, propertyId: string): GeoPoint {
  // Deterministic hash based on ID so the map marker doesn't jump randomly on every request
  let hash = 0;
  for (let i = 0; i < propertyId.length; i++) {
    hash = (hash << 5) - hash + propertyId.charCodeAt(i);
    hash |= 0;
  }
  
  // Offset angle between 20 and 70 degrees in each quadrant to guarantee significant shift on BOTH axes
  const quadrant = Math.abs(hash) % 4;
  const baseAngleDeg = 20 + (Math.abs(hash >> 2) % 50); // 20 to 69 degrees
  const finalDeg = quadrant * 90 + baseAngleDeg;
  const angle = finalDeg * (Math.PI / 180);

  const distanceMeters = 350 + (Math.abs(hash >> 3) % 200); // 350m to 550m

  const deltaLat = (distanceMeters * Math.cos(angle)) / 111111;
  const deltaLng = (distanceMeters * Math.sin(angle)) / (111111 * Math.cos((exactLat * Math.PI) / 180));

  let approxLat = Number((exactLat + deltaLat).toFixed(6));
  let approxLng = Number((exactLng + deltaLng).toFixed(6));

  if (approxLat === exactLat) approxLat = Number((exactLat + 0.0025).toFixed(6));
  if (approxLng === exactLng) approxLng = Number((exactLng + 0.0025).toFixed(6));

  return {
    lat: approxLat,
    lng: approxLng,
  };
}

// ==============================================================================
// Database Store Singleton with Thread-Safe File Persistence
// ==============================================================================

class DataStore {
  private state: DatabaseState | null = null;

  private init(): DatabaseState {
    if (this.state) return this.state;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.state = JSON.parse(raw);
        if (this.state) {
          if (!this.state.reports) this.state.reports = [];
          if (!this.state.auditEvents) this.state.auditEvents = [];
          if (!this.state.moderationLogs) this.state.moderationLogs = [];
          return this.state;
        }
      } catch (err) {
        console.warn("Failed to load existing db file, initializing seed data:", err);
      }
    }

    // Default Seed state
    this.state = {
      users: [...initialUsers],
      cities: [...initialCities],
      districts: [...initialDistricts],
      properties: [...initialProperties],
      inquiries: [],
      favorites: [],
      savedSearches: [],
      moderationLogs: [],
      auditEvents: [],
      reports: [],
    };

    this.save();
    return this.state;
  }

  private save(): void {
    if (!this.state) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (err) {
      console.error("Error saving database file:", err);
    }
  }

  // ============================================================================
  // Properties & Geospatial Search
  // ============================================================================

  public queryProperties(filters: PropertyFilterParams, viewerUser?: User): {
    properties: PublicProperty[];
    total: number;
    page: number;
    totalPages: number;
  } {
    const db = this.init();
    const isAdmin = viewerUser?.role === "admin";

    // 1. Status Filter: Public queries can ONLY see 'published'
    let list = db.properties.filter((p) => {
      if (isAdmin) return true;
      return p.status === "published";
    });

    // 2. Transaction Type
    if (filters.transactionType) {
      list = list.filter((p) => p.transactionType === filters.transactionType);
    }

    // 3. Category
    if (filters.category) {
      list = list.filter((p) => p.category === filters.category);
    }

    // 4. City & District
    if (filters.cityId) {
      list = list.filter((p) => p.cityId === filters.cityId);
    }
    if (filters.districtId) {
      list = list.filter((p) => p.districtId === filters.districtId);
    }

    // 5. Price Range
    if (filters.minPrice !== undefined && filters.minPrice !== null) {
      list = list.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      list = list.filter((p) => p.price <= filters.maxPrice!);
    }

    // 6. Area Range
    if (filters.minArea !== undefined && filters.minArea !== null) {
      list = list.filter((p) => p.areaSqM >= filters.minArea!);
    }
    if (filters.maxArea !== undefined && filters.maxArea !== null) {
      list = list.filter((p) => p.areaSqM <= filters.maxArea!);
    }

    // 7. Bedrooms & Bathrooms
    if (filters.bedrooms !== undefined && filters.bedrooms !== null) {
      list = list.filter((p) => (p.bedrooms ?? 0) >= filters.bedrooms!);
    }
    if (filters.bathrooms !== undefined && filters.bathrooms !== null) {
      list = list.filter((p) => (p.bathrooms ?? 0) >= filters.bathrooms!);
    }

    // 8. Specifications
    if (filters.finishingStatus) {
      list = list.filter((p) => p.finishingStatus === filters.finishingStatus);
    }
    if (filters.furnishingStatus) {
      list = list.filter((p) => p.furnishingStatus === filters.furnishingStatus);
    }
    if (filters.advertiserType) {
      list = list.filter((p) => p.advertiserType === filters.advertiserType);
    }
    if (filters.featuredOnly) {
      list = list.filter((p) => p.featured === true);
    }

    // 9. Verified Advertiser Only
    if (filters.verifiedOnly) {
      const verifiedUserIds = new Set(db.users.filter((u) => u.isVerified).map((u) => u.id));
      list = list.filter((p) => verifiedUserIds.has(p.advertiserId));
    }

    // 10. Text Search
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchingDistricts = new Set(
        db.districts
          .filter(
            (d) =>
              d.nameAr.toLowerCase().includes(q) ||
              d.nameEn.toLowerCase().includes(q) ||
              q.includes(d.nameAr.toLowerCase()) ||
              q.includes(d.nameEn.toLowerCase())
          )
          .map((d) => d.id)
      );
      const matchingCities = new Set(
        db.cities
          .filter(
            (c) =>
              c.nameAr.toLowerCase().includes(q) ||
              c.nameEn.toLowerCase().includes(q) ||
              q.includes(c.nameAr.toLowerCase()) ||
              q.includes(c.nameEn.toLowerCase())
          )
          .map((c) => c.id)
      );

      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.addressDetails.toLowerCase().includes(q) ||
          matchingDistricts.has(p.districtId) ||
          matchingCities.has(p.cityId)
      );
    }

    // 11. Spatial Filtering (Server-Side)
    // A. Viewport Bounding Box
    if (filters.bounds) {
      const { southWest, northEast } = filters.bounds;
      list = list.filter((p) => {
        const point = p.locationPrivacy === "approximate" && p.approximateLat
          ? { lat: p.approximateLat, lng: p.approximateLng! }
          : { lat: p.lat, lng: p.lng };
        return isPointInBoundingBox(point, southWest, northEast);
      });
    }

    // B. Radius Search
    if (filters.radius) {
      const { center, radiusKm } = filters.radius;
      const radiusMeters = radiusKm * 1000;
      list = list.filter((p) => {
        const dist = haversineDistanceMeters(center.lat, center.lng, p.lat, p.lng);
        return dist <= radiusMeters;
      });
    }

    // C. Polygon Search
    if (filters.polygon && filters.polygon.length >= 3) {
      list = list.filter((p) => {
        return isPointInPolygon({ lat: p.lat, lng: p.lng }, filters.polygon!);
      });
    }

    // 12. Sorting
    switch (filters.sort) {
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "area_asc":
        list.sort((a, b) => a.areaSqM - b.areaSqM);
        break;
      case "area_desc":
        list.sort((a, b) => b.areaSqM - a.areaSqM);
        break;
      case "relevance":
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.viewsCount - a.viewsCount);
        break;
      case "newest":
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    const total = list.length;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 24;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    // Map to Public DTO with STRICT Privacy Enforcement
    const publicList = paginated.map((p) => this.toPublicProperty(p, db.users, viewerUser));

    return {
      properties: publicList,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public getPropertyByIdOrSlug(idOrSlug: string, viewerUser?: User): PublicProperty | null {
    const db = this.init();
    const prop = db.properties.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
    if (!prop) return null;

    // Authorization check for unpublished listings
    const isOwnerOrBroker = viewerUser && viewerUser.id === prop.advertiserId;
    const isAdmin = viewerUser && viewerUser.role === "admin";
    if (prop.status !== "published" && !isOwnerOrBroker && !isAdmin) {
      return null;
    }

    // Increment view count
    prop.viewsCount = (prop.viewsCount || 0) + 1;
    this.save();

    return this.toPublicProperty(prop, db.users, viewerUser);
  }

  public getRawPropertyById(id: string): Property | null {
    const db = this.init();
    return db.properties.find((p) => p.id === id) || null;
  }

  public getPropertiesByAdvertiser(advertiserId: string): Property[] {
    const db = this.init();
    return db.properties
      .filter((p) => p.advertiserId === advertiserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllPropertiesForAdmin(): Property[] {
    const db = this.init();
    return [...db.properties].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ============================================================================
  // Privacy Redaction Engine
  // ============================================================================

  /**
   * Transforms raw internal Property into PublicProperty.
   * CRITICAL SECURITY & PRIVACY RULE:
   * When locationPrivacy === 'approximate', exact lat/lng coordinates are
   * COMPLETELY STRIPPED and replaced by the approximate coordinates.
   */
  public toPublicProperty(property: Property, users: User[], viewerUser?: User): PublicProperty {
    const advertiser = users.find((u) => u.id === property.advertiserId);
    const isOwnerOrAdmin = viewerUser && (viewerUser.id === property.advertiserId || viewerUser.role === "admin");

    const isApproximate = property.locationPrivacy === "approximate";
    
    // Exact or approximate coordinates based on privacy setting & viewing role
    let displayLat = property.lat;
    let displayLng = property.lng;

    if (isApproximate && !isOwnerOrAdmin) {
      // Stripped and replaced with blurred coords
      displayLat = property.approximateLat ?? property.lat;
      displayLng = property.approximateLng ?? property.lng;
    }

    return {
      ...property,
      lat: displayLat,
      lng: displayLng,
      isApproximateLocation: isApproximate,
      privacyRadiusMeters: isApproximate ? 500 : undefined,
      advertiser: {
        id: advertiser?.id || property.advertiserId,
        name: advertiser?.name || "معلن موثق",
        role: advertiser?.role || "owner",
        phone: advertiser?.phone,
        whatsapp: advertiser?.whatsappEnabled ? advertiser.phone : undefined,
        isVerified: advertiser?.isVerified ?? false,
        avatarUrl: advertiser?.avatarUrl,
        companyName: advertiser?.companyName,
      },
    };
  }

  // ============================================================================
  // Property Mutations & Lifecycle
  // ============================================================================

  public createProperty(data: Omit<Property, "id" | "slug" | "createdAt" | "updatedAt" | "viewsCount" | "inquiriesCount">): Property {
    const db = this.init();
    const id = "prop-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);

    // Generate safe slug in Arabic-English format
    const cleanTitle = data.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${cleanTitle}-${id.slice(-6)}`;

    // Calculate approximate coordinates if privacy mode enabled
    let approxCoords: GeoPoint | undefined = undefined;
    if (data.locationPrivacy === "approximate") {
      approxCoords = calculateApproximateCoordinates(data.lat, data.lng, id);
    }

    const newProperty: Property = {
      ...data,
      id,
      slug,
      approximateLat: approxCoords?.lat,
      approximateLng: approxCoords?.lng,
      viewsCount: 0,
      inquiriesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: data.status === "published" ? new Date().toISOString() : undefined,
    };

    db.properties.unshift(newProperty);
    this.recordAuditEvent(data.advertiserId, "CREATE_PROPERTY", "property", id, { title: data.title });
    this.save();
    return newProperty;
  }

  public updateProperty(id: string, updates: Partial<Property>, actorUser: User): Property {
    const db = this.init();
    const index = db.properties.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("العقار غير موجود");

    const existing = db.properties[index];
    if (existing.advertiserId !== actorUser.id && actorUser.role !== "admin") {
      throw new Error("غير مصرح لك بتعديل هذا العقار");
    }

    let approxCoords = {
      approximateLat: existing.approximateLat,
      approximateLng: existing.approximateLng,
    };

    if (updates.locationPrivacy === "approximate" || (existing.locationPrivacy === "approximate" && (updates.lat || updates.lng))) {
      const lat = updates.lat ?? existing.lat;
      const lng = updates.lng ?? existing.lng;
      const approx = calculateApproximateCoordinates(lat, lng, id);
      approxCoords = {
        approximateLat: approx.lat,
        approximateLng: approx.lng,
      };
    }

    const updated: Property = {
      ...existing,
      ...updates,
      ...approxCoords,
      updatedAt: new Date().toISOString(),
    };

    db.properties[index] = updated;
    this.recordAuditEvent(actorUser.id, "UPDATE_PROPERTY", "property", id, { updates });
    this.save();
    return updated;
  }

  public updatePropertyStatus(id: string, newStatus: PropertyStatus, actorUser: User, reason?: string): Property {
    const db = this.init();
    const index = db.properties.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("العقار غير موجود");

    const existing = db.properties[index];
    const prevStatus = existing.status;

    // Prevent repeated state transitions
    if (existing.status === newStatus) {
      throw new Error("العقار في هذه الحالة بالفعل");
    }

    // Role check: Only admin can approve/publish/reject/suspend
    if (actorUser.role !== "admin") {
      if (existing.advertiserId !== actorUser.id) {
        throw new Error("غير مصرح لك بتغيير حالة هذا العقار");
      }
      if (newStatus === "published") {
        throw new Error("يتطلب نشر العقار موافقة الإدارة");
      }
      if (newStatus === "rejected") {
        throw new Error("صلاحية رفض الإعلان مقتصرة على مشرفي المنصة");
      }
      if (newStatus === "suspended") {
        throw new Error("صلاحية تعليق الإعلان مقتصرة على مشرفي المنصة");
      }
    } else {
      // Admin moderation validations
      if (newStatus === "rejected") {
        if (!reason || !reason.trim()) {
          throw new Error("سبب الرفض إلزامي");
        }
      }
    }

    existing.status = newStatus;
    existing.updatedAt = new Date().toISOString();
    if (newStatus === "published" && !existing.publishedAt) {
      existing.publishedAt = new Date().toISOString();
    }

    // Record moderation history
    if (!db.moderationLogs) db.moderationLogs = [];
    db.moderationLogs.unshift({
      id: "mod-" + Date.now(),
      propertyId: id,
      adminId: actorUser.id,
      adminName: actorUser.name,
      previousStatus: prevStatus,
      newStatus,
      reason: reason?.trim(),
      timestamp: new Date().toISOString(),
    });

    this.recordAuditEvent(actorUser.id, "CHANGE_STATUS", "property", id, { prevStatus, newStatus, reason: reason?.trim() });
    this.save();
    return existing;
  }

  public getPropertyModerationHistory(propertyId: string): ModerationLog[] {
    const db = this.init();
    return (db.moderationLogs || []).filter((m) => m.propertyId === propertyId);
  }

  public deleteProperty(id: string, actorUser: User): boolean {
    const db = this.init();
    const index = db.properties.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("العقار غير موجود");

    const existing = db.properties[index];
    if (existing.advertiserId !== actorUser.id && actorUser.role !== "admin") {
      throw new Error("غير مصرح لك بحذف هذا العقار");
    }

    db.properties.splice(index, 1);
    this.recordAuditEvent(actorUser.id, "DELETE_PROPERTY", "property", id, { title: existing.title });
    this.save();
    return true;
  }

  // ============================================================================
  // Duplicate Detection Foundation
  // ============================================================================

  public checkPotentialDuplicates(newProp: Partial<Property>): DuplicateCheckResult {
    const db = this.init();
    const candidateProps = db.properties.filter((p) => p.id !== newProp.id && p.status !== "archived");

    const matchedPropertyIds: string[] = [];
    const reasons: string[] = [];
    let maxConfidence = 0;

    for (const cand of candidateProps) {
      let score = 0;
      const reasonsForCand: string[] = [];

      // 1. Proximity check
      if (newProp.lat && newProp.lng) {
        const dist = haversineDistanceMeters(newProp.lat, newProp.lng, cand.lat, cand.lng);
        if (dist <= 150) {
          score += 35;
          reasonsForCand.push(`مسافة جغرافية قريبة جداً (${Math.round(dist)}م)`);
        } else if (dist <= 500) {
          score += 15;
          reasonsForCand.push(`في نفس المربع السكني (${Math.round(dist)}م)`);
        }
      }

      // 2. Price similarity (within 5%)
      if (newProp.price && cand.price) {
        const priceDiffRatio = Math.abs(newProp.price - cand.price) / cand.price;
        if (priceDiffRatio <= 0.05) {
          score += 25;
          reasonsForCand.push("سعر متطابق أو متقارب جداً");
        }
      }

      // 3. Specifications match (Area, bedrooms, bathrooms)
      if (newProp.areaSqM && cand.areaSqM) {
        const areaDiffRatio = Math.abs(newProp.areaSqM - cand.areaSqM) / cand.areaSqM;
        if (areaDiffRatio <= 0.05) {
          score += 15;
        }
      }
      if (newProp.bedrooms !== undefined && newProp.bedrooms === cand.bedrooms) {
        score += 15;
      }

      // 4. Category and transaction type match
      if (newProp.category === cand.category && newProp.transactionType === cand.transactionType) {
        score += 10;
      }

      if (score >= 60) {
        matchedPropertyIds.push(cand.id);
        reasons.push(`عقار مشابه #${cand.id}: ${reasonsForCand.join("، ")}`);
        if (score > maxConfidence) maxConfidence = score;
      }
    }

    return {
      hasPotentialDuplicate: matchedPropertyIds.length > 0,
      confidenceScore: Math.min(100, maxConfidence),
      matchedPropertyIds,
      reasons,
    };
  }

  // ============================================================================
  // Deterministic Smart Matching Engine
  // ============================================================================

  public findSmartMatchesForCriteria(criteria: {
    transactionType?: "sale" | "rent";
    preferredDistrictId?: string;
    maxBudget?: number;
    minArea?: number;
    requiredBedrooms?: number;
    category?: string;
  }): SmartMatchResult[] {
    const db = this.init();
    const publishedProps = db.properties.filter((p) => p.status === "published");
    const results: SmartMatchResult[] = [];

    for (const p of publishedProps) {
      // Hard constraint 1: Transaction type
      if (criteria.transactionType && p.transactionType !== criteria.transactionType) {
        continue;
      }
      // Hard constraint 2: Category if specified
      if (criteria.category && p.category !== criteria.category) {
        continue;
      }
      // Hard constraint 3: Budget upper boundary + 10% tolerance
      if (criteria.maxBudget && p.price > criteria.maxBudget * 1.1) {
        continue;
      }

      let score = 0;
      const matchedCriteria: string[] = [];

      // Budget score (Up to 35 pts)
      if (criteria.maxBudget) {
        if (p.price <= criteria.maxBudget) {
          score += 35;
          matchedCriteria.push("ضمن الميزانية المحددة تماماً");
        } else {
          score += 20;
          matchedCriteria.push("قريب جداً من الميزانية");
        }
      } else {
        score += 20;
      }

      // Location score (Up to 30 pts)
      if (criteria.preferredDistrictId && p.districtId === criteria.preferredDistrictId) {
        score += 30;
        const distName = db.districts.find((d) => d.id === p.districtId)?.nameAr || "الحي المفضل";
        matchedCriteria.push(`في المنطقة المفضلة: ${distName}`);
      }

      // Area score (Up to 20 pts)
      if (criteria.minArea) {
        if (p.areaSqM >= criteria.minArea) {
          score += 20;
          matchedCriteria.push(`المساحة تحقق أو تتجاوز المطلوب (${p.areaSqM} م²)`);
        }
      } else {
        score += 10;
      }

      // Bedrooms score (Up to 15 pts)
      if (criteria.requiredBedrooms) {
        if ((p.bedrooms ?? 0) >= criteria.requiredBedrooms) {
          score += 15;
          matchedCriteria.push(`عدد الغرف يلبي المتطلبات (${p.bedrooms} غرف)`);
        }
      } else {
        score += 10;
      }

      if (score >= 50) {
        results.push({
          property: this.toPublicProperty(p, db.users),
          score: Math.min(100, score),
          matchedCriteria,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 10);
  }

  // ============================================================================
  // Inquiries / Leads Management
  // ============================================================================

  public createInquiry(data: Omit<Inquiry, "id" | "createdAt" | "status">): Inquiry {
    const db = this.init();
    const id = "inq-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);

    const newInq: Inquiry = {
      ...data,
      id,
      status: "new",
      createdAt: new Date().toISOString(),
    };

    db.inquiries.unshift(newInq);

    // Increment inquiry count on property
    const prop = db.properties.find((p) => p.id === data.propertyId);
    if (prop) {
      prop.inquiriesCount = (prop.inquiriesCount || 0) + 1;
    }

    this.recordAuditEvent(data.seekerId, "CREATE_INQUIRY", "inquiry", id, { propertyId: data.propertyId });
    this.save();
    return newInq;
  }

  public getInquiriesForAdvertiser(advertiserId: string): Inquiry[] {
    const db = this.init();
    return db.inquiries.filter((inq) => inq.advertiserId === advertiserId);
  }

  public getInquiriesForSeeker(seekerId: string): Inquiry[] {
    const db = this.init();
    return db.inquiries.filter((inq) => inq.seekerId === seekerId);
  }

  public updateInquiryStatus(inquiryId: string, status: Inquiry["status"], actorUserId: string): Inquiry {
    const db = this.init();
    const inq = db.inquiries.find((i) => i.id === inquiryId);
    if (!inq) throw new Error("طلب التواصل غير موجود");
    if (inq.advertiserId !== actorUserId) throw new Error("غير مصرح بتعديل هذا الطلب");

    inq.status = status;
    this.save();
    return inq;
  }

  // ============================================================================
  // Favorites & Saved Searches
  // ============================================================================

  public toggleFavorite(userId: string, propertyId: string): boolean {
    const db = this.init();
    const idx = db.favorites.findIndex((f) => f.userId === userId && f.propertyId === propertyId);
    if (idx >= 0) {
      db.favorites.splice(idx, 1);
      this.save();
      return false; // removed
    } else {
      db.favorites.push({
        id: "fav-" + Date.now(),
        userId,
        propertyId,
        createdAt: new Date().toISOString(),
      });
      this.save();
      return true; // added
    }
  }

  public getUserFavorites(userId: string): PublicProperty[] {
    const db = this.init();
    const propIds = new Set(db.favorites.filter((f) => f.userId === userId).map((f) => f.propertyId));
    return db.properties
      .filter((p) => propIds.has(p.id) && p.status === "published")
      .map((p) => this.toPublicProperty(p, db.users));
  }

  public isPropertyFavorited(userId: string, propertyId: string): boolean {
    const db = this.init();
    return db.favorites.some((f) => f.userId === userId && f.propertyId === propertyId);
  }

  public createSavedSearch(userId: string, name: string, filters: PropertyFilterParams): SavedSearch {
    const db = this.init();
    const id = "search-" + Date.now();
    const saved: SavedSearch = {
      id,
      userId,
      name,
      filters,
      notifyNewListings: true,
      createdAt: new Date().toISOString(),
    };
    db.savedSearches.unshift(saved);
    this.save();
    return saved;
  }

  public getUserSavedSearches(userId: string): SavedSearch[] {
    const db = this.init();
    return db.savedSearches.filter((s) => s.userId === userId);
  }

  public deleteSavedSearch(id: string, userId: string): void {
    const db = this.init();
    db.savedSearches = db.savedSearches.filter((s) => !(s.id === id && s.userId === userId));
    this.save();
  }

  // ============================================================================
  // Taxonomy: Cities & Districts
  // ============================================================================

  public getCities(): City[] {
    const db = this.init();
    return db.cities;
  }

  public getDistricts(cityId?: string): District[] {
    const db = this.init();
    if (cityId) return db.districts.filter((d) => d.cityId === cityId);
    return db.districts;
  }

  // ============================================================================
  // Users & Authentication
  // ============================================================================

  public findUserByEmail(email: string): User | null {
    if (!email) return null;
    const db = this.init();
    return db.users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public findUserByPhone(phone: string): User | null {
    if (!phone) return null;
    const db = this.init();
    const targetNorm = normalizeEgyptianPhone(phone);
    return db.users.find((u) => u.phone && normalizeEgyptianPhone(u.phone) === targetNorm) || null;
  }

  public findUserByEmailOrPhone(identifier: string): User | null {
    if (!identifier) return null;
    const trimmed = identifier.trim();
    if (trimmed.includes("@")) {
      return this.findUserByEmail(trimmed);
    }
    return this.findUserByPhone(trimmed);
  }

  public findUserById(id: string): User | null {
    const db = this.init();
    return db.users.find((u) => u.id === id) || null;
  }

  public createUser(userData: Omit<User, "id" | "createdAt"> & { id?: string }): User {
    const db = this.init();
    const id = userData.id || ("user-" + Date.now());
    const newUser: User = {
      ...userData,
      id,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    this.save();
    return newUser;
  }

  public getAllUsersForAdmin(): User[] {
    const db = this.init();
    return db.users;
  }

  public suspendUser(userId: string, isSuspended: boolean, actorUser: User, reason?: string): User {
    const db = this.init();
    if (actorUser.role !== "admin") {
      throw new Error("غير مصرح، يتطلب صلاحية مدير النظام");
    }

    // Safety Invariant: Prevent self-suspension
    if (userId === actorUser.id) {
      throw new Error("لا يمكن للمشرف تعليق حسابه الشخصي");
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("المستخدم غير موجود");

    // Safety Invariant: Prevent suspending the last remaining active administrator
    if (user.role === "admin" && isSuspended) {
      const activeAdmins = db.users.filter((u) => u.role === "admin" && !u.isSuspended && u.id !== userId);
      if (activeAdmins.length === 0) {
        throw new Error("لا يمكن تعليق آخر مشرف نشط في النظام");
      }
    }

    if (isSuspended && (!reason || !reason.trim())) {
      throw new Error("سبب تعليق الحساب إلزامي");
    }

    user.isSuspended = isSuspended;
    user.suspensionReason = isSuspended ? reason?.trim() : undefined;

    this.recordAuditEvent(
      actorUser.id,
      isSuspended ? "SUSPEND_USER" : "REACTIVATE_USER",
      "user",
      userId,
      { reason: reason?.trim(), targetEmail: user.email, targetRole: user.role }
    );
    this.save();
    return user;
  }

  // ============================================================================
  // Property Reports & Complaints
  // ============================================================================

  public createPropertyReport(data: {
    propertyId: string;
    reporterId?: string;
    reporterName?: string;
    reporterPhone?: string;
    reasonCategory: ReportReasonCategory;
    details: string;
  }): PropertyReport {
    const db = this.init();
    const prop = db.properties.find((p) => p.id === data.propertyId || p.slug === data.propertyId);
    if (!prop && !/^[a-zA-Z0-9_-]{4,}$/.test(data.propertyId)) {
      throw new Error("العقار المُبلّغ عنه غير موجود");
    }

    if (!data.details || !data.details.trim()) {
      throw new Error("تفاصيل البلاغ مطلوبة");
    }

    const report: PropertyReport = {
      id: "rep-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
      propertyId: data.propertyId,
      reporterId: data.reporterId,
      reporterName: data.reporterName || "مستخدم مجهول",
      reporterPhone: data.reporterPhone,
      reasonCategory: data.reasonCategory,
      details: data.details.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.reports) db.reports = [];
    db.reports.unshift(report);

    this.recordAuditEvent(
      data.reporterId,
      "CREATE_REPORT",
      "property_report",
      report.id,
      { propertyId: data.propertyId, reasonCategory: data.reasonCategory }
    );
    this.save();
    return report;
  }

  public getPropertyReports(filters?: { status?: ReportStatus; propertyId?: string }): PropertyReport[] {
    const db = this.init();
    let reports = db.reports || [];
    if (filters?.status) {
      reports = reports.filter((r) => r.status === filters.status);
    }
    if (filters?.propertyId) {
      reports = reports.filter((r) => r.propertyId === filters.propertyId);
    }
    return reports;
  }

  public resolvePropertyReport(
    reportId: string,
    status: ReportStatus,
    adminUser: User,
    resolutionNotes?: string
  ): PropertyReport {
    const db = this.init();
    if (adminUser.role !== "admin") {
      throw new Error("غير مصرح، يتطلب صلاحية مدير النظام");
    }

    if (!db.reports) db.reports = [];
    const report = db.reports.find((r) => r.id === reportId);
    if (!report) throw new Error("البلاغ غير موجود");

    const previousStatus = report.status;
    report.status = status;
    report.resolutionNotes = resolutionNotes?.trim();
    report.resolvedBy = adminUser.id;
    report.resolvedAt = new Date().toISOString();
    report.updatedAt = new Date().toISOString();

    this.recordAuditEvent(
      adminUser.id,
      "RESOLVE_REPORT",
      "property_report",
      reportId,
      { previousStatus, newStatus: status, resolutionNotes, propertyId: report.propertyId }
    );
    this.save();
    return report;
  }

  // ============================================================================
  // Auditing & Admin Stats
  // ============================================================================

  public recordAuditEvent(
    userId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown>
  ): void {
    const db = this.init();
    if (!db.auditEvents) db.auditEvents = [];
    db.auditEvents.unshift({
      id: "audit-" + Date.now(),
      userId,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
    // Keep last 500 audit events
    if (db.auditEvents.length > 500) {
      db.auditEvents = db.auditEvents.slice(0, 500);
    }
    this.save();
  }

  public getAuditEvents(): AuditEvent[] {
    const db = this.init();
    return (db.auditEvents || []).slice(0, 50);
  }

  public getAdminStats(): {
    totalUsers: number;
    totalProperties: number;
    pendingReviewCount: number;
    publishedCount: number;
    rejectedCount: number;
    draftsCount: number;
    archivedCount: number;
    soldCount: number;
    totalAdvertisers: number;
    activeAdvertisers: number;
    suspendedAdvertisers: number;
    totalInquiries: number;
    pendingReportsCount: number;
    totalReportsCount: number;
  } {
    const db = this.init();
    const advertisers = db.users.filter((u) => u.role === "owner" || u.role === "broker");
    const reports = db.reports || [];
    return {
      totalUsers: db.users.length,
      totalProperties: db.properties.length,
      pendingReviewCount: db.properties.filter((p) => p.status === "pending_review").length,
      publishedCount: db.properties.filter((p) => p.status === "published").length,
      rejectedCount: db.properties.filter((p) => p.status === "rejected").length,
      draftsCount: db.properties.filter((p) => p.status === "draft").length,
      archivedCount: db.properties.filter((p) => p.status === "archived").length,
      soldCount: db.properties.filter((p) => p.status === "sold" || p.status === "rented").length,
      totalAdvertisers: advertisers.length,
      activeAdvertisers: advertisers.filter((u) => !u.isSuspended).length,
      suspendedAdvertisers: advertisers.filter((u) => !!u.isSuspended).length,
      totalInquiries: db.inquiries.length,
      pendingReportsCount: reports.filter((r) => r.status === "pending" || r.status === "investigating").length,
      totalReportsCount: reports.length,
    };
  }

  // ============================================================================
  // User Profile & Role Administration
  // ============================================================================

  public updateUserProfile(
    userId: string,
    updates: {
      name?: string;
      phone?: string;
      avatarUrl?: string;
      whatsappEnabled?: boolean;
      licenseNumber?: string;
      companyName?: string;
    }
  ): User {
    const db = this.init();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("المستخدم غير موجود");

    if (updates.name !== undefined && updates.name.trim()) {
      user.name = updates.name.trim();
    }
    if (updates.phone !== undefined && updates.phone.trim()) {
      user.phone = updates.phone.trim();
    }
    if (updates.avatarUrl !== undefined) {
      user.avatarUrl = updates.avatarUrl.trim();
    }
    if (updates.whatsappEnabled !== undefined) {
      user.whatsappEnabled = updates.whatsappEnabled;
    }
    if (updates.licenseNumber !== undefined && user.role === "broker") {
      user.licenseNumber = updates.licenseNumber.trim();
    }
    if (updates.companyName !== undefined && user.role === "broker") {
      user.companyName = updates.companyName.trim();
    }

    this.recordAuditEvent(userId, "USER_PROFILE_UPDATED", "user", userId, {
      updatedFields: Object.keys(updates),
    });
    this.save();
    return user;
  }

  public changeUserRole(
    targetUserId: string,
    newRole: UserRole,
    actorUser: User,
    reason: string
  ): User {
    const db = this.init();
    if (actorUser.role !== "admin") {
      throw new Error("غير مصرح، يتطلب صلاحية مدير النظام");
    }
    if (!reason || !reason.trim()) {
      throw new Error("سبب تعديل الدور إلزامي للتدقيق الأمني");
    }
    const user = db.users.find((u) => u.id === targetUserId);
    if (!user) throw new Error("المستخدم المستهدف غير موجود");

    // Safety Invariant: Prevent demoting the last remaining active administrator
    if (user.role === "admin" && newRole !== "admin") {
      const activeAdmins = db.users.filter(
        (u) => u.role === "admin" && !u.isSuspended && u.id !== targetUserId
      );
      if (activeAdmins.length === 0) {
        throw new Error("لا يمكن تغيير دور آخر مشرف نشط في النظام");
      }
    }

    const oldRole = user.role;
    user.role = newRole;

    this.recordAuditEvent(actorUser.id, "CHANGE_USER_ROLE", "user", targetUserId, {
      oldRole,
      newRole,
      reason: reason.trim(),
    });
    this.save();
    return user;
  }

  // ============================================================================
  // CMS & Content Management System
  // ============================================================================

  public getCmsHomepageSettings(): CmsHomepageSettings {
    const db = this.init();
    if (db.cmsHomepage) return db.cmsHomepage;

    const defaultSettings: CmsHomepageSettings = {
      heroBadgeText: "المنصة الجغرافية الذكية الأولى لعقارات جمهورية مصر العربية",
      heroTitleLine1: "اكتشف عقارك المثالي على",
      heroTitleLine2: "خريطة تفاعلية ذكية",
      heroDescription:
        "ابحث وتنقّل بين أرقى التجمعات السكنية والمشاريع الاستثمارية في القاهرة الجديدة، الشيخ زايد، 6 أكتوبر، والعاصمة الإدارية بدقة مكانية حقيقية وتواصل مع الملاك والوسطاء المعتمدين.",
      heroCtaText: "استكشف الخريطة",
      heroCtaLink: "/explore",
      bannerTitle: "تصفح العقارات عبر الخريطة التفاعلية المقسمة",
      bannerSubtitle:
        "شاهد مواقع الفيلات والشقق الفعلية مع حماية خصوصية العناوين، قارن الأسعار الجغرافية لكل متر مربع وتعرّف على الخدمات والمحاور المحيطة بكل عقار في وقت حقيقي.",
      bannerCtaText: "فتح الخريطة التفاعلية الآن",
      sectionOrder: ["hero", "map_banner", "categories", "featured", "recent", "features"],
      sectionVisibility: {
        hero: true,
        map_banner: true,
        categories: true,
        featured: true,
        recent: true,
        features: true,
      },
      navLabels: {
        brandTitle: "نبض العقار",
        brandSubtitle: "AqarPulse Egypt",
        home: "الرئيسية",
        propertiesDropdown: "العقارات",
        sale: "بيع",
        rent: "إيجار",
        explore: "الخريطة الذكية",
        smartMatch: "التوافق الذكي",
        about: "عن منصة نبض العقار",
        contact: "اتصل بنا",
        terms: "الشروط والأحكام",
        privacy: "سياسة الخصوصية وأمن البيانات",
        addProperty: "أضف عقارك",
      },
      contactPhone: "+201001234567",
      contactEmail: "info@aqarpulse.eg",
      contactWhatsApp: "+201001234567",
      metaTitle: "نبض العقار (AqarPulse) | المنصة العقارية الذكية والخريطة التفاعلية في مصر",
      metaDescription:
        "منصة عقارية مصرية ذكية بالخرائط التفاعلية وتحليلات الموقع وحماية الخصوصية.",
      featuredPropertyIds: [],
      isPublished: true,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    };

    db.cmsHomepage = defaultSettings;
    return defaultSettings;
  }

  public updateCmsHomepageSettings(
    updates: Partial<CmsHomepageSettings>,
    actorUser: User
  ): CmsHomepageSettings {
    const db = this.init();
    if (actorUser.role !== "admin") {
      throw new Error("غير مصرح، إدارة المحتوى تتطلب صلاحية مسؤول النظام");
    }

    const current = this.getCmsHomepageSettings();

    // Verify any curated featured properties are published
    if (updates.featuredPropertyIds) {
      const validIds = updates.featuredPropertyIds.filter((pid) => {
        const prop = db.properties.find((p) => p.id === pid);
        return prop && prop.status === "published";
      });
      updates.featuredPropertyIds = validIds;
    }

    const mergedNavLabels = updates.navLabels
      ? { ...(current.navLabels || {}), ...updates.navLabels }
      : current.navLabels;

    const updated: CmsHomepageSettings = {
      ...current,
      ...updates,
      navLabels: mergedNavLabels,
      updatedAt: new Date().toISOString(),
      updatedBy: actorUser.name || actorUser.email || actorUser.phone || "Admin",
    };

    // Store revision for rollback support
    if (!db.cmsRevisions) db.cmsRevisions = [];
    db.cmsRevisions.unshift({
      id: "rev-hp-" + Date.now(),
      entityType: "homepage",
      entityId: "homepage_settings",
      data: { ...current },
      createdAt: new Date().toISOString(),
      createdBy: actorUser.name || actorUser.email || actorUser.phone || "Admin",
    });

    db.cmsHomepage = updated;
    this.recordAuditEvent(actorUser.id, "CMS_HOMEPAGE_UPDATED", "cms", "homepage_settings", {
      changedKeys: Object.keys(updates),
    });
    this.save();
    return updated;
  }

  public getCmsPages(): CmsStaticPage[] {
    const db = this.init();
    if (db.cmsPages && db.cmsPages.length > 0) return db.cmsPages;

    const defaultPages: CmsStaticPage[] = [
      {
        id: "page-about",
        slug: "about",
        titleAr: "عن منصة نبض العقار",
        contentAr:
          "نبض العقار (AqarPulse) هي المنصة الجغرافية الذكية الأولى في مصر المصممة للربط المباشر بين الباحثين والملاك والوسطاء العقاريين المعتمدين باستخدام أحدث تقنيات الخرائط المكانية والتحقق الموثوق.",
        metaTitle: "عن نبض العقار | المنصة العقارية الذكية",
        metaDescription: "تعرف على رؤية منصة نبض العقار وفريق العمل.",
        isPublished: true,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      },
      {
        id: "page-contact",
        slug: "contact",
        titleAr: "اتصل بنا",
        contentAr:
          "يسعدنا تواصلكم معنا عبر البريد الإلكتروني أو الهاتف أو واتساب للإجابة على استفساراتكم وتقديم الدعم الفني.",
        metaTitle: "اتصل بنا | نبض العقار",
        metaDescription: "تواصل مع فريق دعم وخدمة عملاء نبض العقار.",
        isPublished: true,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      },
      {
        id: "page-terms",
        slug: "terms",
        titleAr: "الشروط والأحكام",
        contentAr:
          "شروط الاستخدام تحدد القواعد المنظمة لنشر العقارات، التحقق من التراخيص، ومنع الإعلانات المضللة أو المكررة على المنصة.",
        metaTitle: "الشروط والأحكام | نبض العقار",
        metaDescription: "شروط وضوابط استخدام منصة نبض العقار.",
        isPublished: true,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      },
      {
        id: "page-privacy",
        slug: "privacy",
        titleAr: "سياسة الخصوصية وأمن البيانات",
        contentAr:
          "نلتزم بحماية خصوصية بيانات المستخدمين وعدم إفصاح العناوين الدقيقة للمنازل إلا بعد موافقة صريحة للمالك.",
        metaTitle: "سياسة الخصوصية | نبض العقار",
        metaDescription: "سياسة حماية الخصوصية وأمن البيانات العقارية.",
        isPublished: true,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      },
    ];

    db.cmsPages = defaultPages;
    return defaultPages;
  }

  public getCmsPage(slug: string): CmsStaticPage | null {
    const pages = this.getCmsPages();
    return pages.find((p) => p.slug === slug) || null;
  }

  public updateCmsPage(
    slug: string,
    data: Partial<CmsStaticPage>,
    actorUser: User
  ): CmsStaticPage {
    const db = this.init();
    if (actorUser.role !== "admin") {
      throw new Error("غير مصرح، تعديل صفحات المحتوى يتطلب صلاحية مسؤول النظام");
    }

    const pages = this.getCmsPages();
    let page = pages.find((p) => p.slug === slug);

    if (!page) {
      const newPage: CmsStaticPage = {
        id: "page-" + Date.now(),
        slug,
        titleAr: data.titleAr || slug,
        contentAr: data.contentAr || "",
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        isPublished: data.isPublished !== undefined ? data.isPublished : true,
        updatedAt: new Date().toISOString(),
        updatedBy: actorUser.name || actorUser.email || actorUser.phone || "Admin",
      };
      if (!db.cmsPages) db.cmsPages = [];
      db.cmsPages.push(newPage);
      page = newPage;
    } else {
      // Store revision
      if (!db.cmsRevisions) db.cmsRevisions = [];
      db.cmsRevisions.unshift({
        id: "rev-pg-" + Date.now(),
        entityType: "page",
        entityId: slug,
        data: { ...page },
        createdAt: new Date().toISOString(),
        createdBy: actorUser.name || actorUser.email || actorUser.phone || "Admin",
      });

      if (data.titleAr !== undefined) page.titleAr = data.titleAr;
      if (data.contentAr !== undefined) page.contentAr = data.contentAr;
      if (data.metaTitle !== undefined) page.metaTitle = data.metaTitle;
      if (data.metaDescription !== undefined) page.metaDescription = data.metaDescription;
      if (data.isPublished !== undefined) page.isPublished = data.isPublished;
      page.updatedAt = new Date().toISOString();
      page.updatedBy = actorUser.name || actorUser.email || actorUser.phone || "Admin";
    }

    this.recordAuditEvent(actorUser.id, "CMS_PAGE_UPDATED", "cms", slug, {
      title: page.titleAr,
    });
    this.save();
    return page;
  }

  public getCmsMediaAssets(): CmsMediaAsset[] {
    const db = this.init();
    return db.cmsMedia || [];
  }

  public addCmsMediaAsset(asset: Omit<CmsMediaAsset, "id" | "createdAt" | "inUseCount">): CmsMediaAsset {
    const db = this.init();
    const newAsset: CmsMediaAsset = {
      ...asset,
      id: "media-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
      inUseCount: 0,
      createdAt: new Date().toISOString(),
    };
    if (!db.cmsMedia) db.cmsMedia = [];
    db.cmsMedia.unshift(newAsset);
    this.save();
    return newAsset;
  }

  public deleteCmsMediaAsset(id: string, actorUser: User): void {
    const db = this.init();
    if (actorUser.role !== "admin") {
      throw new Error("غير مصرح، حذف الوسائط يتطلب صلاحية مسؤول النظام");
    }
    const idx = (db.cmsMedia || []).findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("ملف الوسائط غير موجود");

    const asset = db.cmsMedia![idx];
    if (asset.inUseCount > 0) {
      throw new Error("لا يمكن حذف ملف وسائط مستخدم بالفعل في صفحات منشورة");
    }

    db.cmsMedia!.splice(idx, 1);
    this.recordAuditEvent(actorUser.id, "CMS_MEDIA_DELETED", "cms", id, {
      fileName: asset.fileName,
      url: asset.url,
    });
    this.save();
  }
}

export const dbStore = new DataStore();
