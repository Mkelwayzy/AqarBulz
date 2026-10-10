"use client";

import React from "react";
import dynamic from "next/dynamic";
import { PublicProperty } from "@/lib/db/types";
import { MapPin, Loader2 } from "lucide-react";

interface PropertyMapProps {
  properties: PublicProperty[];
  selectedPropertyId?: string | null;
  onSelectProperty?: (property: PublicProperty | null) => void;
  onBoundsChange?: (bounds: {
    southWest: { lat: number; lng: number };
    northEast: { lat: number; lng: number };
  }) => void;
  center?: [number, number];
  zoom?: number;
  autoFitKey?: string | number;
}

const DynamicLeafletMap = dynamic(() => import("./LeafletInnerMap"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-100 rounded-2xl border border-slate-200">
      <div className="flex items-center gap-3 text-brand-700 font-bold mb-2">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        <span>جاري تحميل الخريطة التفاعلية...</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <MapPin className="w-4 h-4 text-brand-500" />
        <span>تحديد المواقع الجغرافية للعقارات بدقة PostGIS</span>
      </div>
    </div>
  ),
});

export default function PropertyMap(props: PropertyMapProps) {
  return <DynamicLeafletMap {...props} />;
}
