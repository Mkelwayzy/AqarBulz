"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PublicProperty } from "@/lib/db/types";
import {
  Heart,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Phone,
  MessageCircle,
} from "lucide-react";

interface PropertyCardProps {
  property: PublicProperty;
  isSelected?: boolean;
  onHover?: (property: PublicProperty | null) => void;
  onClick?: (property: PublicProperty) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (propertyId: string) => void;
}

const CATEGORY_NAMES_AR: Record<string, string> = {
  apartment: "شقة",
  house: "بيت / منزل",
  villa: "فيلا مستقلة",
  townhouse: "تاون هاوس",
  twin_house: "توين هاوس",
  duplex: "دوبلكس",
  penthouse: "بنتهاوس",
  chalet: "شاليه",
  studio: "ستوديو",
  office: "مكتب إداري",
  commercial_retail: "محل تجاري",
  clinic: "عيادة طبية",
  land: "أرض",
};

export default function PropertyCard({
  property,
  isSelected = false,
  onHover,
  onClick,
  isFavorited = false,
  onToggleFavorite,
}: PropertyCardProps) {
  const [favorited, setFavorited] = useState(isFavorited);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorited(!favorited);
    if (onToggleFavorite) {
      onToggleFavorite(property.id);
    }
  };

  const isSale = property.transactionType === "sale";
  const categoryLabel = CATEGORY_NAMES_AR[property.category] || property.category;

  return (
    <div
      onClick={() => onClick && onClick(property)}
      onMouseEnter={() => onHover && onHover(property)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`group relative flex flex-col bg-white rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
        isSelected
          ? "border-amber-500 shadow-xl ring-2 ring-amber-400/40 -translate-y-1"
          : "border-slate-200 hover:border-brand-500 hover:shadow-lg hover:-translate-y-0.5"
      }`}
    >
      {/* Property Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={property.images[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-3 right-3 left-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                isSale ? "bg-brand-600" : "bg-blue-600"
              }`}
            >
              {isSale ? "للبيع" : "للإيجار"}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900/70 text-slate-100 backdrop-blur-sm shadow-sm">
              {categoryLabel}
            </span>
            {property.featured && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-sm">
                <Sparkles className="w-3 h-3" />
                مميز
              </span>
            )}
          </div>

          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            className="pointer-events-auto p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-rose-600 shadow-md backdrop-blur-sm transition-all active:scale-90"
            title={favorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                favorited ? "fill-rose-600 text-rose-600" : "text-slate-700"
              }`}
            />
          </button>
        </div>

        {/* Bottom Price in Image */}
        <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between text-white">
          <div>
            <div className="text-xl font-extrabold tracking-tight drop-shadow-md">
              {property.price.toLocaleString("ar-EG")} <span className="text-sm font-bold text-brand-200">ج.م</span>
              {property.rentalPeriod && (
                <span className="text-xs font-medium text-slate-300"> / شهرياً</span>
              )}
            </div>
            {property.downPayment && (
              <div className="text-[11px] text-slate-200 font-medium">
                مقدم: {property.downPayment.toLocaleString("ar-EG")} ج.م • تقسيط {property.installmentYears} سنوات
              </div>
            )}
          </div>

          {/* Location Privacy Indicator */}
          {property.isApproximateLocation && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/90 text-slate-950 backdrop-blur-xs">
              موقع تقريبي
            </span>
          )}
        </div>
      </div>

      {/* Property Details Body */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <Link
          href={`/properties/${property.slug}`}
          className="text-base font-bold text-slate-900 line-clamp-1 hover:text-brand-700 transition-colors mb-1.5"
        >
          {property.title}
        </Link>

        {/* Address */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 line-clamp-1">
          <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span>{property.addressDetails || "القاهرة، مصر"}</span>
        </div>

        {/* Specifications Strip */}
        <div className="flex items-center gap-4 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium mb-3">
          <div className="flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{property.areaSqM} م²</span>
          </div>
          {property.bedrooms !== undefined && (
            <div className="flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-slate-400" />
              <span>{property.bedrooms} غرف</span>
            </div>
          )}
          {property.bathrooms !== undefined && (
            <div className="flex items-center gap-1.5">
              <Bath className="w-3.5 h-3.5 text-slate-400" />
              <span>{property.bathrooms} حمام</span>
            </div>
          )}
        </div>

        {/* Advertiser Footer */}
        <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-[10px]">
              {property.advertiser.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 line-clamp-1">
                {property.advertiser.name}
              </span>
              <span className="text-[10px] text-slate-400">
                {property.advertiser.role === "broker" ? "وسيط عقاري" : "المالك مباشرة"}
              </span>
            </div>
            {property.advertiser.isVerified && (
              <span title="معلن موثق">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              </span>
            )}
          </div>

          <Link
            href={`/properties/${property.slug}`}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-600 hover:text-white text-slate-700 font-bold text-xs transition-colors"
          >
            التفاصيل
          </Link>
        </div>
      </div>
    </div>
  );
}
