"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CompoundMasterplan } from "@/lib/types/smartFeatures";
import {
  Building2,
  Calendar,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Search,
  ChevronLeft,
  Sparkles,
  Layers,
  Home,
  Tag,
  Building,
} from "lucide-react";

export default function ProjectsShowcasePage() {
  const [compounds, setCompounds] = useState<CompoundMasterplan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "villas" | "apartments" | "floors">("all");

  useEffect(() => {
    fetch("/api/smart-features/compounds")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.compounds) {
          setCompounds(data.compounds);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 font-sans" dir="rtl">
      {/* 1. Header (Image 3 Style) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <Link href="/" className="p-1 text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-black text-slate-900 tracking-tight">المشاريع العقارية</h1>
        <div className="w-5" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs text-slate-500 font-bold">جاري تحميل المشاريع العقارية...</span>
        </div>
      ) : (
        <div className="space-y-6 pt-3 px-4 max-w-lg mx-auto">
          {/* 2. مشاريع مميزة (Featured Projects Carousel) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">مشاريع مميزة</h2>
              <span className="text-xs font-bold text-emerald-700">عرض الكل</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              {compounds.map((comp) => (
                <div
                  key={comp.id}
                  className="w-72 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="relative h-40 bg-slate-200 overflow-hidden">
                    <img
                      src={comp.coverImage}
                      alt={comp.nameAr}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                      متاح للبيع
                    </div>
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-900/80 text-white backdrop-blur-xs">
                      استلام {comp.deliveryYear}
                    </div>
                  </div>

                  <div className="p-3 space-y-1.5 text-right">
                    <div className="text-xs font-bold text-slate-500 truncate">{comp.developerNameAr}</div>
                    <h3 className="text-sm font-black text-slate-900 truncate">{comp.nameAr}</h3>
                    <div className="text-sm font-black text-emerald-700">
                      يبدأ من {(comp.startingPrice / 1000000).toFixed(1)} مليون ج.م
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold truncate pt-1 border-t border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{comp.districtNameAr}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. استكشف المدن والمناطق (Explore Regions) */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900">استكشف المناطق</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: "دقادوس", count: "12 مشروع", img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=300&q=80" },
                { name: "وسط ميت غمر", count: "8 مشاريع", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80" },
                { name: "تفهنا الأشراف", count: "6 مشاريع", img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&q=80" },
              ].map((reg) => (
                <div
                  key={reg.name}
                  className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-xs group cursor-pointer"
                >
                  <img src={reg.img} alt={reg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-2 text-white text-right">
                    <span className="text-xs font-black leading-tight">{reg.name}</span>
                    <span className="text-[10px] text-slate-300 font-bold">{reg.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. الشركات العقارية (Developers Logos) */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900">الشركات العقارية المعتمدة</h2>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {[
                { name: "الدلتا للتطوير", bg: "bg-blue-900 text-sky-300" },
                { name: "الهدى للاستثمار", bg: "bg-emerald-900 text-emerald-300" },
                { name: "النيل العقارية", bg: "bg-amber-900 text-amber-300" },
                { name: "مصر الدلتا", bg: "bg-indigo-900 text-indigo-300" },
              ].map((co) => (
                <div
                  key={co.name}
                  className={`px-4 py-3 rounded-2xl ${co.bg} font-black text-xs shrink-0 shadow-sm flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>{co.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. كل المشاريع (All Projects List) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">كل المشاريع</h2>
              <span className="text-xs font-bold text-slate-400">{compounds.length} مشروع</span>
            </div>

            <div className="space-y-3">
              {compounds.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="relative h-44 bg-slate-200 overflow-hidden">
                    <img
                      src={comp.coverImage}
                      alt={comp.nameAr}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                      متاح للحجز
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2 text-right">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">{comp.nameAr}</h3>
                      <span className="text-sm font-black text-emerald-700">
                        يبدأ من {(comp.startingPrice / 1000000).toFixed(1)} مليون
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {comp.descriptionAr}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{comp.districtNameAr}</span>
                      </span>
                      <span className="text-emerald-700">تقسيط حتى {comp.installmentYearsMax} سنوات</span>
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
