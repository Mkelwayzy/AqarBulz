"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Compass, Navigation, ShieldCheck, Layers } from "lucide-react";

export default function HomeMapPreview() {
  const samplePins = [
    {
      title: "التجمع الخامس",
      type: "شقة 180م²",
      price: "6.5M ج.م",
      top: "28%",
      left: "62%",
      color: "bg-emerald-500",
      districtId: "dist-new-cairo",
    },
    {
      title: "الشيخ زايد",
      type: "فيلا مستقلة",
      price: "14.2M ج.م",
      top: "45%",
      left: "22%",
      color: "bg-teal-400",
      districtId: "dist-sheikh-zayed",
    },
    {
      title: "المعادي (دجلة)",
      type: "شقة فاخرة",
      price: "35K ج.م/شهر",
      top: "65%",
      left: "50%",
      color: "bg-amber-400",
      districtId: "dist-maadi",
    },
    {
      title: "العاصمة الإدارية",
      type: "مقر إداري",
      price: "4.8M ج.م",
      top: "38%",
      left: "82%",
      color: "bg-sky-400",
      districtId: "dist-r7-new-capital",
    },
  ];

  return (
    <div className="relative w-full h-full min-h-[320px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl group select-none">
      {/* Background Cartographic Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
      
      {/* Stylized River Nile & Road Network Curves (Vector SVG) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
      >
        {/* River Nile line */}
        <path
          d="M 180 300 Q 170 200 185 140 T 210 0"
          fill="none"
          stroke="#0284c7"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Ring Road and Major Arterials */}
        <ellipse
          cx="200"
          cy="150"
          rx="110"
          ry="80"
          fill="none"
          stroke="#475569"
          strokeWidth="2.5"
          strokeDasharray="4 4"
        />
        <path
          d="M 50 150 L 350 150"
          fill="none"
          stroke="#334155"
          strokeWidth="2"
        />
        <path
          d="M 200 30 L 370 120"
          fill="none"
          stroke="#334155"
          strokeWidth="2"
        />
      </svg>

      {/* Radial Glow Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

      {/* Floating GPS / Compass Badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-emerald-400 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>PostGIS • Cairo Live</span>
      </div>

      <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-slate-300 backdrop-blur-md">
        <Layers className="w-3 h-3 text-brand-400" />
        <span>طبقة الخريطة الذكية</span>
      </div>

      {/* Interactive Pulsing Map Markers */}
      {samplePins.map((pin, i) => (
        <Link
          key={i}
          href={`/explore?districtId=${pin.districtId}`}
          style={{ top: pin.top, left: pin.left }}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer"
        >
          {/* Sonar Pulsing Ring (AqarPulse "نبض العقار" effect) */}
          <span
            className={`absolute -inset-2 rounded-full ${pin.color} opacity-40 animate-ping pointer-events-none`}
          />

          {/* Marker Dot */}
          <div className="relative flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/95 border border-white/20 text-white shadow-xl backdrop-blur-md group-hover/pin:scale-110 group-hover/pin:border-brand-400 transition-transform">
            <span className={`w-2 h-2 rounded-full ${pin.color} shrink-0`} />
            <span className="text-[10px] font-extrabold tracking-tight whitespace-nowrap">
              {pin.price}
            </span>
          </div>

          {/* Hover Tooltip Box */}
          <div className="hidden group-hover/pin:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 text-white text-[10px] rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap z-30 pointer-events-none text-center">
            <span className="font-bold text-brand-300 block">{pin.title}</span>
            <span className="text-slate-400 text-[9px]">{pin.type}</span>
          </div>
        </Link>
      ))}

      {/* Bottom Floating Explorer Prompt */}
      <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-xs">
        <div className="flex items-center gap-2 text-slate-300 text-[11px] font-medium">
          <Compass className="w-3.5 h-3.5 text-brand-400 animate-spin-slow" />
          <span>انقر على أي مؤشر أو افتح الخريطة الكاملة</span>
        </div>
        <Link
          href="/explore"
          className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] transition-colors"
        >
          عرض الخريطة &larr;
        </Link>
      </div>
    </div>
  );
}
