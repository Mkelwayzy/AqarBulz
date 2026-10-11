"use client";

import React from "react";
import { Phone, MessageCircle, Share2, Heart } from "lucide-react";

interface MobilePropertyActionBarProps {
  priceFormatted: string;
  transactionType: "sale" | "rent";
  phone?: string;
  whatsapp?: string;
  title: string;
}

export default function MobilePropertyActionBar({
  priceFormatted,
  transactionType,
  phone,
  whatsapp,
  title,
}: MobilePropertyActionBarProps) {
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

  return (
    <div className="lg:hidden fixed bottom-[58px] left-0 right-0 z-35 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_15px_rgba(0,0,0,0.08)] px-3 py-2 flex items-center justify-between gap-2.5">
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
        <button
          type="button"
          onClick={handleShare}
          className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
          title="مشاركة"
        >
          <Share2 className="w-4 h-4" />
        </button>

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
      </div>
    </div>
  );
}
