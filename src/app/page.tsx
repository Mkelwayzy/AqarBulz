import React from "react";
import Link from "next/link";
import { dbStore } from "@/lib/db/store";
import { propertyService } from "@/lib/services/propertyService";
import PropertyCard from "@/components/property/PropertyCard";
import HomeHeroSearch from "@/components/home/HomeHeroSearch";
import HomeMapPreview from "@/components/home/HomeMapPreview";
import MobileQuickFilterBar from "@/components/home/MobileQuickFilterBar";
import {
  Compass,
  Search,
  Building2,
  MapPin,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Layers,
  KeyRound,
  Users,
  Home,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cms = dbStore.getCmsHomepageSettings();

  // Query initial published properties for homepage
  const { properties } = await propertyService.queryPublicProperties({
    sort: "newest",
    limit: 12,
  });

  // Prioritize curated featured properties from CMS if set
  let featuredProperties = properties.filter((p) => p.featured);
  if (cms.featuredPropertyIds && cms.featuredPropertyIds.length > 0) {
    const curated = cms.featuredPropertyIds
      .map((id) => properties.find((p) => p.id === id))
      .filter((p): p is typeof properties[0] => !!p);
    if (curated.length > 0) {
      featuredProperties = curated;
    }
  }

  const recentProperties = properties.slice(0, 6);
  const districts = dbStore.getDistricts();

  const isVisible = (secKey: string) => cms.sectionVisibility?.[secKey] !== false;

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* 1. Hero Section */}
      {isVisible("hero") && (
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-16 lg:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-brand-400 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>{cms.heroBadgeText}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-snug">
              {cms.heroTitleLine1} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-teal-300 to-amber-300">
                {cms.heroTitleLine2}
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              {cms.heroDescription}
            </p>

            {/* Quick Hero Search Box with Rich Multi-Filter */}
            <HomeHeroSearch />

            {/* Mobile Instant Target Fast-Filter Strip */}
            <MobileQuickFilterBar />

          {/* Fast Filters Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-semibold text-slate-300">
            <span className="text-slate-400">وجهات سريعة:</span>
            <Link href="/explore?districtId=dist-new-cairo" className="px-3 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700 hover:text-white transition-colors">
              التجمع الخامس
            </Link>
            <Link href="/explore?districtId=dist-sheikh-zayed" className="px-3 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700 hover:text-white transition-colors">
              الشيخ زايد
            </Link>
            <Link href="/explore?districtId=dist-r7-new-capital" className="px-3 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700 hover:text-white transition-colors">
              العاصمة الإدارية
            </Link>
            <Link href="/explore?districtId=dist-maadi" className="px-3 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700 hover:text-white transition-colors">
              المعادي
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* 2. Interactive Map Entry Banner */}
      {isVisible("map_banner") && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-teal-900 text-white p-6 sm:p-10 shadow-xl border border-brand-700">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-xl space-y-4 text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/30 text-brand-200 text-xs font-bold border border-brand-400/20">
                  <Compass className="w-4 h-4 text-teal-300" />
                  <span>ميزة المنتج الأساسية</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {cms.bannerTitle}
                </h2>
                <p className="text-xs sm:text-sm text-brand-100 font-medium leading-relaxed">
                  {cms.bannerSubtitle}
                </p>
                <div className="pt-2">
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-brand-900 font-black text-xs sm:text-sm shadow-xl hover:bg-brand-50 transition-all hover:scale-105 active:scale-95"
                  >
                    <span>{cms.bannerCtaText}</span>
                    <ArrowLeft className="w-4 h-4 text-brand-700" />
                  </Link>
                </div>
              </div>

              {/* Service Icon Representation */}
              <div className="shrink-0 flex items-center justify-center">
                <HomeMapPreview />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Property Categories Grid */}
      {isVisible("categories") && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                تصفح حسب تصنيف العقار
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                خيارات متنوعة تلبي كافة الاحتياجات السكنية والتجارية
              </p>
            </div>
            <Link
              href="/properties"
              className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
            >
              <span>عرض الكل</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { key: "apartment", label: "شقق سكنية", count: "340+ عقار", icon: Building2 },
              { key: "villa", label: "فيلات مستقلة", count: "120+ فيلا", icon: Home },
              { key: "penthouse", label: "بنتهاوس", count: "45+ بنتهاوس", icon: Sparkles },
              { key: "duplex", label: "دوبلكس بحديقة", count: "80+ دوبلكس", icon: Layers },
              { key: "townhouse", label: "تاون هاوس", count: "95+ تاون", icon: Building2 },
              { key: "office", label: "مقرات إدارية", count: "60+ مقر", icon: KeyRound },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.key}
                  href={`/explore?category=${cat.key}`}
                  className="group flex flex-col p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-brand-500 hover:shadow-md transition-all text-center items-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 mb-0.5">
                    {cat.label}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {cat.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Featured Listings */}
      {isVisible("featured") && featuredProperties.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  عقارات مميزة وموثقة
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                مختارة بعناية بتشطيبات راقية ومواقع استراتيجية في مصر
              </p>
            </div>
            <Link
              href="/properties?featuredOnly=true"
              className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
            >
              <span>مشاهدة المزيد</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Recently Added Inventory */}
      {isVisible("recent") && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                أحدث العقارات المضافة
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                عقارات معتمدة حديثة مع إحداثيات جغرافية دقيقة
              </p>
            </div>
            <Link
              href="/properties?sort=newest"
              className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
            >
              <span>كل العقارات المتاحة</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Why AqarPulse Section */}
      {isVisible("features") && (
        <section className="bg-white border-y border-slate-200/80 py-16 px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-extrabold text-brand-700 uppercase tracking-wider">
                معايير الجودة والشفافية
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                لماذا يفضل الباحثون والملاك منصة نبض العقار؟
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                حلول تقنية وهندسية متقدمة تعالج تشوش السوق العقاري المصري
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                  <Compass className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  محرك بحث جغرافي حقيقي (PostGIS)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  لا نعتمد على قوائم نصية عشوائية. كل عقار مرتبط بنقطة جغرافية فعلية تمكنك من البحث داخل حدود بصرية، أو نصف قطر معين حول عملك ومدرستك.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  حماية خصوصية الموقع (Privacy Radius)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  يختار المالك إذا ما كان يرغب في إظهار العنوان بالضبط أو حمايته في دائرة تقريبية 500م، مع ضمان عدم تسريب الإحداثيات الدقيقة عبر واجهات الـ API.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  منع الإعلانات المكررة وتدقيق الوسطاء
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  خوارزمية ذكية تقارن الموقع الجغرافي والمواصفات والأسعار لرصد الإعلانات المكررة الوهمية، وإبراز الوسطاء المرخصين رسمياً.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
