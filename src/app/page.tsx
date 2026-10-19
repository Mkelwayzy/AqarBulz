"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PropertyMap from "@/components/map/PropertyMap";
import InquiryForm from "@/app/properties/[slug]/InquiryForm";
import { PublicProperty, PropertyCategory, TransactionType } from "@/lib/db/types";
import {
  MapPin,
  Search,
  Crosshair,
  SlidersHorizontal,
  X,
  Home as HomeIcon,
  Layers,
  ChevronUp,
  ChevronDown,
  Navigation,
  Loader2,
  Phone,
  MessageCircle,
  Eye,
  CheckCircle2,
  Key,
  DoorClosed,
  Plus,
  List as ListIcon,
  Map as MapIcon,
  Maximize2,
  Tag,
  ArrowRight,
  Radio,
} from "lucide-react";
import type { CmsHomepageSettings } from "@/lib/db/types";

// Haversine distance formula in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} م`;
  }
  return `${(meters / 1000).toFixed(1)} كم`;
}

// Category filter chips matching Image 1
const CATEGORY_CHIPS = [
  { id: "all", label: "الكل" },
  { id: "apartment", label: "شقة" },
  { id: "villa", label: "فيلا" },
  { id: "land", label: "أرض" },
  { id: "floor", label: "دور" },
  { id: "building", label: "عمارة" },
  { id: "commercial", label: "محل" },
  { id: "office", label: "مكتب" },
];

export default function SaudiAqarApp() {
  const router = useRouter();

  // Primary view toggle: "map" (Image 1) or "list" (Image 2)
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Filter States
  const [transactionType, setTransactionType] = useState<"sale" | "rent">("sale");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "price" | "nearest">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  // Map settings
  const [mapType, setMapType] = useState<"satellite" | "street">("street");
  const [mapCenter, setMapCenter] = useState<[number, number]>([30.7194, 31.2580]);
  const [mapZoom, setMapZoom] = useState(13);
  const [autoFitKey, setAutoFitKey] = useState<number>(Date.now());

  // Properties & Selection
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [homepageSettings, setHomepageSettings] = useState<CmsHomepageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PublicProperty | null>(null);
  const [contactProperty, setContactProperty] = useState<PublicProperty | null>(null);

  // User Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Fetch properties from backend
  useEffect(() => {
    fetch("/api/properties?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.properties)) {
          setProperties(data.properties);
        }
      })
      .catch((err) => console.error("Properties fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/cms/homepage", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("تعذر تحميل محتوى الصفحة الرئيسية");
        const data = await response.json();
        if (data.settings) setHomepageSettings(data.settings as CmsHomepageSettings);
      })
      .catch((error: unknown) => console.error("[Home] CMS content load failed:", error));
  }, []);

  const homeIdentity = homepageSettings?.visualIdentity;

  // Browser Geolocation trigger
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("متصفحك لا يدعم تحديد الموقع الجغرافي");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setMapCenter([coords.lat, coords.lng]);
        setMapZoom(14);
        setAutoFitKey(Date.now());
        setSortOrder("nearest");
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation denied or error:", err);
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  // Filtered and Sorted properties
  const filteredProperties = useMemo(() => {
    let list = [...properties];

    // Transaction Type
    list = list.filter((p) => p.transactionType === transactionType);

    // Category
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.addressDetails && p.addressDetails.toLowerCase().includes(q))
      );
    }

    // Min & Max Price
    if (minPrice && !isNaN(Number(minPrice))) {
      list = list.filter((p) => p.price >= Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      list = list.filter((p) => p.price <= Number(maxPrice));
    }

    // Compute distance if user location is known
    if (userLocation) {
      list = list.map((p) => ({
        ...p,
        distanceMeters: calculateDistanceMeters(userLocation.lat, userLocation.lng, p.lat, p.lng),
      }));
    }

    // Sorting
    if (sortOrder === "price") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOrder === "nearest" && userLocation) {
      list.sort((a: any, b: any) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    } else {
      // Newest by default
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [properties, transactionType, selectedCategory, searchQuery, minPrice, maxPrice, sortOrder, userLocation]);

  // Active filter count for badge indicator
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (minPrice && !isNaN(Number(minPrice))) count++;
    if (maxPrice && !isNaN(Number(maxPrice))) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedCategory, minPrice, maxPrice, searchQuery]);

  return (
    <div className="relative w-full h-[100dvh] bg-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* ========================================================
          TOP HEADER: MAP VIEW (Image 1) OR LIST VIEW (Image 2)
          ======================================================== */}
      {viewMode === "map" ? (
        /* Large Comprehensive Top Board (لوحة تحكم وبحث علوية كبيرة وموحدة) */
        <div className="fixed top-2.5 inset-x-2 sm:inset-x-4 max-w-2xl mx-auto z-30 pointer-events-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-200 p-2.5 sm:p-3.5 space-y-2.5 transition-all">
            <div className="flex items-center gap-2.5 px-1">
              <div className="min-w-0 flex-1">
                <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {homepageSettings?.heroTitleLine1 || homeIdentity?.siteName || "نبض العقار"}
                  {homepageSettings?.heroTitleLine2 ? ` ${homepageSettings.heroTitleLine2}` : ""}
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                  {homepageSettings?.heroBadgeText || homeIdentity?.siteSubtitle || "عقارات مركز ميت غمر وقراه"}
                </p>
              </div>
              {homepageSettings?.heroCtaText && (
                <Link
                  href={homepageSettings.heroCtaLink || "/explore"}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-white"
                  style={{ backgroundColor: homeIdentity?.primaryColor || "#047857" }}
                >
                  {homepageSettings.heroCtaText}
                </Link>
              )}
            </div>
            {homepageSettings?.heroDescription && (
              <p className="px-1 text-[10px] leading-relaxed text-slate-500 line-clamp-2">
                {homepageSettings.heroDescription}
              </p>
            )}
            {/* Row 1: Search Input + Transaction Toggle + Filter Button */}
            <div className="flex items-center gap-2">
              {/* Filter Button [تصفية] */}
              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-sm transition-all active:scale-95 shrink-0"
                aria-label="تصفية البحث"
              >
                <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
                <span className="font-extrabold text-xs">تصفية</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 font-black text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Direct Interactive Search Box */}
              <div className="flex-1 relative flex items-center bg-slate-50 hover:bg-slate-100/80 focus-within:bg-white rounded-xl border border-slate-200/90 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition-all px-2.5 py-1.5 sm:py-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالحي أو المدينة..."
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center shrink-0 mr-1"
                    aria-label="مسح البحث"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : null}
              </div>

              {/* Segmented Sale / Rent Switch */}
              <div className="flex items-center bg-slate-100/90 rounded-xl p-1 border border-slate-200/70 shrink-0">
                <button
                  onClick={() => setTransactionType("sale")}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs transition-all ${
                    transactionType === "sale"
                      ? "bg-emerald-700 text-white font-extrabold shadow-xs"
                      : "text-slate-600 font-semibold hover:text-slate-900"
                  }`}
                >
                  للبيع
                </button>
                <button
                  onClick={() => setTransactionType("rent")}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs transition-all ${
                    transactionType === "rent"
                      ? "bg-emerald-700 text-white font-extrabold shadow-xs"
                      : "text-slate-600 font-semibold hover:text-slate-900"
                  }`}
                >
                  للإيجار
                </button>
              </div>
            </div>

            {/* Row 2: Comprehensive Category Chips inside the Board */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 px-0.5">
              {CATEGORY_CHIPS.map((chip) => {
                const isActive = selectedCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setSelectedCategory(chip.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      isActive
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-sm shadow-emerald-700/20"
                        : "bg-slate-50 hover:bg-slate-100/90 text-slate-700 border-slate-200/80 active:bg-slate-200"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Row 3: Micro Status Info Bar (عدد العقارات والتصفية السريعة) */}
            <div className="flex items-center justify-between pt-1 px-1 border-t border-slate-100 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>
                  <strong>{filteredProperties.length}</strong> عقار متاح على الخريطة
                </span>
              </span>
              {(searchQuery || selectedCategory !== "all" || minPrice || maxPrice) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setMinPrice("");
                    setMaxPrice("");
                  }}
                  className="text-emerald-700 hover:text-emerald-800 font-bold transition-colors hover:underline"
                >
                  إلغاء جميع الفلاتر
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List Mode Top Header (Image 2) */
        <div className="bg-white border-b border-slate-200 z-30 pt-3 pb-2 px-4 shadow-xs">
          {/* Header Row: Search Icon + Title + Back to Map */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowFilterModal(true)}
              className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/25 active:scale-95 transition-transform"
            >
              <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
            </button>

            <h1 className="text-base font-black text-slate-900 tracking-tight">
              قائمة العقارات
            </h1>

            <button
              onClick={() => setViewMode("map")}
              className="p-1 text-slate-700 hover:text-emerald-700 transition-colors"
              title="العودة للخريطة"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-header Sorting Tabs: [الأحدث] | [السعر] | [الأقرب] */}
          <div className="grid grid-cols-3 bg-slate-100 rounded-xl p-1 text-center text-xs font-bold">
            <button
              onClick={() => setSortOrder("newest")}
              className={`py-1.5 rounded-lg transition-all ${
                sortOrder === "newest"
                  ? "bg-white text-slate-900 font-black shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              الأحدث
            </button>
            <button
              onClick={() => setSortOrder("price")}
              className={`py-1.5 rounded-lg transition-all ${
                sortOrder === "price"
                  ? "bg-white text-slate-900 font-black shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              السعر
            </button>
            <button
              onClick={() => {
                if (!userLocation) {
                  handleDetectLocation();
                } else {
                  setSortOrder("nearest");
                }
              }}
              className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                sortOrder === "nearest"
                  ? "bg-white text-emerald-700 font-black shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {locating && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
              <span>الأقرب</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          BODY CONTAINER: MAP VIEW OR LIST VIEW
          ======================================================== */}
      {viewMode === "map" ? (
        /* 1. Map View (Full Screen Edge-to-Edge) */
        <div className="absolute inset-0 w-full h-full z-0">
          <PropertyMap
            properties={filteredProperties}
            center={mapCenter}
            zoom={mapZoom}
            autoFitKey={autoFitKey}
            userLocation={userLocation}
            mapType={mapType}
            selectedPropertyId={selectedProperty?.id}
            onSelectProperty={(prop) => setSelectedProperty(prop)}
            onDirectContact={(prop) => setContactProperty(prop)}
          />

          {/* Floating Controls on Map: Uniform circular white buttons in vertical column */}
          <div className="fixed bottom-24 sm:bottom-28 right-3.5 sm:right-4 z-30 flex flex-col gap-2.5 pointer-events-auto">
            {/* Spatial Radar Button */}
            <button
              onClick={handleDetectLocation}
              disabled={locating}
              title="تحديد العقارات الأقرب إليك بالرادار"
              className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 active:scale-95 transition-transform hover:bg-slate-50 text-emerald-700"
            >
              {locating ? <Loader2 className="w-5 h-5 animate-spin text-emerald-700" /> : <Radio className="w-5 h-5 text-emerald-700" />}
            </button>

            {/* Target Crosshair GPS Location Button */}
            <button
              onClick={handleDetectLocation}
              disabled={locating}
              title="تحديد موقعي الجغرافي"
              className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 active:scale-95 transition-transform hover:bg-slate-50 text-emerald-700"
            >
              <Crosshair className="w-5 h-5 text-emerald-700" />
            </button>

            {/* Satellite / Street Switcher */}
            <button
              onClick={() => setMapType(mapType === "satellite" ? "street" : "satellite")}
              title="التبديل بين القمر الصناعي والخريطة"
              className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 active:scale-95 transition-transform hover:bg-slate-50 text-emerald-700"
            >
              <Layers className="w-5 h-5 text-emerald-700" />
            </button>
          </div>
        </div>
      ) : (
        /* 2. List View (Image 2) */
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 space-y-3 pb-36">
          {filteredProperties.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center mx-auto text-slate-500">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-600">لا توجد عقارات مطابقة للخيارات المحددة</p>
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setMinPrice("");
                  setMaxPrice("");
                  setSearchQuery("");
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            filteredProperties.map((prop: any) => (
              <Link
                key={prop.id}
                href={`/properties/${prop.slug}`}
                className="block bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all overflow-hidden group"
              >
                <div className="flex items-stretch gap-3 p-2.5">
                  {/* Thumbnail Image on the side */}
                  <div className="relative w-28 sm:w-36 h-28 shrink-0 rounded-xl overflow-hidden bg-slate-200">
                    <img
                      src={prop.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"}
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900/80 text-white backdrop-blur-xs">
                      {prop.transactionType === "sale" ? "للبيع" : "للإيجار"}
                    </div>
                  </div>

                  {/* Card Content Details */}
                  <div className="flex-1 flex flex-col justify-between text-right py-0.5">
                    <div>
                      {/* Title */}
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {prop.title}
                      </h3>

                      {/* Price in Bold Green (Image 2 style) */}
                      <div className="text-base font-black text-emerald-700 mt-1">
                        {prop.price.toLocaleString("ar-EG")} ج.م {prop.rentalPeriod ? "/ شهر" : ""}
                      </div>

                      {/* Specs Row with Icons: Area, Zoning, Street/Rooms */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-bold mt-2">
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{prop.areaSqM} م²</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <span>سكني</span>
                        </span>
                        {prop.bedrooms ? (
                          <span className="flex items-center gap-1">
                            <span>{prop.bedrooms} غرف</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Address & Distance */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-100 mt-1">
                      <span className="truncate max-w-[180px]">
                        {prop.addressDetails || "مركز ميت غمر ، محافظة الدقهلية"}
                      </span>
                      {prop.distanceMeters !== undefined && (
                        <span className="text-emerald-700 font-bold shrink-0">
                          {formatDistance(prop.distanceMeters)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* ========================================================
          QUICK PROPERTY PREVIEW CARD (Floats above bottom dock on pin click)
          ======================================================== */}
      {viewMode === "map" && selectedProperty && (
        <div className="fixed bottom-24 sm:bottom-28 inset-x-3 sm:inset-x-4 max-w-md mx-auto z-40 pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
          <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 p-2.5 overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setSelectedProperty(null)}
              className="absolute top-2 left-2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors z-10"
              title="إغلاق المعاينة"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2.5">
              {/* Compact Thumbnail Image */}
              <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-200">
                <img
                  src={selectedProperty.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"}
                  alt={selectedProperty.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-slate-900/80 text-white">
                  {selectedProperty.transactionType === "sale" ? "للبيع" : "للإيجار"}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 text-right pl-6">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {selectedProperty.title}
                </h4>
                <div className="text-sm font-black text-emerald-700 mt-0.5">
                  {selectedProperty.price.toLocaleString("ar-EG")} ج.م {selectedProperty.rentalPeriod ? "/ شهر" : ""}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                  <span>{selectedProperty.areaSqM} م²</span>
                  {selectedProperty.bedrooms ? (
                    <>
                      <span>•</span>
                      <span>{selectedProperty.bedrooms} غرف</span>
                    </>
                  ) : null}
                  {selectedProperty.bathrooms ? (
                    <>
                      <span>•</span>
                      <span>{selectedProperty.bathrooms} حمام</span>
                    </>
                  ) : null}
                </div>

                {/* Action Buttons: View Details & Direct Contact */}
                <div className="flex items-center gap-1.5 mt-2">
                  <Link
                    href={`/properties/${selectedProperty.slug}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold transition-colors"
                  >
                    <span>عرض التفاصيل</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setContactProperty(selectedProperty)}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>التواصل المباشر</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FLOATING SIGNATURE BOTTOM DOCK
          Center Capsule: [قائمة 📋] + [X عقار متاح في هذا النطاق]
          Action:  [+ إضافة] with deep shadow
          ======================================================== */}
      <div className="fixed bottom-6 sm:bottom-8 inset-x-3 sm:inset-x-4 max-w-md mx-auto z-40 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between gap-2.5 pointer-events-auto">
          {/* Floating Capsule: Count & Switch to List/Map */}
          <div className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-100/90">
            {/* Switch View Button [قائمة 📋] or [خريطة 🗺️] */}
            <button
              onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
              className="flex items-center gap-1.5 text-xs font-black text-slate-800 hover:text-emerald-700 active:scale-95 transition-all"
            >
              {viewMode === "map" ? (
                <>
                  <ListIcon className="w-4 h-4 text-emerald-700" />
                  <span>قائمة</span>
                </>
              ) : (
                <>
                  <MapIcon className="w-4 h-4 text-emerald-700" />
                  <span>خريطة</span>
                </>
              )}
            </button>

            {/* Divider */}
            <span className="w-px h-4 bg-gray-200" />

            {/* Counter: "X عقار متاح في هذا النطاق" */}
            <span className="text-xs font-bold text-slate-700">
              {filteredProperties.length} عقار متاح في هذا النطاق
            </span>
          </div>

          {/* Floating Add Listing Button "+ إضافة" with deep shadow */}
          <Link
            href="/dashboard/properties/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-xl shadow-emerald-700/35 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة</span>
          </Link>
        </div>
      </div>

      {/* ========================================================
          FILTER MODAL (Opens via [🔍 تصفية])
          ======================================================== */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">تصفية العقارات</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">نوع العملية</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTransactionType("sale")}
                  className={`py-2 rounded-lg transition-all ${
                    transactionType === "sale" ? "bg-white text-emerald-700 shadow-xs font-black" : "text-slate-500"
                  }`}
                >
                  للبيع
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType("rent")}
                  className={`py-2 rounded-lg transition-all ${
                    transactionType === "rent" ? "bg-white text-emerald-700 shadow-xs font-black" : "text-slate-500"
                  }`}
                >
                  للإيجار
                </button>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">نطاق السعر (ج.م)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="من"
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="إلى"
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">نوع العقار</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSelectedCategory(chip.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === chip.id
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20"
              >
                عرض النتائج ({filteredProperties.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setMinPrice("");
                  setMaxPrice("");
                  setSearchQuery("");
                }}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DIRECT CONTACT MODAL (Opens from Map Popup or Preview Card)
          ======================================================== */}
      {contactProperty && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setContactProperty(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
          >
            {/* Modal Header with Property Summary */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <img
                    src={contactProperty.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80"}
                    alt={contactProperty.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 text-right">
                  <h3 className="text-xs font-black text-slate-900 truncate">
                    {contactProperty.title}
                  </h3>
                  <div className="text-xs font-extrabold text-emerald-700">
                    {contactProperty.price.toLocaleString("ar-EG")} ج.م
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContactProperty(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-App Direct Inquiry & Chat Form */}
            <InquiryForm
              propertyId={contactProperty.id}
              propertyTitle={contactProperty.title}
              advertiserId={contactProperty.advertiserId || contactProperty.advertiser?.id}
              autoOpenExistingChat={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
