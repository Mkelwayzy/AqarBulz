"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Phone, MessageCircle, Share2, Heart, Building2, ShieldCheck } from "lucide-react";

interface MobilePropertyActionBarProps {
  priceFormatted: string;
  transactionType: "sale" | "rent";
  phone?: string;
  whatsapp?: string;
  title: string;
  propertyId?: string;
  initialFavorited?: boolean;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export default function MobilePropertyActionBar({
  priceFormatted,
  transactionType,
  phone,
  whatsapp,
  title,
  propertyId,
  initialFavorited = false,
  isOwner = false,
  isAdmin = false,
}: MobilePropertyActionBarProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  useEffect(() => {
    const handleFavEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && propertyId && customEvent.detail.propertyId === propertyId) {
        setFavorited(customEvent.detail.isFavorited);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("favorites-updated", handleFavEvent);
      return () => window.removeEventListener("favorites-updated", handleFavEvent);
    }
  }, [propertyId]);

  const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
  const cleanWa = whatsapp ? whatsapp.replace(/[^0-9]/g, "") : cleanPhone;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      alert("تم نسخ رابط العقار للحافظة");
    }
  };

  const handleFavoriteToggle = async () => {
    if (!propertyId || favLoading) return;
    const nextState = !favorited;
    setFavorited(nextState);
    setFavLoading(true);

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      if (res.status === 401) {
        setFavorited(false);
        if (typeof window !== "undefined") {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
      } else if (!res.ok) {
        setFavorited(!nextState);
      } else {
        const data = await res.json();
        if (typeof data.isFavorited === "boolean") {
          setFavorited(data.isFavorited);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("favorites-updated", {
              detail: { propertyId, isFavorited: data.isFavorited },
            })
          );
        }
      }
    } catch {
      setFavorited(!nextState);
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <div className="lg:hidden fixed bottom-[calc(56px+max(0.5rem,env(safe-area-inset-bottom,16px)))] left-0 right-0 z-35 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_15px_rgba(0,0,0,0.08)] px-3 py-2 flex items-center justify-between gap-2.5">
      {/* Price Summary */}
      <div className="flex flex-col text-right">
        <span className="text-[10px] font-bold text-slate-400">
          {transactionType === "sale" ? "السعر الإجمالي" : "الإيجار الشهري"}
        </span>
        <span className="text-xs sm:text-sm font-black text-brand-700 leading-tight">
          {priceFormatted}
        </span>
      </div>

      {/* Instant Action CTA Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {propertyId && (
          <button
            type="button"
            onClick={handleFavoriteToggle}
            className={`p-2 rounded-xl transition-all active:scale-95 ${
              favorited
                ? "bg-rose-50 text-rose-600 border border-rose-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            title={favorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            <Heart className={`w-4 h-4 ${favorited ? "fill-rose-600 text-rose-600" : ""}`} />
          </button>
        )}

        <button
          type="button"
          onClick={handleShare}
          className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
          title="مشاركة"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {isAdmin ? (
          <Link
            href="/admin?tab=projects"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs active:scale-95 transition-all shadow-md"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>رقابة الإدارة</span>
          </Link>
        ) : isOwner ? (
          <Link
            href="/dashboard/properties"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs active:scale-95 transition-all shadow-md shadow-brand-600/25"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>إدارة إعلاني</span>
          </Link>
        ) : (
          <>
            {cleanPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs active:scale-95 transition-all shadow-xs"
              >
                <Phone className="w-3.5 h-3.5 text-brand-300" />
                <span>اتصال</span>
              </a>
            )}

            {cleanWa && (
              <a
                href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                  `مرحباً، أستفسر بخصوص العقار: ${title}\n${typeof window !== "undefined" ? window.location.href : ""}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs active:scale-95 transition-all shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
