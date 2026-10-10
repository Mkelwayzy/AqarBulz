"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { getMapTileConfig } from "@/lib/map/tileConfig";

interface LocationPickerInnerMapProps {
  lat: number;
  lng: number;
  isApproximate?: boolean;
  onLocationChange: (lat: number, lng: number) => void;
  zoom?: number;
}

export default function LocationPickerInnerMap({
  lat,
  lng,
  isApproximate = false,
  onLocationChange,
  zoom = 13,
}: LocationPickerInnerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomleft" }).addTo(map);

    const tileConfig = getMapTileConfig();
    L.tileLayer(tileConfig.tileUrl, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      ...(tileConfig.subdomains ? { subdomains: tileConfig.subdomains } : {}),
    }).addTo(map);

    // Custom Draggable Pin
    const customIcon = L.divIcon({
      className: "location-picker-pin",
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: grab;">
          <div style="background: #0f766e; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); white-space: nowrap; margin-bottom: 2px;">
            📍 موقع العقار
          </div>
          <div style="width: 14px; height: 14px; background: #0f766e; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [80, 42],
      iconAnchor: [40, 42],
    });

    const marker = L.marker([lat, lng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onLocationChange(pos.lat, pos.lng);
    });

    // Map click moves pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onLocationChange(e.latlng.lat, e.latlng.lng);
    });

    // Privacy circle
    const circle = L.circle([lat, lng], {
      radius: 500,
      color: "#d97706",
      fillColor: "#f59e0b",
      fillOpacity: isApproximate ? 0.2 : 0,
      weight: isApproximate ? 1.5 : 0,
      dashArray: "4, 6",
    }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update pin position when lat/lng props change from outside
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const current = markerRef.current.getLatLng();
    if (Math.abs(current.lat - lat) > 0.0001 || Math.abs(current.lng - lng) > 0.0001) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.panTo([lat, lng], { animate: true });
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
      if (isApproximate) {
        circleRef.current.setStyle({
          weight: 1.5,
          fillOpacity: 0.2,
        });
      } else {
        circleRef.current.setStyle({
          weight: 0,
          fillOpacity: 0,
        });
      }
    }
  }, [lat, lng, isApproximate]);

  return (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-slate-200">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm pointer-events-none">
        💡 انقر على الخريطة أو اسحب الدبوس لتحديد الموقع بدقة
      </div>
    </div>
  );
}
