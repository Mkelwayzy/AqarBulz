"use client";

import React, { useState, useEffect } from "react";
import PropertyCard from "@/components/property/PropertyCard";
import { SmartMatchResult, District } from "@/lib/db/types";
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  HelpCircle,
} from "lucide-react";

export default function SmartMatchPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [results, setResults] = useState<SmartMatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [form, setForm] = useState({
    transactionType: "sale",
    preferredDistrictId: "dist-new-cairo",
    maxBudget: "10000000",
    minArea: "150",
    requiredBedrooms: "3",
    category: "apartment",
  });

  useEffect(() => {
    fetch("/api/taxonomy")
      .then((res) => res.json())
      .then((data) => {
        if (data.districts) setDistricts(data.districts);
      })
      .catch((err) => console.error(err));

    // Run initial match
    handleRunMatch();
  }, []);

  const handleRunMatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch("/api/properties/smart-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: form.transactionType,
          preferredDistrictId: form.preferredDistrictId,
          maxBudget: form.maxBudget ? Number(form.maxBudget) : undefined,
          minArea: form.minArea ? Number(form.minArea) : undefined,
          requiredBedrooms: form.requiredBedrooms ? Number(form.requiredBedrooms) : undefined,
          category: form.category,
        }),
      });

      const data = await res.json();
      if (data.matches) {
        setResults(data.matches);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>محرك التوافق العقاري الحسابي الشفاف</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          التوافق الذكي بين طلبك والعقارات المتاحة
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          حدد متطلباتك الدقيقة وميزانيتك، وسيقوم النظام باحتساب نسبة التوافق (Relevance Score) وشرح أسباب الترشيح بشفافية تامة دون تحيز إعلاني.
        </p>
      </div>

      {/* Criteria Card */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
        <form onSubmit={handleRunMatch} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">نوع المعاملة</label>
              <select
                value={form.transactionType}
                onChange={(e) => setForm({ ...form, transactionType: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="sale">شراء (للبيع)</option>
                <option value="rent">إيجار</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">نوع العقار</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="apartment">شقة</option>
                <option value="villa">فيلا مستقلة</option>
                <option value="duplex">دوبلكس</option>
                <option value="penthouse">بنتهاوس</option>
                <option value="townhouse">تاون هاوس</option>
                <option value="office">مكتب إداري</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">المنطقة المفضلة</label>
              <select
                value={form.preferredDistrictId}
                onChange={(e) => setForm({ ...form, preferredDistrictId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                الحد الأقصى للميزانية (ج.م)
              </label>
              <input
                type="number"
                value={form.maxBudget}
                onChange={(e) => setForm({ ...form, maxBudget: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الحد الأدنى للمساحة (م²)</label>
              <input
                type="number"
                value={form.minArea}
                onChange={(e) => setForm({ ...form, minArea: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">عدد غرف النوم المطلوبة</label>
              <input
                type="number"
                value={form.requiredBedrooms}
                onChange={(e) => setForm({ ...form, requiredBedrooms: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-lg shadow-brand-600/25 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري حساب التوافق...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>احسب أفضل العقارات المتوافقة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-xl font-black text-slate-900">
            العقارات الأعلى توافقاً مع طلبك ({results.length})
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            مرتبة حسب درجة التوافق من 100%
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <span className="text-xs font-bold">جاري مراجعة الشروط والميزانيات...</span>
          </div>
        ) : results.length === 0 && hasSearched ? (
          <div className="py-16 bg-white rounded-3xl border border-slate-200 text-center p-6 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">لا توجد عقارات تحقق شروط الميزانية الصارمة</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              جرب زيادة سقف الميزانية قليلاً أو اختيار منطقة سكنية أخرى للحصول على ترشيحات مناسبة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((match) => (
              <div key={match.property.id} className="flex flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Score Banner Header */}
                <div className="p-3 bg-gradient-to-r from-amber-50 to-emerald-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-black text-slate-900">
                      نسبة التوافق: {match.score}%
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    تطابق ممتاز
                  </span>
                </div>

                {/* Match Explanations Badges */}
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap gap-1.5">
                  {match.matchedCriteria.map((crit, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80"
                    >
                      <CheckCircle2 className="w-3 h-3 text-brand-600 shrink-0" />
                      {crit}
                    </span>
                  ))}
                </div>

                {/* Property Card */}
                <div className="flex-1">
                  <PropertyCard property={match.property} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
