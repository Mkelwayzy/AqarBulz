"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { PublicProperty } from "@/lib/db/types";
import { getMapTileConfig } from "@/lib/map/tileConfig";
import Link from "next/link";
import { Eye, MapPin, Bed, Bath, Maximize2, ShieldCheck, CheckCircle } from "lucide-react";

interface LeafletInnerMapProps {
  properties: PublicProperty[];
  selectedPropertyId?: string | null;
  onSelectProperty?: (property: PublicProperty | null) => void;
  onBoundsChange?: (bounds: {
    southWest: { lat: number; lng: number };
    northEast: { lat: number; lng: number };
  }) => void;
  center?: [number, number];
  zoom?: number;
}

export default function LeafletInnerMap({
  properties,
  selectedPropertyId,
  onSelectProperty,
  onBoundsChange,
  center = [30.0444, 31.2357], // Cairo center default
  zoom = 12,
}: LeafletInnerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false,
    });

    // Custom sleek zoom control in bottom-left
    L.control.zoom({ position: "bottomleft" }).addTo(map);

    // High quality tile layer (CARTO Voyager with API key or resilient OSM fallback)
    const tileConfig = getMapTileConfig();
    L.tileLayer(tileConfig.tileUrl, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      ...(tileConfig.subdomains ? { subdomains: tileConfig.subdomains } : {}),
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const circlesLayer = L.layerGroup().addTo(map);

    markersLayerRef.current = markersLayer;
    circlesLayerRef.current = circlesLayer;
    mapInstanceRef.current = map;

    // Viewport change debouncer
    let debounceTimer: NodeJS.Timeout;
    map.on("moveend zoomend", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!onBoundsChange) return;
        const b = map.getBounds();
        onBoundsChange({
          southWest: { lat: b.getSouthWest().lat, lng: b.getSouthWest().lng },
          northEast: { lat: b.getNorthEast().lat, lng: b.getNorthEast().lng },
        });
      }, 400);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when properties or selectedPropertyId change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const circlesLayer = circlesLayerRef.current;
    if (!map || !markersLayer || !circlesLayer) return;

    markersLayer.clearLayers();
    circlesLayer.clearLayers();

    properties.forEach((prop) => {
      const isSelected = selectedPropertyId === prop.id;
      const isRent = prop.transactionType === "rent";

      // Price label formatting
      let formattedPrice = "";
      if (prop.price >= 1000000) {
        formattedPrice = (prop.price / 1000000).toFixed(1) + " م";
      } else if (prop.price >= 1000) {
        formattedPrice = Math.round(prop.price / 1000) + " ألف";
      } else {
        formattedPrice = prop.price.toString();
      }

      // Create Custom HTML Marker Icon
      const iconHtml = `
        <div class="custom-map-marker ${isRent ? "rent" : ""} ${isSelected ? "active" : ""}">
          <span>${formattedPrice} ج.م</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: iconHtml,
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      });

      const marker = L.marker([prop.lat, prop.lng], { icon: customIcon });

      // Draw Privacy Radius Circle if Location is Approximate
      if (prop.isApproximateLocation) {
        const circle = L.circle([prop.lat, prop.lng], {
          radius: prop.privacyRadiusMeters || 500,
          color: isSelected ? "#d97706" : "#0d9488",
          fillColor: isSelected ? "#f59e0b" : "#14b8a6",
          fillOpacity: 0.18,
          weight: 1.5,
          dashArray: "4, 6",
        });
        circle.addTo(circlesLayer);
      }

      // Popup Content
      const popupHtml = `
        <div style="width: 260px; font-family: 'Cairo', sans-serif;">
          <div style="position: relative; height: 140px; width: 100%; overflow: hidden; background: #e2e8f0;">
            <img src="${prop.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80'}" 
                 alt="${prop.title}" 
                 style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; top: 8px; right: 8px; background: rgba(15, 23, 42, 0.85); color: white; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold;">
              ${prop.transactionType === "sale" ? "للبيع" : "للإيجار"}
            </div>
            ${prop.isApproximateLocation ? `
              <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(217, 119, 6, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">
                موقع تقريبي (نطاق 500م)
              </div>
            ` : ""}
          </div>
          <div style="padding: 12px;">
            <div style="font-weight: 800; font-size: 15px; color: #0f766e; margin-bottom: 4px;">
              ${prop.price.toLocaleString("ar-EG")} ج.م ${prop.rentalPeriod ? "/ شهر" : ""}
            </div>
            <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${prop.title}
            </div>
            <div style="display: flex; gap: 12px; font-size: 11px; color: #64748b; margin-bottom: 12px; border-top: 1px solid #f1f5f9; padding-top: 6px;">
              <span><strong>${prop.areaSqM}</strong> م²</span>
              ${prop.bedrooms ? `<span><strong>${prop.bedrooms}</strong> غرف</span>` : ""}
              ${prop.bathrooms ? `<span><strong>${prop.bathrooms}</strong> حمام</span>` : ""}
            </div>
            <a href="/properties/${prop.slug}" 
               style="display: block; text-align: center; background: #0f766e; color: white; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; transition: background 0.2s;">
              عرض التفاصيل الكاملة
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });

      marker.on("click", () => {
        if (onSelectProperty) onSelectProperty(prop);
      });

      marker.addTo(markersLayer);

      // Open popup and pan to marker if selected
      if (isSelected) {
        marker.openPopup();
        map.panTo([prop.lat, prop.lng], { animate: true });
      }
    });
  }, [properties, selectedPropertyId]);

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
