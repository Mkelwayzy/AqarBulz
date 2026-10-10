"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CompoundMasterplan } from "@/lib/types/smartFeatures";
import {
  Sparkles,
  Building2,
  Calendar,
  Layers,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function CompoundsMasterplansPage() {
  const [compounds, setCompounds] = useState<CompoundMasterplan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompound, setSelectedCompound] = useState<CompoundMasterplan | null>(null);

  useEffect(() => {
    fetchCompounds();
  }, []);

  const fetchCompounds = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/smart-features/compounds");
      const data = await res.json();
      if (data.compounds) {
        setCompounds(data.compounds);
        setSelectedCompound(data.compounds[0] || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            الميزة رقم 27: مخططات الكمبوندات التفاعلية (Masterplans)
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">بوابة كبرى المشاريع العقارية والكمبوندات</h1>
        <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
          استكشف المخططات العامة المعتمدة (Masterplans) لأكبر المطورين في مصر: بالم هيلز، أورا، ومصر إيطاليا مع مواعيد التسليم وخطط التقسيط.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs text-slate-500">جاري تحميل مخططات الكمبوندات...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Selected Compound Spotlight */}
          {selectedCompound && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="relative aspect-[16/10] lg:aspect-auto h-full min-h-[360px] bg-slate-100">
                <img
                  src={selectedCompound.coverImage}
                  alt={selectedCompound.nameAr}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-white text-xs font-black border border-slate-700">
                  {selectedCompound.developerNameAr}
                </div>
              </div>

              <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{selectedCompound.districtNameAr}</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedCompound.nameAr}</h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {selectedCompound.descriptionAr}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block mb-0.5">المساحة الإجمالية</span>
                      <strong className="text-slate-900 font-bold">{selectedCompound.totalAreaFeddan} فدان</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block mb-0.5">سنة الاستلام</span>
                      <strong className="text-slate-900 font-bold">{selectedCompound.deliveryYear}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block mb-0.5">أقصى تقسيط</span>
                      <strong className="text-indigo-700 font-bold">{selectedCompound.installmentYearsMax} سنوات</strong>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-500 block mb-2">أبرز الخدمات والمرافق:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCompound.amenities.map((am, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold">
                          ✓ {am}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-150">
                  <div>
                    <span className="text-xs text-slate-400 block">تبدأ الأسعار من</span>
                    <strong className="text-xl font-black text-slate-900 font-mono">
                      {selectedCompound.startingPrice.toLocaleString("ar-EG")} ج.م
                    </strong>
                  </div>
                  <Link
                    href={`/properties?searchQuery=${encodeURIComponent(selectedCompound.nameAr)}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-colors"
                  >
                    <span>استعراض الوحدات المتاحة ({selectedCompound.availableUnitsCount})</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Other Compounds Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-900">جميع الكمبوندات والمشروعات</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {compounds.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompound(comp)}
                  className={`bg-white rounded-3xl overflow-hidden border transition-all cursor-pointer shadow-xs ${
                    selectedCompound?.id === comp.id
                      ? "border-indigo-600 ring-2 ring-indigo-600/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="relative aspect-[16/10] bg-slate-100">
                    <img src={comp.coverImage} alt={comp.nameAr} className="w-full h-full object-cover" />
                    <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-bold">
                      {comp.deliveryYear}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <h4 className="font-black text-slate-900 text-base">{comp.nameAr}</h4>
                    <span className="text-xs text-slate-500 block">{comp.districtNameAr}</span>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="font-black text-indigo-700">
                        {comp.startingPrice.toLocaleString("ar-EG")} ج.م
                      </span>
                      <span className="text-slate-500 font-bold">{comp.installmentYearsMax} سنوات تقسيط</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
