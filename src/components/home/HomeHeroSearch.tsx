"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Compass, Building2, MapPin, DollarSign, SlidersHorizontal } from "lucide-react";

export default function HomeHeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [transactionType, setTransactionType] = useState<string>("sale");
  const [category, setCategory] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.append("q", query.trim());
    if (transactionType && transactionType !== "all") params.append("transactionType", transactionType);
    if (category && category !== "all") params.append("category", category);
    if (maxPrice && maxPrice !== "all") params.append("maxPrice", maxPrice);

    router.push(`/explore?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-700/80 shadow-2xl mt-8 text-right">
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
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5">
          {/* 1. Keyword / District Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالمنطقة، الحي، الكمبوند..."
              className="w-full pr-10 pl-3 py-3 bg-white text-slate-900 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 shadow-inner"
            />
          </div>

          {/* 2. Category Select */}
          <div className="sm:col-span-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full py-3 px-3 bg-white text-slate-900 rounded-2xl text-xs sm:text-sm font-bold border-0 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner cursor-pointer"
            >
              <option value="all">جميع الفئات (شقق، فيلات...)</option>
              <option value="apartment">شقة سكنية</option>
              <option value="villa">فيلا مستقلة</option>
              <option value="duplex">دوبلكس</option>
              <option value="penthouse">بنتهاوس</option>
              <option value="townhouse">تاون هاوس</option>
              <option value="office">مكتب إداري</option>
              <option value="land">أرض</option>
            </select>
          </div>

          {/* 3. Price Filter */}
          <div className="sm:col-span-2">
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full py-3 px-3 bg-white text-slate-900 rounded-2xl text-xs sm:text-sm font-bold border-0 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner cursor-pointer"
            >
              <option value="all">الحد الأقصى للسعر</option>
              {transactionType === "rent" ? (
                <>
                  <option value="15000">حتى 15,000 ج.م</option>
                  <option value="30000">حتى 30,000 ج.م</option>
                  <option value="60000">حتى 60,000 ج.م</option>
                  <option value="100000">حتى 100,000 ج.م</option>
                </>
              ) : (
                <>
                  <option value="3000000">حتى 3 مليون ج.م</option>
                  <option value="7000000">حتى 7 مليون ج.م</option>
                  <option value="15000000">حتى 15 مليون ج.م</option>
                  <option value="30000000">حتى 30 مليون ج.م</option>
                </>
              )}
            </select>
          </div>

          {/* 4. Submit CTA */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Compass className="w-4 h-4" />
              <span>بحث بالخريطة</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
