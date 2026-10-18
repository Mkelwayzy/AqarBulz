"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Compass, SlidersHorizontal, MapPin, ChevronDown, Check } from "lucide-react";

interface MeetGhamrLocation {
  name: string;
  districtId: string;
  city: string;
}

const PRICE_STEPS = [
  { value: "20000", label: "20,000 ج.م" },
  { value: "50000", label: "50,000 ج.م" },
  { value: "100000", label: "100,000 ج.م" },
  { value: "250000", label: "250,000 ج.م" },
  { value: "500000", label: "500,000 ج.م" },
  { value: "750000", label: "750,000 ج.م" },
  { value: "1000000", label: "1 مليون ج.م" },
  { value: "1500000", label: "1.5 مليون ج.م" },
  { value: "2000000", label: "2 مليون ج.م" },
  { value: "3000000", label: "3 مليون ج.م" },
  { value: "5000000", label: "5 مليون ج.م" },
  { value: "8000000", label: "8 مليون ج.م" },
  { value: "12000000", label: "12 مليون ج.م" },
  { value: "20000000", label: "20 مليون ج.م" },
  { value: "all", label: "مالا نهاية (∞)" },
];

export default function HomeHeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [transactionType, setTransactionType] = useState<string>("sale");
  const [category, setCategory] = useState<string>("all");
  
  // Price Slider state - default to Infinity (مالا نهاية)
  const [sliderIndex, setSliderIndex] = useState<number>(PRICE_STEPS.length - 1);
  const [showPricePopover, setShowPricePopover] = useState(false);
  const pricePopoverRef = useRef<HTMLDivElement>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [meetGhamrLocations, setMeetGhamrLocations] = useState<MeetGhamrLocation[]>([]);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pricePopoverRef.current && !pricePopoverRef.current.contains(event.target as Node)) {
        setShowPricePopover(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetch("/api/taxonomy")
      .then(async (response) => {
        if (!response.ok) throw new Error("تعذر تحميل مناطق مركز ميت غمر");
        const taxonomy = await response.json();
        setMeetGhamrLocations(
          Array.isArray(taxonomy.districts)
            ? taxonomy.districts.map((district: { id: string; nameAr: string }) => ({
                name: district.nameAr,
                districtId: district.id,
                city: "مركز ميت غمر",
              }))
            : []
        );
      })
      .catch((error: unknown) => console.error("[HomeHeroSearch] Taxonomy load failed:", error));
  }, []);

  const filteredLocations = meetGhamrLocations.filter((loc) =>
    query.trim() === ""
      ? true
      : loc.name.includes(query.trim()) || loc.city.includes(query.trim())
  );

  const currentPrice = PRICE_STEPS[sliderIndex];
  const isInfinitePrice = currentPrice.value === "all";

  const handleSelectLocation = (loc: MeetGhamrLocation) => {
    setQuery(loc.name);
    setSelectedDistrictId(loc.districtId);
    setShowSuggestions(false);

    const params = new URLSearchParams();
    params.append("q", loc.name);
    params.append("districtId", loc.districtId);
    if (transactionType && transactionType !== "all") params.append("transactionType", transactionType);
    if (category && category !== "all") params.append("category", category);
    if (!isInfinitePrice) params.append("maxPrice", currentPrice.value);

    router.push(`/explore?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setShowPricePopover(false);

    const params = new URLSearchParams();
    if (query.trim()) params.append("q", query.trim());
    if (selectedDistrictId) params.append("districtId", selectedDistrictId);
    if (transactionType && transactionType !== "all") params.append("transactionType", transactionType);
    if (category && category !== "all") params.append("category", category);
    if (!isInfinitePrice) params.append("maxPrice", currentPrice.value);

    router.push(`/explore?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-700/80 shadow-2xl mt-8 text-right relative">
      {/* Transaction Type Tabs */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setTransactionType("sale")}
          className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
            transactionType === "sale"
              ? "bg-brand-500 text-slate-950 shadow-sm"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          عقارات للبيع (شراء)
        </button>
        <button
          type="button"
          onClick={() => setTransactionType("rent")}
          className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
            transactionType === "rent"
              ? "bg-brand-500 text-slate-950 shadow-sm"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          عقارات للإيجار
        </button>
        <button
          type="button"
          onClick={() => setTransactionType("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            transactionType === "all"
              ? "bg-slate-700 text-white"
              : "bg-slate-800/60 text-slate-400 hover:text-white"
          }`}
        >
          الكل
        </button>
      </div>

      {/* Main Search Controls Grid */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5 items-stretch">
          
          {/* 1. Keyword / District Input with Autocomplete */}
          <div ref={searchBoxRef} className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedDistrictId(null);
                setShowSuggestions(true);
              }}
              placeholder="ابحث بالقرية، المنطقة، أو الشارع في ميت غمر..."
              className="w-full h-full min-h-[46px] pr-10 pl-3 py-2.5 bg-white text-slate-900 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 shadow-inner"
            />

            {/* Suggestions Popover */}
            {showSuggestions && filteredLocations.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-1 text-right">
                <div className="px-3 py-1.5 text-[11px] font-extrabold text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>قرى ومناطق مركز ميت غمر</span>
                  <span className="text-[10px] text-brand-600">انقر للاختيار المباشر</span>
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {filteredLocations.map((loc) => (
                    <button
                      key={loc.districtId}
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-brand-50 hover:text-brand-800 transition-colors text-right"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span>{loc.name}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">{loc.city}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Category Select: نوع العقار */}
          <div className="sm:col-span-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-full min-h-[46px] py-2.5 px-3 bg-white text-slate-900 rounded-2xl text-xs sm:text-sm font-bold border-0 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner cursor-pointer"
            >
              <option value="all">نوع العقار (الكل)</option>
              <option value="apartment">شقق سكنية</option>
              <option value="house">بيوت ومنازل</option>
              <option value="land">أراضي (بناء / زراعية)</option>
              <option value="commercial_retail">محلات ومتاجر</option>
              <option value="office">مكاتب ومقرات إدارية</option>
              <option value="villa">فلل وقصور</option>
            </select>
          </div>

          {/* 3. Price Slider Control: السعر */}
          <div ref={pricePopoverRef} className="sm:col-span-2 relative">
            <button
              type="button"
              onClick={() => setShowPricePopover(!showPricePopover)}
              className="w-full h-full min-h-[46px] py-2 px-3 bg-white text-slate-900 rounded-2xl text-xs font-bold flex items-center justify-between gap-1 shadow-inner hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col text-right items-start leading-tight truncate">
                <span className="text-[10px] text-slate-400 font-semibold">السعر</span>
                <span className="text-xs font-black text-brand-600 truncate">
                  {isInfinitePrice ? "مالا نهاية" : currentPrice.label}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Interactive Price Range Slider Popover */}
            {showPricePopover && (
              <div className="absolute top-full right-0 left-0 sm:right-auto sm:left-auto sm:w-80 mt-2 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 z-50 p-4 animate-in fade-in slide-in-from-top-1 text-right">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                  <span className="text-xs font-black text-slate-200">تحديد السعر</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 font-mono">
                    {isInfinitePrice ? "مالا نهاية (∞)" : `حتى ${currentPrice.label}`}
                  </span>
                </div>

                {/* Range Slider Track */}
                <div className="space-y-3 py-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                    <span>20,000 ج.م</span>
                    <span className="text-brand-400 font-bold">اسحب لتحديد السعر</span>
                    <span>مالا نهاية (∞)</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={PRICE_STEPS.length - 1}
                    step={1}
                    value={sliderIndex}
                    onChange={(e) => setSliderIndex(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400 transition-all"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2">
                    {[
                      { index: 0, label: "20 ألف" },
                      { index: 2, label: "100 ألف" },
                      { index: 4, label: "500 ألف" },
                      { index: 6, label: "1 مليون" },
                      { index: 9, label: "3 مليون" },
                      { index: PRICE_STEPS.length - 1, label: "مالا نهاية" },
                    ].map((preset) => (
                      <button
                        key={preset.index}
                        type="button"
                        onClick={() => setSliderIndex(preset.index)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                          sliderIndex === preset.index
                            ? "bg-brand-500 text-slate-950 font-black"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPricePopover(false)}
                    className="px-4 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-black transition-colors"
                  >
                    تطبيق
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Submit CTA: بحث بالخريطة */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>بحث بالخريطة</span>
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
