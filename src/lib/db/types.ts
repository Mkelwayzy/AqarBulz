export type UserRole = "user" | "guest" | "seeker" | "buyer" | "owner" | "broker" | "admin";

export type PropertyStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "paused"
  | "sold"
  | "rented"
  | "archived"
  | "suspended";

export type TransactionType = "sale" | "rent";

export type PropertyCategory =
  | "apartment"
  | "house"
  | "villa"
  | "commercial_retail"
  | "office"
  | "duplex"
  | "penthouse"
  | "townhouse"
  | "twin_house"
  | "chalet"
  | "studio"
  | "office"
  | "commercial_retail"
  | "clinic"
  | "land";

export type LocationPrivacy = "exact" | "approximate";

export const OFFICIAL_PROPERTY_CATEGORIES = [
  { value: "apartment", label: "شقق سكنية" },
  { value: "house", label: "بيوت ومنازل" },
  { value: "land", label: "أراضي (بناء / زراعية)" },
  { value: "commercial_retail", label: "محلات ومتاجر" },
  { value: "office", label: "مكاتب ومقرات إدارية" },
  { value: "villa", label: "فلل وقصور" },
] as const;

export const CATEGORY_LABELS_AR: Record<string, string> = {
  apartment: "شقق سكنية",
  house: "بيوت ومنازل",
  land: "أراضي (بناء / زراعية)",
  commercial_retail: "محلات ومتاجر",
  office: "مكاتب ومقرات إدارية",
  villa: "فلل وقصور",
  duplex: "شقق سكنية (دوبلكس)",
  penthouse: "شقق سكنية (بنتهاوس)",
  townhouse: "بيوت ومنازل (تاون هاوس)",
  twin_house: "فلل وقصور (توين هاوس)",
  chalet: "شقق سكنية (شاليه)",
  studio: "شقق سكنية (استوديو)",
  clinic: "مكاتب ومقرات إدارية (عيادة)",
};

export type FinishingStatus = "core_and_shell" | "semi_finished" | "fully_finished" | "ultra_lux";
export type FurnishingStatus = "unfurnished" | "semi_furnished" | "furnished";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  licenseNumber?: string; // For independent brokers
  companyName?: string;
  commercialRegistrationNo?: string;
  nationalId?: string; // National ID or ownership document reference
  whatsappEnabled?: boolean;
  bio?: string;
  passwordHash?: string;
  passwordSalt?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  adminRole?: "superadmin" | "moderator" | "support" | "editor" | "admin";
  adminPermissions?: string[];
  isStaff?: boolean;
  createdAt: string;
}

export interface City {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
}

export interface District {
  id: string;
  slug: string;
  cityId: string;
  nameAr: string;
  nameEn: string;
  centerLat: number;
  centerLng: number;
}

export interface PropertyImage {
  id: string;
  url: string;
  alt: string;
  isMain: boolean;
  order: number;
}

export interface PropertyAmenity {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  icon: string;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  transactionType: TransactionType;
  category: PropertyCategory;
  price: number;
  currency: string; // Default 'EGP'
  rentalPeriod?: "monthly" | "yearly" | "daily";
  negotiable: boolean;
  downPayment?: number;
  installmentYears?: number;

  // Specifications
  areaSqM: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  totalFloors?: number;
  finishingStatus?: FinishingStatus;
  furnishingStatus?: FurnishingStatus;
  parkingSpots?: number;
  hasElevator?: boolean;
  hasBuildingPermit?: boolean;
  yearBuilt?: number;
  amenities: string[]; // List of amenity keys
  images: string[]; // List of high-res image URLs

  // Geospatial
  cityId: string;
  districtId: string;
  addressDetails: string;
  lat: number;
  lng: number;
  locationPrivacy: LocationPrivacy;
  approximateLat?: number;
  approximateLng?: number;

  // Status & Moderation
  status: PropertyStatus;
  moderationNotes?: string;
  featured: boolean;
  viewsCount: number;
  inquiriesCount: number;

  // Advertiser
  advertiserId: string;
  advertiserType: "owner" | "broker";

  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Redacted property for public view when locationPrivacy is approximate
export interface PublicProperty extends Omit<Property, "lat" | "lng"> {
  lat: number;
  lng: number;
  isApproximateLocation: boolean;
  privacyRadiusMeters?: number;
  advertiser: {
    id: string;
    name: string;
    role: UserRole;
    phone?: string;
    whatsapp?: string;
    isVerified: boolean;
    avatarUrl?: string;
    companyName?: string;
  };
}

export interface PropertyFilterParams {
  transactionType?: TransactionType;
  category?: PropertyCategory;
  cityId?: string;
  districtId?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  finishingStatus?: FinishingStatus;
  furnishingStatus?: FurnishingStatus;
  advertiserType?: "owner" | "broker";
  verifiedOnly?: boolean;
  featuredOnly?: boolean;
  searchQuery?: string;

  // Geospatial bounds / viewport
  bounds?: {
    southWest: GeoPoint;
    northEast: GeoPoint;
  };
  // Geospatial radius
  radius?: {
    center: GeoPoint;
    radiusKm: number;
  };
  // Geospatial polygon
  polygon?: GeoPoint[];

  sort?: "newest" | "price_asc" | "price_desc" | "area_asc" | "area_desc" | "relevance";
  page?: number;
  limit?: number;
}

export interface ChatMessage {
  id: string;
  inquiryId: string;
  senderId: string;
  senderName: string;
  senderRole: "buyer" | "seeker" | "owner" | "broker" | "admin";
  content: string;
  createdAt: string;
  isAdminNote?: boolean;
}

export interface Inquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  seekerId: string;
  seekerName: string;
  seekerPhone: string;
  seekerEmail: string;
  advertiserId: string;
  message: string;
  preferredContact: "call" | "whatsapp" | "email";
  status: "new" | "contacted" | "qualified" | "closed" | "spam";
  createdAt: string;
  messages?: ChatMessage[];
  lastMessageAt?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: PropertyFilterParams;
  notifyNewListings: boolean;
  createdAt: string;
}

export interface ModerationLog {
  id: string;
  propertyId: string;
  adminId: string;
  adminName: string;
  previousStatus: PropertyStatus;
  newStatus: PropertyStatus;
  reason?: string;
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface DuplicateCheckResult {
  hasPotentialDuplicate: boolean;
  confidenceScore: number; // 0 to 100
  matchedPropertyIds: string[];
  reasons: string[];
}

export interface SmartMatchResult {
  property: PublicProperty;
  score: number; // 0 to 100
  matchedCriteria: string[];
}

export type ReportReasonCategory =
  | "misleading_details"
  | "duplicate_listing"
  | "unavailable"
  | "suspected_fraud"
  | "fraud_impersonation"
  | "inappropriate_content"
  | "other";

export type ReportStatus = "pending" | "investigating" | "resolved" | "dismissed";

export interface PropertyReport {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  reporterId?: string;
  reporterName: string;
  reporterPhone?: string;
  reporterContact?: string;
  reason?: ReportReasonCategory;
  reasonCategory: ReportReasonCategory;
  details: string;
  status: ReportStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  adminId?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

// ==============================================================================
// CMS & Content Management System Types
// ==============================================================================

export interface CmsNavLabels {
  brandTitle?: string;
  brandSubtitle?: string;
  home?: string;
  propertiesDropdown?: string;
  sale?: string;
  rent?: string;
  explore?: string;
  smartMatch?: string;
  about?: string;
  contact?: string;
  terms?: string;
  privacy?: string;
  addProperty?: string;
}

export interface VisualIdentitySettings {
  siteName: string;
  siteSubtitle: string;
  logoType: "icon_text" | "image" | "text_only";
  logoIcon: "building" | "map_pin" | "sparkles" | "compass" | "shield" | "home" | "crown" | "layers";
  logoImageUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  primaryHoverColor: string;
  secondaryColor: string;
  accentColor: string;
  headerBackground: "glass" | "white" | "dark";
  colorSchemePreset: "emerald_pulse" | "royal_blue" | "luxury_gold" | "modern_indigo" | "midnight_slate" | "custom";
  fontFamily: "cairo" | "alexandria" | "tajawal" | "almarai" | "ibm_plex";
  headingWeight: "bold" | "extrabold" | "black";
  borderRadius: "curved" | "soft" | "rounded";
}

export interface CmsHomepageSettings {
  heroBadgeText: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroDescription: string;
  heroCtaText: string;
  heroCtaLink: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerCtaText: string;
  sectionOrder: string[]; // ["hero", "map_banner", "categories", "featured", "recent", "features"]
  sectionVisibility: Record<string, boolean>;
  navLabels?: CmsNavLabels;
  visualIdentity?: VisualIdentitySettings;
  contactPhone: string;
  contactEmail: string;
  contactWhatsApp: string;
  metaTitle: string;
  metaDescription: string;
  featuredPropertyIds: string[];
  isPublished: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface CmsStaticPage {
  id: string;
  slug: string;
  titleAr: string;
  contentAr: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface CmsMediaAsset {
  id: string;
  url: string;
  altText: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedBy: string;
  inUseCount: number;
  createdAt: string;
}

export interface CmsRevision {
  id: string;
  entityType: "homepage" | "page";
  entityId: string;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

export interface OfficialNotice {
  id: string;
  propertyId?: string;
  propertyTitle?: string;
  recipientId: string;
  recipientRole: "owner" | "broker" | "admin";
  senderId: string;
  senderName: string;
  senderRole: "admin" | "owner" | "broker";
  type: "edit_request" | "deletion_notice" | "deletion_request" | "general_notice";
  title: string;
  message: string;
  status: "unread" | "read" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}
