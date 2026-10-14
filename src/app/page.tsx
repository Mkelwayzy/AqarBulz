"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PropertyMap from "@/components/map/PropertyMap";
import { PublicProperty, PropertyCategory, TransactionType } from "@/lib/db/types";
import {
  MapPin,
  Search,
  Crosshair,
  SlidersHorizontal,
  X,
  Compass,
  Building2,
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
  Sparkles,
  Radio,
} from "lucide-react";

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
  const [mapType, setMapType] = useState<"satellite" | "street">("satellite");
  const [mapCenter, setMapCenter] = useState<[number, number]>([30.7194, 31.2580]);
  const [mapZoom, setMapZoom] = useState(13);
  const [autoFitKey, setAutoFitKey] = useState<number>(Date.now());

  // Properties & Selection
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PublicProperty | null>(null);

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

  return (
    <div className="relative w-full h-[100dvh] bg-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* ========================================================
          TOP HEADER: MAP VIEW (Image 1) OR LIST VIEW (Image 2)
          ======================================================== */}
      {viewMode === "map" ? (
        /* Map Mode Top Header (Saudi Aqar Exact Match) */
        <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-30 pointer-events-auto">
          {/* Unified White Floating Card Container matching Image */}
          <div className="bg-white/98 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 p-2.5 space-y-2">
            {/* Row 1: [تصفية 🔍] on left, [🔑 للبيع | 🚪 للإيجار] on right */}
            <div className="flex items-center justify-between gap-2">
              {/* Blue Filter Button [🔍 تصفية] */}
              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-all active:scale-95 shrink-0"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
                <span className="font-black text-sm">تصفية</span>
              </button>

              {/* Pill Switcher: [للإيجار 🚪 | 🔑 للبيع] */}
              <div className="flex items-center bg-white rounded-xl border border-slate-300/80 h-10 px-1 shadow-2xs">
                {/* Sale (للبيع) */}
                <button
                  onClick={() => setTransactionType("sale")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    transactionType === "sale"
                      ? "text-emerald-700 font-black"
                      : "text-slate-500 font-bold hover:text-slate-800"
                  }`}
                >
                  <Key className={`w-3.5 h-3.5 rotate-90 ${transactionType === "sale" ? "text-emerald-600 stroke-[2.5]" : "text-slate-400"}`} />
                  <span className="text-xs">للبيع</span>
                </button>

                {/* Vertical Divider */}
                <span className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                {/* Rent (للإيجار) */}
                <button
                  onClick={() => setTransactionType("rent")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    transactionType === "rent"
                      ? "text-emerald-700 font-black"
                      : "text-slate-500 font-bold hover:text-slate-800"
                  }`}
                >
                  <DoorClosed className={`w-3.5 h-3.5 ${transactionType === "rent" ? "text-emerald-600 stroke-[2.5]" : "text-slate-400"}`} />
                  <span className="text-xs">للإيجار</span>
                </button>
              </div>
            </div>

            {/* Row 2: Horizontal Category Chips: [الكل] [شقة] [فيلا] [أرض] [دور] [عمارة] [محل] */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
              {CATEGORY_CHIPS.map((chip) => {
                const isActive = selectedCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setSelectedCategory(chip.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-emerald-50/70 text-emerald-700 font-black border-2 border-emerald-600 shadow-2xs"
                        : "bg-white text-slate-600 font-medium border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
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
              className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/25 active:scale-95 transition-transform"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
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
        /* 1. Map View */
        <div className="relative w-full flex-1 z-0">
          <PropertyMap
            properties={filteredProperties}
            center={mapCenter}
            zoom={mapZoom}
            autoFitKey={autoFitKey}
            userLocation={userLocation}
            mapType={mapType}
            selectedPropertyId={selectedProperty?.id}
            onSelectProperty={(prop) => setSelectedProperty(prop)}
          />

          {/* Floating Controls on Map (Bottom Right): Radar + Location + Layer Toggle */}
          <div className="absolute bottom-28 right-3 z-20 flex flex-col gap-2 pointer-events-auto">
            {/* Radar / Nearby Button (Green Circle with Waves) */}
            <button
              onClick={handleDetectLocation}
              disabled={locating}
              title="تحديد العقارات الأقرب إليك بالرادار"
              className="w-11 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center transition-all active:scale-95"
            >
              {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
            </button>

            {/* Target Crosshair Button (White Circle) */}
            <button
              onClick={handleDetectLocation}
              title="تحديد موقعي الجغرافي"
              className="w-11 h-11 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xl flex items-center justify-center transition-all active:scale-95"
            >
              <Crosshair className="w-5 h-5" />
            </button>

            {/* Satellite / Street Switcher */}
            <button
              onClick={() => setMapType(mapType === "satellite" ? "street" : "satellite")}
              title="التبديل بين القمر الصناعي والخريطة"
              className="w-11 h-11 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xl flex items-center justify-center transition-all active:scale-95"
            >
              <Layers className="w-5 h-5" />
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
          FLOATING SIGNATURE ACTION BAR (Image 1 & Image 2)
          [+ إضافة]       [37 من 37 إعلان]       [قائمة / خريطة]
          ======================================================== */}
      <div className="fixed bottom-16 sm:bottom-20 inset-x-4 max-w-md mx-auto z-40">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 py-2 px-3.5 flex items-center justify-between">
          {/* Left: Green Add Listing Button */}
          <Link
            href="/dashboard/properties/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/25 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة</span>
          </Link>

          {/* Center: Dynamic Listing Count */}
          <span className="text-xs font-bold text-slate-700">
            {viewMode === "map"
              ? `${filteredProperties.length} من ${properties.length} إعلان`
              : `${filteredProperties.length} إعلان`}
          </span>

          {/* Right: Switch View Button [قائمة 📑] / [خريطة 🗺️] */}
          <button
            onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
            className="flex items-center gap-1.5 text-xs font-black text-slate-800 hover:text-emerald-700 transition-colors"
          >
            <span>{viewMode === "map" ? "قائمة" : "خريطة"}</span>
            {viewMode === "map" ? (
              <ListIcon className="w-4 h-4 text-slate-700" />
            ) : (
              <MapIcon className="w-4 h-4 text-emerald-700" />
            )}
          </button>
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
    </div>
  );
}
