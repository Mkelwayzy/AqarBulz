import React from "react";
import { notFound } from "next/navigation";
import { dbStore } from "@/lib/db/store";
import { propertyService } from "@/lib/services/propertyService";
import { getCurrentUser } from "@/lib/auth/session";
import PropertyMap from "@/components/map/PropertyMap";
import PropertyCard from "@/components/property/PropertyCard";
import InquiryForm from "./InquiryForm";
import ReportPropertyButton from "@/components/property/ReportPropertyButton";
import SmartPropertySuite from "@/components/property/SmartPropertySuite";
import MobilePropertyActionBar from "@/components/property/MobilePropertyActionBar";
import Link from "next/link";
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  Layers,
  Sparkles,
  Phone,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Share2,
  Heart,
  Car,
  Compass,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PropertyDetailsProps {
  params: {
    slug: string;
  };
}

export default async function PropertyDetailsPage({ params }: PropertyDetailsProps) {
  const viewer = await getCurrentUser();
  const property = await propertyService.getPublicPropertyBySlugOrId(params.slug, viewer);

  if (!property) {
    notFound();
  }

  // Query similar properties in same district or category
  const { properties: similarProps } = await propertyService.queryPublicProperties({
    districtId: property.districtId,
    transactionType: property.transactionType,
    limit: 3,
  });

  const filteredSimilar = similarProps.filter((p) => p.id !== property.id);

  const isSale = property.transactionType === "sale";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8 space-y-8 relative">
      {/* 1. Header & Title Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                isSale ? "bg-brand-600" : "bg-blue-600"
              }`}
            >
              {isSale ? "للبيع" : "للإيجار"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
              {property.category}
            </span>
            {/* TruCheck™ Verification Badge (Property Finder & Bayut) */}
            <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>موثق TruCheck™ (سند الملكية ومطابقة المعاينة)</span>
            </span>
            {property.isApproximateLocation ? (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                موقع تقريبي لحماية الخصوصية (نطاق 500م)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                موقع دقيق ومؤكد على الخريطة
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 leading-tight">
            {property.title}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
            <span>{property.addressDetails}</span>
          </div>
          <div className="mt-3">
            <ReportPropertyButton propertyId={property.id} propertyTitle={property.title} />
          </div>
        </div>

        {/* Price Box */}
        <div className="flex flex-col items-start md:items-end bg-brand-50/60 p-4 rounded-2xl border border-brand-100 min-w-[200px]">
          <span className="text-xs text-slate-500 font-bold">السعر المطلوب</span>
          <div className="text-2xl sm:text-3xl font-black text-brand-800">
            {property.price.toLocaleString("ar-EG")} <span className="text-sm">ج.م</span>
            {property.rentalPeriod && <span className="text-xs text-slate-500"> / شهرياً</span>}
          </div>
          {property.downPayment && (
            <div className="text-[11px] text-brand-700 font-semibold mt-1">
              مقدم: {property.downPayment.toLocaleString("ar-EG")} ج.م • تقسيط على {property.installmentYears} سنوات
            </div>
          )}
          {/* Instant 48h freeze tag */}
          <div className="mt-2 w-full pt-2 border-t border-brand-200/60">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-600 text-white flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>متاح للتجميد الفوري 48س عبر المنصة</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Photo Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-3xl overflow-hidden max-h-[480px]">
        {/* Main Big Photo */}
        <div className="md:col-span-2 md:row-span-2 relative aspect-[16/10] md:aspect-auto overflow-hidden bg-slate-100">
          <img
            src={property.images[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80"}
            alt={property.title}
            className="w-full h-full object-cover hover:scale-102 transition-transform duration-500"
          />
        </div>
        {/* Smaller Photos */}
        {property.images.slice(1, 5).map((img, i) => (
          <div key={i} className="relative aspect-[16/10] overflow-hidden bg-slate-100 hidden md:block">
            <img
              src={img}
              alt={`صورة ${i + 2}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>

      {/* 3. Main Body & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Details & Map */}
        <div className="lg:col-span-2 space-y-8">
          {/* Specifications Strip */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">المواصفات الفنية للعقار</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1">المساحة الإجمالية</span>
                <span className="text-sm font-extrabold text-slate-800">{property.areaSqM} م²</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1">غرف النوم</span>
                <span className="text-sm font-extrabold text-slate-800">{property.bedrooms || "-"} غرف</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1">الحمامات</span>
                <span className="text-sm font-extrabold text-slate-800">{property.bathrooms || "-"} حمام</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1">الدور</span>
                <span className="text-sm font-extrabold text-slate-800">{property.floor ? `الدور ${property.floor}` : "أرضي"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-2">
              <div>
                <span className="text-slate-400 block mb-0.5">مستوى التشطيب</span>
                <span className="font-bold text-slate-800">{getFinishingLabel(property.finishingStatus)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">الفرش</span>
                <span className="font-bold text-slate-800">{getFurnishingLabel(property.furnishingStatus)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">أماكن السيارات</span>
                <span className="font-bold text-slate-800">{property.parkingSpots || 0} سيارة</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-base font-extrabold text-slate-900">وصف العقار والموقع</h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
              {property.description}
            </p>
          </div>

          {/* Smart Property Suite (30 Smart Features Engine) */}
          <SmartPropertySuite property={property} />

          {/* Location & Map Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  الموقع الجغرافي على الخريطة
                </h3>
                <p className="text-xs text-slate-500">
                  {property.isApproximateLocation
                    ? "نطاق تقريبي دائري لحماية خصوصية المالك، لن تُفصح الإحداثيات الدقيقة للعامة."
                    : "موقع دقيق ومؤكد على الخريطة التفاعلية."}
                </p>
              </div>
            </div>

            <div className="w-full h-72 rounded-2xl overflow-hidden border border-slate-200">
              <PropertyMap
                properties={[property]}
                selectedPropertyId={property.id}
                center={[property.lat, property.lng]}
                zoom={14}
              />
            </div>
          </div>
        </div>

        {/* Right Col: Advertiser Card & Inquiry Form */}
        <div className="space-y-6">
          {/* Advertiser Profile Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-800 font-extrabold flex items-center justify-center text-lg">
                {property.advertiser.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 text-sm">{property.advertiser.name}</span>
                  {property.advertiser.isVerified && (
                    <span title="معلن موثق">
                      <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                    <span>SuperAgent™</span>
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {property.advertiser.role === "broker" ? "وسيط عقاري معتمد" : "مالك العقار مباشرة"}
                </span>
                {property.advertiser.companyName && (
                  <span className="text-xs text-brand-700 font-semibold block">
                    {property.advertiser.companyName}
                  </span>
                )}
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-1">
                  <span className="text-emerald-700">⚡ رد سريع: &lt; 10 دقائق</span>
                  <span>•</span>
                  <span className="text-slate-600">🏆 100% عقارات موثقة</span>
                </div>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {property.advertiser.phone && (
                <a
                  href={`tel:${property.advertiser.phone}`}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>اتصال هاتفي</span>
                </a>
              )}
              {property.advertiser.whatsapp && (
                <a
                  href={`https://wa.me/${property.advertiser.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>محادثة واتساب</span>
                </a>
              )}
            </div>
          </div>

          {/* Lead Inquiry Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h4 className="text-sm font-extrabold text-slate-900 mb-1">
              طلب معاينة أو استفسار
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              أرسل بياناتك مباشرة للمعلن وسيتم التواصل معك خلال وقت قصير.
            </p>
            <InquiryForm propertyId={property.id} propertyTitle={property.title} />
          </div>
        </div>
      </div>

      {/* 4. Similar Properties */}
      {filteredSimilar.length > 0 && (
        <div className="pt-8 border-t border-slate-200 space-y-4">
          <h3 className="text-xl font-black text-slate-900">
            عقارات مشابهة في نفس المنطقة
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSimilar.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      )}

      {/* Sticky Mobile Direct Action Bar (Call, WhatsApp, Share) */}
      <MobilePropertyActionBar
        priceFormatted={`${property.price.toLocaleString("ar-EG")} ج.م${property.rentalPeriod ? " / شهرياً" : ""}`}
        transactionType={property.transactionType}
        phone={property.advertiser.phone}
        whatsapp={property.advertiser.whatsapp}
        title={property.title}
      />
    </div>
  );
}

function getFinishingLabel(status?: string): string {
  switch (status) {
    case "ultra_lux":
      return "ألترا سوبر لوكس";
    case "fully_finished":
      return "تشطيب كامل (سوبر لوكس)";
    case "semi_finished":
      return "نصف تشطيب (محارة وحلوق)";
    case "core_and_shell":
      return "طوب أحمر (Core & Shell)";
    default:
      return "غير محدد";
  }
}

function getFurnishingLabel(status?: string): string {
  switch (status) {
    case "furnished":
      return "مفروش بالكامل";
    case "semi_furnished":
      return "مفروش جزئياً";
    case "unfurnished":
      return "غير مفروش";
    default:
      return "غير محدد";
  }
}
