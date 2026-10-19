"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PropertyImageGalleryProps {
  images: string[];
  title: string;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80";

export default function PropertyImageGallery({ images, title }: PropertyImageGalleryProps) {
  const galleryImages = (images.length > 0 ? images : [FALLBACK_IMAGE]).slice(0, 10);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const showPrevious = () => {
    setActiveIndex((index) => (index - 1 + galleryImages.length) % galleryImages.length);
  };
  const showNext = () => {
    setActiveIndex((index) => (index + 1) % galleryImages.length);
  };

  return (
    <section className="space-y-2" aria-label="صور العقار">
      <div
        className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100 sm:aspect-[16/8]"
        onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
        onTouchEnd={(event) => {
          if (touchStartX === null) return;
          const deltaX = event.changedTouches[0].clientX - touchStartX;
          if (Math.abs(deltaX) > 45) {
            if (deltaX > 0) showPrevious();
            else showNext();
          }
          setTouchStartX(null);
        }}
      >
        <img
          src={galleryImages[activeIndex]}
          alt={`${title} - صورة ${activeIndex + 1}`}
          className="h-full w-full object-cover"
          draggable={false}
        />
        {galleryImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="الصورة السابقة"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="الصورة التالية"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold text-white">
              {activeIndex + 1} / {galleryImages.length}
            </span>
          </>
        )}
      </div>

      {galleryImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar md:grid md:grid-cols-5 md:overflow-visible">
          {galleryImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`عرض الصورة ${index + 1}`}
              aria-pressed={activeIndex === index}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition md:h-20 md:w-full ${
                activeIndex === index ? "border-emerald-600" : "border-transparent opacity-75 hover:opacity-100"
              }`}
            >
              <img src={image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
