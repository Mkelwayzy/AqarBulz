"use client";

import React, { useState, useEffect, useCallback } from "react";
import PropertyMap from "@/components/map/PropertyMap";
import PropertyCard from "@/components/property/PropertyCard";
import PropertyFiltersBar from "@/components/property/PropertyFiltersBar";
import { PublicProperty, PropertyFilterParams, District } from "@/lib/db/types";
import { Compass, List, Map as MapIcon, Loader2, Sparkles, AlertCircle } from "lucide-react";

export default function ExplorePage() {
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PublicProperty | null>(null);
  const [mobileView, setMobileView] = useState<"split" | "map" | "list">("split");

  const [filters, setFilters] = useState<PropertyFilterParams>({
    sort: "newest",
    limit: 50,
  });

  // Fetch districts on mount
  useEffect(() => {
    fetch("/api/taxonomy")
      .then((res) => res.json())
      .then((data) => {
        if (data.districts) setDistricts(data.districts);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch properties whenever filters or bounds change
  const fetchProperties = useCallback(async (currentFilters: PropertyFilterParams) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();

      if (currentFilters.transactionType) queryParams.set("transactionType", currentFilters.transactionType);
      if (currentFilters.category) queryParams.set("category", currentFilters.category);
      if (currentFilters.districtId) queryParams.set("districtId", currentFilters.districtId);
      if (currentFilters.minPrice) queryParams.set("minPrice", currentFilters.minPrice.toString());
      if (currentFilters.maxPrice) queryParams.set("maxPrice", currentFilters.maxPrice.toString());
      if (currentFilters.minArea) queryParams.set("minArea", currentFilters.minArea.toString());
      if (currentFilters.maxArea) queryParams.set("maxArea", currentFilters.maxArea.toString());
      if (currentFilters.bedrooms) queryParams.set("bedrooms", currentFilters.bedrooms.toString());
      if (currentFilters.searchQuery) queryParams.set("q", currentFilters.searchQuery);
      if (currentFilters.sort) queryParams.set("sort", currentFilters.sort);
      if (currentFilters.verifiedOnly) queryParams.set("verifiedOnly", "true");
      if (currentFilters.featuredOnly) queryParams.set("featuredOnly", "true");

      // Viewport Bounds
      if (currentFilters.bounds) {
        const { southWest, northEast } = currentFilters.bounds;
        queryParams.set("bounds", `${southWest.lat},${southWest.lng},${northEast.lat},${northEast.lng}`);
      }

      queryParams.set("limit", "50");

      const res = await fetch(`/api/properties?${queryParams.toString()}`);
      const data = await res.json();
      if (data.properties) {
        setProperties(data.properties);
      }
    } catch (err) {
      console.error("Failed to fetch properties:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProperties(filters);
  }, [filters, fetchProperties]);

  // Handle map bounds change (debounced from Leaflet)
  const handleBoundsChange = (bounds: {
    southWest: { lat: number; lng: number };
    northEast: { lat: number; lng: number };
  }) => {
    setFilters((prev) => ({
      ...prev,
      bounds,
    }));
  };

  const handleResetFilters = () => {
    setFilters({ sort: "newest", limit: 50 });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1700px] mx-auto px-2 sm:px-4 py-2 overflow-hidden">
      {/* Top Filter Bar */}
      <div className="shrink-0 mb-2">
        <PropertyFiltersBar
          filters={filters}
          onFilterChange={(newFilters) => setFilters(newFilters)}
          onReset={handleResetFilters}
          districts={districts}
        />
      </div>

      {/* Mobile Toggle Buttons (Map vs List) */}
      <div className="md:hidden flex items-center justify-center gap-2 mb-2 bg-white p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setMobileView("map")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileView === "map" ? "bg-brand-600 text-white shadow-sm" : "text-slate-600"
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>الخريطة ({properties.length})</span>
        </button>
        <button
          onClick={() => setMobileView("list")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileView === "list" ? "bg-brand-600 text-white shadow-sm" : "text-slate-600"
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>القائمة ({properties.length})</span>
        </button>
      </div>

      {/* Main Split-Screen Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 overflow-hidden min-h-0">
        {/* Left Side (Desktop): Interactive Map */}
        <div
          className={`h-full flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative ${
            mobileView === "list" ? "hidden md:block" : "block"
          }`}
        >
          <PropertyMap
            properties={properties}
            selectedPropertyId={selectedProperty?.id}
            onSelectProperty={(p) => setSelectedProperty(p)}
            onBoundsChange={handleBoundsChange}
            center={[30.035, 31.47]} // Default Cairo New Cairo
            zoom={12}
          />

          {/* Map Floating Summary Badge */}
          <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200/80 text-[11px] font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{properties.length} عقار متاح في هذا النطاق</span>
            {loading && <Loader2 className="w-3 h-3 animate-spin text-brand-600" />}
          </div>
        </div>

        {/* Right Side (Desktop): Scrollable List */}
        <div
          className={`w-full md:w-[480px] lg:w-[540px] xl:w-[580px] h-full flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm shrink-0 ${
            mobileView === "map" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* List Header */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <span className="text-xs font-bold text-slate-700">
              نتائج البحث ({properties.length} عقار)
            </span>
            <span className="text-[11px] text-slate-400">
              حرّك الخريطة للتحديث التلقائي
            </span>
          </div>

          {/* Cards Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading && properties.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                <span>جاري البحث في قاعدة البيانات الجغرافية...</span>
              </div>
            ) : properties.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs gap-2 p-6 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <span className="font-bold text-slate-700">لا توجد عقارات مطابقة في هذا النطاق</span>
                <span>جرّب تكبير نطاق الخريطة أو تخفيف شروط التصفية.</span>
                <button
                  onClick={handleResetFilters}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 font-bold hover:bg-brand-100"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            ) : (
              properties.map((property) => (
                <div
                  key={property.id}
                  id={`prop-card-${property.id}`}
                  className="transition-all"
                >
                  <PropertyCard
                    property={property}
                    isSelected={selectedProperty?.id === property.id}
                    onHover={(p) => setSelectedProperty(p)}
                    onClick={(p) => setSelectedProperty(p)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
