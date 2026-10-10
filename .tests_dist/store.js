"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbStore = void 0;
exports.haversineDistanceMeters = haversineDistanceMeters;
exports.isPointInBoundingBox = isPointInBoundingBox;
exports.isPointInPolygon = isPointInPolygon;
exports.calculateApproximateCoordinates = calculateApproximateCoordinates;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const seed_data_1 = require("./seed-data");
const DATA_DIR = path_1.default.join(process.cwd(), ".data");
const DB_FILE = path_1.default.join(DATA_DIR, "aqarpulse_db.json");
// ==============================================================================
// Geospatial Math Utilities (PostGIS equivalents in pure TypeScript)
// ==============================================================================
/**
 * Calculates Haversine distance in meters between two coordinates.
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
function isPointInBoundingBox(point, southWest, northEast) {
    const latOk = point.lat >= Math.min(southWest.lat, northEast.lat) && point.lat <= Math.max(southWest.lat, northEast.lat);
    let lngOk = false;
    if (southWest.lng <= northEast.lng) {
        lngOk = point.lng >= southWest.lng && point.lng <= northEast.lng;
    }
    else {
        // Crosses antimeridian
        lngOk = point.lng >= southWest.lng || point.lng <= northEast.lng;
    }
    return latOk && lngOk;
}
/**
 * Ray-casting algorithm to test whether a coordinate point is inside a polygon.
 */
function isPointInPolygon(point, polygon) {
    if (polygon.length < 3)
        return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;
        const intersect = yi > point.lat !== yj > point.lat &&
            point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
        if (intersect)
            inside = !inside;
    }
    return inside;
}
/**
 * Generates a deterministic approximate coordinate (approx. 350m - 500m offset)
 * for advertisers who select locationPrivacy = 'approximate'.
 */
function calculateApproximateCoordinates(exactLat, exactLng, propertyId) {
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
    if (approxLat === exactLat)
        approxLat = Number((exactLat + 0.0025).toFixed(6));
    if (approxLng === exactLng)
        approxLng = Number((exactLng + 0.0025).toFixed(6));
    return {
        lat: approxLat,
        lng: approxLng,
    };
}
// ==============================================================================
// Database Store Singleton with Thread-Safe File Persistence
// ==============================================================================
class DataStore {
    state = null;
    init() {
        if (this.state)
            return this.state;
        if (!fs_1.default.existsSync(DATA_DIR)) {
            fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (fs_1.default.existsSync(DB_FILE)) {
            try {
                const raw = fs_1.default.readFileSync(DB_FILE, "utf-8");
                this.state = JSON.parse(raw);
                if (this.state) {
                    if (!this.state.reports)
                        this.state.reports = [];
                    if (!this.state.auditEvents)
                        this.state.auditEvents = [];
                    if (!this.state.moderationLogs)
                        this.state.moderationLogs = [];
                    return this.state;
                }
            }
            catch (err) {
                console.warn("Failed to load existing db file, initializing seed data:", err);
            }
        }
        // Default Seed state
        this.state = {
            users: [...seed_data_1.initialUsers],
            cities: [...seed_data_1.initialCities],
            districts: [...seed_data_1.initialDistricts],
            properties: [...seed_data_1.initialProperties],
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
    save() {
        if (!this.state)
            return;
        try {
            if (!fs_1.default.existsSync(DATA_DIR)) {
                fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
            }
            fs_1.default.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), "utf-8");
        }
        catch (err) {
            console.error("Error saving database file:", err);
        }
    }
    // ============================================================================
    // Properties & Geospatial Search
    // ============================================================================
    queryProperties(filters, viewerUser) {
        const db = this.init();
        const isAdmin = viewerUser?.role === "admin";
        // 1. Status Filter: Public queries can ONLY see 'published'
        let list = db.properties.filter((p) => {
            if (isAdmin)
                return true;
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
            list = list.filter((p) => p.price >= filters.minPrice);
        }
        if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
            list = list.filter((p) => p.price <= filters.maxPrice);
        }
        // 6. Area Range
        if (filters.minArea !== undefined && filters.minArea !== null) {
            list = list.filter((p) => p.areaSqM >= filters.minArea);
        }
        if (filters.maxArea !== undefined && filters.maxArea !== null) {
            list = list.filter((p) => p.areaSqM <= filters.maxArea);
        }
        // 7. Bedrooms & Bathrooms
        if (filters.bedrooms !== undefined && filters.bedrooms !== null) {
            list = list.filter((p) => (p.bedrooms ?? 0) >= filters.bedrooms);
        }
        if (filters.bathrooms !== undefined && filters.bathrooms !== null) {
            list = list.filter((p) => (p.bathrooms ?? 0) >= filters.bathrooms);
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
            list = list.filter((p) => p.title.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.addressDetails.toLowerCase().includes(q));
        }
        // 11. Spatial Filtering (Server-Side)
        // A. Viewport Bounding Box
        if (filters.bounds) {
            const { southWest, northEast } = filters.bounds;
            list = list.filter((p) => {
                const point = p.locationPrivacy === "approximate" && p.approximateLat
                    ? { lat: p.approximateLat, lng: p.approximateLng }
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
                return isPointInPolygon({ lat: p.lat, lng: p.lng }, filters.polygon);
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
    getPropertyByIdOrSlug(idOrSlug, viewerUser) {
        const db = this.init();
        const prop = db.properties.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
        if (!prop)
            return null;
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
    getRawPropertyById(id) {
        const db = this.init();
        return db.properties.find((p) => p.id === id) || null;
    }
    getPropertiesByAdvertiser(advertiserId) {
        const db = this.init();
        return db.properties
            .filter((p) => p.advertiserId === advertiserId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getAllPropertiesForAdmin() {
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
    toPublicProperty(property, users, viewerUser) {
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
    createProperty(data) {
        const db = this.init();
        const id = "prop-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
        // Generate safe slug in Arabic-English format
        const cleanTitle = data.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");
        const slug = `${cleanTitle}-${id.slice(-6)}`;
        // Calculate approximate coordinates if privacy mode enabled
        let approxCoords = undefined;
        if (data.locationPrivacy === "approximate") {
            approxCoords = calculateApproximateCoordinates(data.lat, data.lng, id);
        }
        const newProperty = {
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
    updateProperty(id, updates, actorUser) {
        const db = this.init();
        const index = db.properties.findIndex((p) => p.id === id);
        if (index === -1)
            throw new Error("العقار غير موجود");
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
        const updated = {
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
    updatePropertyStatus(id, newStatus, actorUser, reason) {
        const db = this.init();
        const index = db.properties.findIndex((p) => p.id === id);
        if (index === -1)
            throw new Error("العقار غير موجود");
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
        }
        else {
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
        if (!db.moderationLogs)
            db.moderationLogs = [];
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
    getPropertyModerationHistory(propertyId) {
        const db = this.init();
        return (db.moderationLogs || []).filter((m) => m.propertyId === propertyId);
    }
    deleteProperty(id, actorUser) {
        const db = this.init();
        const index = db.properties.findIndex((p) => p.id === id);
        if (index === -1)
            throw new Error("العقار غير موجود");
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
    checkPotentialDuplicates(newProp) {
        const db = this.init();
        const candidateProps = db.properties.filter((p) => p.id !== newProp.id && p.status !== "archived");
        const matchedPropertyIds = [];
        const reasons = [];
        let maxConfidence = 0;
        for (const cand of candidateProps) {
            let score = 0;
            const reasonsForCand = [];
            // 1. Proximity check
            if (newProp.lat && newProp.lng) {
                const dist = haversineDistanceMeters(newProp.lat, newProp.lng, cand.lat, cand.lng);
                if (dist <= 150) {
                    score += 35;
                    reasonsForCand.push(`مسافة جغرافية قريبة جداً (${Math.round(dist)}م)`);
                }
                else if (dist <= 500) {
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
                if (score > maxConfidence)
                    maxConfidence = score;
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
    findSmartMatchesForCriteria(criteria) {
        const db = this.init();
        const publishedProps = db.properties.filter((p) => p.status === "published");
        const results = [];
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
            const matchedCriteria = [];
            // Budget score (Up to 35 pts)
            if (criteria.maxBudget) {
                if (p.price <= criteria.maxBudget) {
                    score += 35;
                    matchedCriteria.push("ضمن الميزانية المحددة تماماً");
                }
                else {
                    score += 20;
                    matchedCriteria.push("قريب جداً من الميزانية");
                }
            }
            else {
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
            }
            else {
                score += 10;
            }
            // Bedrooms score (Up to 15 pts)
            if (criteria.requiredBedrooms) {
                if ((p.bedrooms ?? 0) >= criteria.requiredBedrooms) {
                    score += 15;
                    matchedCriteria.push(`عدد الغرف يلبي المتطلبات (${p.bedrooms} غرف)`);
                }
            }
            else {
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
    createInquiry(data) {
        const db = this.init();
        const id = "inq-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
        const newInq = {
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
    getInquiriesForAdvertiser(advertiserId) {
        const db = this.init();
        return db.inquiries.filter((inq) => inq.advertiserId === advertiserId);
    }
    getInquiriesForSeeker(seekerId) {
        const db = this.init();
        return db.inquiries.filter((inq) => inq.seekerId === seekerId);
    }
    updateInquiryStatus(inquiryId, status, actorUserId) {
        const db = this.init();
        const inq = db.inquiries.find((i) => i.id === inquiryId);
        if (!inq)
            throw new Error("طلب التواصل غير موجود");
        if (inq.advertiserId !== actorUserId)
            throw new Error("غير مصرح بتعديل هذا الطلب");
        inq.status = status;
        this.save();
        return inq;
    }
    // ============================================================================
    // Favorites & Saved Searches
    // ============================================================================
    toggleFavorite(userId, propertyId) {
        const db = this.init();
        const idx = db.favorites.findIndex((f) => f.userId === userId && f.propertyId === propertyId);
        if (idx >= 0) {
            db.favorites.splice(idx, 1);
            this.save();
            return false; // removed
        }
        else {
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
    getUserFavorites(userId) {
        const db = this.init();
        const propIds = new Set(db.favorites.filter((f) => f.userId === userId).map((f) => f.propertyId));
        return db.properties
            .filter((p) => propIds.has(p.id) && p.status === "published")
            .map((p) => this.toPublicProperty(p, db.users));
    }
    isPropertyFavorited(userId, propertyId) {
        const db = this.init();
        return db.favorites.some((f) => f.userId === userId && f.propertyId === propertyId);
    }
    createSavedSearch(userId, name, filters) {
        const db = this.init();
        const id = "search-" + Date.now();
        const saved = {
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
    getUserSavedSearches(userId) {
        const db = this.init();
        return db.savedSearches.filter((s) => s.userId === userId);
    }
    deleteSavedSearch(id, userId) {
        const db = this.init();
        db.savedSearches = db.savedSearches.filter((s) => !(s.id === id && s.userId === userId));
        this.save();
    }
    // ============================================================================
    // Taxonomy: Cities & Districts
    // ============================================================================
    getCities() {
        const db = this.init();
        return db.cities;
    }
    getDistricts(cityId) {
        const db = this.init();
        if (cityId)
            return db.districts.filter((d) => d.cityId === cityId);
        return db.districts;
    }
    // ============================================================================
    // Users & Authentication
    // ============================================================================
    findUserByEmail(email) {
        const db = this.init();
        return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
    findUserById(id) {
        const db = this.init();
        return db.users.find((u) => u.id === id) || null;
    }
    createUser(userData) {
        const db = this.init();
        const id = "user-" + Date.now();
        const newUser = {
            ...userData,
            id,
            createdAt: new Date().toISOString(),
        };
        db.users.push(newUser);
        this.save();
        return newUser;
    }
    getAllUsersForAdmin() {
        const db = this.init();
        return db.users;
    }
    suspendUser(userId, isSuspended, actorUser, reason) {
        const db = this.init();
        if (actorUser.role !== "admin") {
            throw new Error("غير مصرح، يتطلب صلاحية مدير النظام");
        }
        // Safety Invariant: Prevent self-suspension
        if (userId === actorUser.id) {
            throw new Error("لا يمكن للمشرف تعليق حسابه الشخصي");
        }
        const user = db.users.find((u) => u.id === userId);
        if (!user)
            throw new Error("المستخدم غير موجود");
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
        this.recordAuditEvent(actorUser.id, isSuspended ? "SUSPEND_USER" : "REACTIVATE_USER", "user", userId, { reason: reason?.trim(), targetEmail: user.email, targetRole: user.role });
        this.save();
        return user;
    }
    // ============================================================================
    // Property Reports & Complaints
    // ============================================================================
    createPropertyReport(data) {
        const db = this.init();
        const prop = db.properties.find((p) => p.id === data.propertyId || p.slug === data.propertyId);
        if (!prop && !/^[a-zA-Z0-9_-]{4,}$/.test(data.propertyId)) {
            throw new Error("العقار المُبلّغ عنه غير موجود");
        }
        if (!data.details || !data.details.trim()) {
            throw new Error("تفاصيل البلاغ مطلوبة");
        }
        const report = {
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
        if (!db.reports)
            db.reports = [];
        db.reports.unshift(report);
        this.recordAuditEvent(data.reporterId, "CREATE_REPORT", "property_report", report.id, { propertyId: data.propertyId, reasonCategory: data.reasonCategory });
        this.save();
        return report;
    }
    getPropertyReports(filters) {
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
    resolvePropertyReport(reportId, status, adminUser, resolutionNotes) {
        const db = this.init();
        if (adminUser.role !== "admin") {
            throw new Error("غير مصرح، يتطلب صلاحية مدير النظام");
        }
        if (!db.reports)
            db.reports = [];
        const report = db.reports.find((r) => r.id === reportId);
        if (!report)
            throw new Error("البلاغ غير موجود");
        const previousStatus = report.status;
        report.status = status;
        report.resolutionNotes = resolutionNotes?.trim();
        report.resolvedBy = adminUser.id;
        report.resolvedAt = new Date().toISOString();
        report.updatedAt = new Date().toISOString();
        this.recordAuditEvent(adminUser.id, "RESOLVE_REPORT", "property_report", reportId, { previousStatus, newStatus: status, resolutionNotes, propertyId: report.propertyId });
        this.save();
        return report;
    }
    // ============================================================================
    // Auditing & Admin Stats
    // ============================================================================
    recordAuditEvent(userId, action, entityType, entityId, details) {
        const db = this.init();
        if (!db.auditEvents)
            db.auditEvents = [];
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
    getAuditEvents() {
        const db = this.init();
        return (db.auditEvents || []).slice(0, 50);
    }
    getAdminStats() {
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
}
exports.dbStore = new DataStore();
