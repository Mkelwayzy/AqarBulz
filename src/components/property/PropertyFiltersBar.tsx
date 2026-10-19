"use client";

import React, { useState } from "react";
import {
  PropertyFilterParams,
  PropertyCategory,
  TransactionType,
  OFFICIAL_PROPERTY_CATEGORIES,
} from "@/lib/db/types";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Building,
  MapPin,
  CircleDollarSign,
  Bed,
  Check,
} from "lucide-react";

interface PropertyFiltersBarProps {
  filters: PropertyFilterParams;
  onFilterChange: (filters: PropertyFilterParams) => void;
  onReset: () => void;
  districts?: { id: string; nameAr: string }[];
}

export default function PropertyFiltersBar({
  filters,
  onFilterChange,
  onReset,
  districts = [],
}: PropertyFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTransactionChange = (type?: TransactionType) => {
    onFilterChange({ ...filters, transactionType: type, page: 1 });
  };

  const handleCategoryChange = (cat: string) => {
    onFilterChange({
      ...filters,
      category: cat === "" ? undefined : (cat as PropertyCategory),
      page: 1,
    });
  };

  const handleDistrictChange = (distId: string) => {
    onFilterChange({
      ...filters,
      districtId: distId === "" ? undefined : distId,
      page: 1,
    });
  };

  const handleBedroomsChange = (beds?: number) => {
    onFilterChange({ ...filters, bedrooms: beds, page: 1 });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 md:p-4 mb-4">
      {/* Primary Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Transaction Type Segmented Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleTransactionChange(undefined)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !filters.transactionType
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => handleTransactionChange("sale")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filters.transactionType === "sale"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            للبيع
          </button>
          <button
            type="button"
            onClick={() => handleTransactionChange("rent")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filters.transactionType === "rent"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            للإيجار
          </button>
        </div>

        {/* Search Query Input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={filters.searchQuery || ""}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value, page: 1 })}
            placeholder="ابحث بالمنطقة، الحي، أو اسم العقار..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* District Dropdown */}
        <div className="w-full sm:w-auto min-w-[170px]">
          <select
            value={filters.districtId || ""}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="">كافة المناطق والأحياء</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameAr}
              </option>
            ))}
          </select>
        </div>

        {/* Category Dropdown */}
        <div className="w-full sm:w-auto min-w-[140px]">
          <select
            value={filters.category || ""}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
          >
            <option value="">نوع العقار (الكل)</option>
            {OFFICIAL_PROPERTY_CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
            showAdvanced
              ? "bg-brand-50 border-brand-200 text-brand-700"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>تصفية إضافية</span>
        </button>

        {/* Reset Button */}
        <button
          type="button"
          onClick={onReset}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="إعادة ضبط الفلاتر"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Advanced Filters Expansion Panel */}
      {showAdvanced && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Price Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
              السعر (ج.م)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="من"
                min={1}
                max={100_000_000}
                value={filters.minPrice || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    minPrice: e.target.value
                      ? Math.min(100_000_000, Math.max(1, Number(e.target.value)))
                      : undefined,
                    page: 1,
                  })
                }
                className="w-1/2 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="number"
                placeholder="إلى"
                min={1}
                max={100_000_000}
                value={filters.maxPrice || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    maxPrice: e.target.value
                      ? Math.min(100_000_000, Math.max(1, Number(e.target.value)))
                      : undefined,
                    page: 1,
                  })
                }
                className="w-1/2 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <input
              aria-label="الحد الأعلى للسعر"
              type="range"
              min={1}
              max={100_000_000}
              step={100_000}
              value={filters.maxPrice || 100_000_000}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  maxPrice: Number(e.target.value),
                  page: 1,
                })
              }
              className="mt-2 w-full accent-brand-600"
            />
          </div>

          {/* Area Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
              المساحة (م²)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="من"
                value={filters.minArea || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    minArea: e.target.value ? Number(e.target.value) : undefined,
                    page: 1,
                  })
                }
                className="w-1/2 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="number"
                placeholder="إلى"
                value={filters.maxArea || ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    maxArea: e.target.value ? Number(e.target.value) : undefined,
                    page: 1,
                  })
                }
                className="w-1/2 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Bedrooms Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
              عدد غرف النوم
            </label>
            <div className="flex items-center gap-1">
              {[undefined, 1, 2, 3, 4, 5].map((b) => (
                <button
                  key={b === undefined ? "all" : b}
                  type="button"
                  onClick={() => handleBedroomsChange(b)}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg border ${
                    filters.bedrooms === b
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {b === undefined ? "الكل" : `${b}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles: Verified & Featured */}
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(filters.verifiedOnly)}
                onChange={(e) =>
                  onFilterChange({ ...filters, verifiedOnly: e.target.checked, page: 1 })
                }
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>إعلانات موثقة فقط</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(filters.featuredOnly)}
                onChange={(e) =>
                  onFilterChange({ ...filters, featuredOnly: e.target.checked, page: 1 })
                }
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>العقارات المميزة فقط</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
