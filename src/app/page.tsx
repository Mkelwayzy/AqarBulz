"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
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

// Popular Meet Ghamr areas for fast manual selection
const QUICK_REGIONS = [
  { name: "وسط ميت غمر", lat: 30.7194, lng: 31.2580 },
  { name: "دقادوس", lat: 30.7289, lng: 31.2612 },
  { name: "تفهنا الأشراف", lat: 30.7495, lng: 31.3015 },
  { name: "صهرجت الكبرى", lat: 30.6872, lng: 31.2421 },
  { name: "دماص", lat: 30.7812, lng: 31.2940 },
  { name: "كوم النور", lat: 30.6950, lng: 31.3210 },
  { name: "أتميدة وبشلا", lat: 30.7600, lng: 31.2300 },
];

export default function SimpleMapApp() {
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PublicProperty | null>(null);

  // User Geolocation State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([30.7194, 31.2580]);
  const [mapZoom, setMapZoom] = useState(13);
  const [autoFitKey, setAutoFitKey] = useState<number>(Date.now());

  // Simple Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "sale" | "rent">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCarouselOpen, setIsCarouselOpen] = useState(true);

  // Load properties on initial mount
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

  // Request browser location
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatusMessage("متصفحك لا يدعم تحديد الموقع الجغرافي");
      return;
    }

    setLocating(true);
    setLocationStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setMapCenter([coords.lat, coords.lng]);
        setMapZoom(14);
        setAutoFitKey(Date.now());
        setShowLocationPrompt(false);
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation denied or error:", err);
        setLocating(false);
        setLocationStatusMessage("تعذر الحصول على الموقع تلقائياً. يمكنك اختيار منطقتك يدوياً من القائمة.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  // Set manual location
  const handleSelectQuickRegion = (region: typeof QUICK_REGIONS[0]) => {
    setUserLocation({ lat: region.lat, lng: region.lng });
    setMapCenter([region.lat, region.lng]);
    setMapZoom(14);
    setAutoFitKey(Date.now());
    setShowLocationPrompt(false);
  };

  // Filter and sort properties (closest first if user location is set)
  const processedProperties = useMemo(() => {
    let list = [...properties];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.addressDetails && p.addressDetails.toLowerCase().includes(q))
      );
    }

    // Transaction Type
    if (selectedType !== "all") {
      list = list.filter((p) => p.transactionType === selectedType);
    }

    // Category
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Add distance & Sort by nearest if user location exists
    if (userLocation) {
      list = list.map((p) => ({
        ...p,
        distanceMeters: calculateDistanceMeters(userLocation.lat, userLocation.lng, p.lat, p.lng),
      }));

      list.sort((a: any, b: any) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }

    return list;
  }, [properties, searchQuery, selectedType, selectedCategory, userLocation]);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] min-h-[500px] bg-slate-100 overflow-hidden flex flex-col font-sans">
      {/* 1. Ultra-Clean Floating Top Header */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Search Input */}
          <div className="relative flex-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 p-1.5 flex items-center gap-2 transition-all">
            <Search className="w-5 h-5 text-teal-700 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن عقار، شارع، أو قرية..."
              className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Recenter / Geolocation Button */}
          <button
            onClick={handleDetectLocation}
            disabled={locating}
            title="تحديد موقعي الآن"
            className="p-3 bg-white/95 backdrop-blur-md hover:bg-teal-50 text-teal-700 border border-slate-200/80 rounded-2xl shadow-lg transition-all flex items-center justify-center shrink-0 active:scale-95"
          >
            {locating ? <Loader2 className="w-5 h-5 animate-spin text-teal-700" /> : <Crosshair className="w-5 h-5" />}
          </button>
        </div>

        {/* Minimalist Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto py-1">
          {/* Transaction Type Filters */}
          <button
            onClick={() => setSelectedType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              selectedType === "all"
                ? "bg-teal-700 text-white shadow-teal-700/20"
                : "bg-white/90 text-slate-700 hover:bg-white border border-slate-200"
            }`}
          >
            الكل ({processedProperties.length})
          </button>
          <button
            onClick={() => setSelectedType("sale")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              selectedType === "sale"
                ? "bg-teal-700 text-white shadow-teal-700/20"
                : "bg-white/90 text-slate-700 hover:bg-white border border-slate-200"
            }`}
          >
            للبيع
          </button>
          <button
            onClick={() => setSelectedType("rent")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              selectedType === "rent"
                ? "bg-teal-700 text-white shadow-teal-700/20"
                : "bg-white/90 text-slate-700 hover:bg-white border border-slate-200"
            }`}
          >
            للإيجار
          </button>

          <span className="h-4 w-[1px] bg-slate-300 mx-0.5 shrink-0" />

          {/* Quick Category Filters */}
          {[
            { id: "all", label: "كافة العقارات" },
            { id: "apartment", label: "شقق" },
            { id: "land", label: "أراضي" },
            { id: "commercial", label: "محلات وتجاري" },
            { id: "building", label: "منازل وعمارات" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white"
                  : "bg-white/90 text-slate-700 hover:bg-white border border-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Interactive Map (Full Viewport) */}
      <div className="relative w-full h-full z-0">
        <PropertyMap
          properties={processedProperties}
          center={mapCenter}
          zoom={mapZoom}
          autoFitKey={autoFitKey}
          userLocation={userLocation}
          selectedPropertyId={selectedProperty?.id}
          onSelectProperty={(prop) => {
            setSelectedProperty(prop);
            if (prop) {
              setIsCarouselOpen(true);
            }
          }}
        />
      </div>

      {/* 3. Friendly Location Request Modal / Banner */}
      {showLocationPrompt && (
        <div className="absolute inset-x-4 top-24 sm:top-20 max-w-lg mx-auto z-30 bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 shrink-0 shadow-inner">
                <Navigation className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  حدد موقعك لعرض أقرب العقارات إليك
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  نوفر لك تجربة ذكية لحساب المسافة وعرض الفرص المتاحة حولك في ميت غمر وقراها فوراً
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLocationPrompt(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {locationStatusMessage && (
            <p className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold leading-relaxed">
              {locationStatusMessage}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleDetectLocation}
              disabled={locating}
              className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white font-black text-sm rounded-2xl shadow-lg shadow-teal-700/25 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              {locating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تحديد موقعك الجغرافي...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4" />
                  <span>تحديد موقعي الحالي الآن</span>
                </>
              )}
            </button>

            {/* Quick Regional Fallback Buttons */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-slate-400 mb-2">أو اختر منطقتك مباشرة:</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REGIONS.map((region) => (
                  <button
                    key={region.name}
                    onClick={() => handleSelectQuickRegion(region)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                  >
                    {region.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Floating Nearby Property Cards (Bottom Drawer / Carousel) */}
      <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-20 pointer-events-none flex flex-col items-center">
        {/* Toggle Carousel Button */}
        <button
          onClick={() => setIsCarouselOpen(!isCarouselOpen)}
          className="pointer-events-auto mb-2 px-3 py-1 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-teal-700 rounded-full shadow-md text-xs font-bold flex items-center gap-1 transition-all"
        >
          <span>{isCarouselOpen ? "إخفاء بطاقات العروض" : `عرض العقارات القريبة (${processedProperties.length})`}</span>
          {isCarouselOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {isCarouselOpen && processedProperties.length > 0 && (
          <div className="pointer-events-auto w-full overflow-x-auto no-scrollbar flex items-center gap-3 py-1 px-1">
            {processedProperties.slice(0, 15).map((prop: any) => {
              const isSelected = selectedProperty?.id === prop.id;
              return (
                <div
                  key={prop.id}
                  onClick={() => setSelectedProperty(prop)}
                  className={`w-72 sm:w-80 shrink-0 bg-white rounded-2xl border transition-all cursor-pointer shadow-lg overflow-hidden flex flex-col ${
                    isSelected ? "ring-2 ring-teal-600 border-teal-600 scale-[1.02]" : "border-slate-200/90 hover:border-teal-400"
                  }`}
                >
                  {/* Card Image */}
                  <div className="relative h-32 w-full bg-slate-200 overflow-hidden">
                    <img
                      src={prop.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"}
                      alt={prop.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-950/80 text-white backdrop-blur-sm">
                      {prop.transactionType === "sale" ? "للبيع" : "للإيجار"}
                    </div>

                    {/* Proximity Distance Tag */}
                    {prop.distanceMeters !== undefined && (
                      <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-lg text-xs font-black bg-teal-800 text-white shadow-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-300" />
                        <span>{formatDistance(prop.distanceMeters)}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3 space-y-1.5 text-right">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-black text-teal-700">
                        {prop.price.toLocaleString("ar-EG")} ج.م {prop.rentalPeriod ? "/ شهر" : ""}
                      </div>
                      <span className="text-[11px] text-slate-500 font-bold">{prop.areaSqM} م²</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 truncate" title={prop.title}>
                      {prop.title}
                    </h4>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500 font-semibold">
                      <span className="truncate">{prop.districtNameAr || "ميت غمر"}</span>
                      <Link
                        href={`/properties/${prop.slug}`}
                        className="text-teal-700 hover:underline font-bold"
                      >
                        التفاصيل ←
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
