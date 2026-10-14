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
  autoFitKey?: string | number;
  userLocation?: { lat: number; lng: number } | null;
  mapType?: "satellite" | "street";
}

export default function LeafletInnerMap({
  properties,
  selectedPropertyId,
  onSelectProperty,
  onBoundsChange,
  center = [30.7194, 31.2580], // Meet Ghamr center default
  zoom = 13,
  autoFitKey,
  userLocation,
  mapType = "street",
}: LeafletInnerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const isProgrammaticMoveRef = useRef<boolean>(false);
  const prevFitKeyRef = useRef<string | number | undefined>(undefined);
  const prevPropertiesCountRef = useRef<number>(-1);
  const onSelectPropertyRef = useRef(onSelectProperty);
  const onBoundsChangeRef = useRef(onBoundsChange);

  useEffect(() => {
    onSelectPropertyRef.current = onSelectProperty;
    onBoundsChangeRef.current = onBoundsChange;
  }, [onSelectProperty, onBoundsChange]);

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

    // Initial tile layer (Satellite by default matching Aqar Saudi style)
    const isSatellite = mapType === "satellite";
    const tileLayer = isSatellite
      ? L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: "Esri World Imagery",
          maxZoom: 19,
        })
      : L.tileLayer(getMapTileConfig().tileUrl, {
          attribution: getMapTileConfig().attribution,
          maxZoom: getMapTileConfig().maxZoom,
          ...(getMapTileConfig().subdomains ? { subdomains: getMapTileConfig().subdomains } : {}),
        });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    const markersLayer = L.layerGroup().addTo(map);
    const circlesLayer = L.layerGroup().addTo(map);

    markersLayerRef.current = markersLayer;
    circlesLayerRef.current = circlesLayer;
    mapInstanceRef.current = map;
    mapInstanceRef.current = map;

    // Viewport change debouncer
    let debounceTimer: NodeJS.Timeout;
    map.on("moveend zoomend", () => {
      // If the map moved due to programmatic autoFit or flyTo, skip emitting onBoundsChange
      if (isProgrammaticMoveRef.current) {
        return;
      }

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!onBoundsChangeRef.current) return;
        const b = map.getBounds();
        onBoundsChangeRef.current({
          southWest: { lat: b.getSouthWest().lat, lng: b.getSouthWest().lng },
          northEast: { lat: b.getNorthEast().lat, lng: b.getNorthEast().lng },
        });
      }, 400);
    });

    // Ensure map tiles recalculate immediately to fill screen
    const resizeHandler = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", resizeHandler);
    setTimeout(resizeHandler, 150);

    return () => {
      window.removeEventListener("resize", resizeHandler);
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic Tile Layer Switcher (Satellite vs Streets)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const isSatellite = mapType === "satellite";
    const newTileLayer = isSatellite
      ? L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: "Esri World Imagery",
          maxZoom: 19,
        })
      : L.tileLayer(getMapTileConfig().tileUrl, {
          attribution: getMapTileConfig().attribution,
          maxZoom: getMapTileConfig().maxZoom,
          ...(getMapTileConfig().subdomains ? { subdomains: getMapTileConfig().subdomains } : {}),
        });
    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [mapType]);

  // Update Markers and bounds when properties or selectedPropertyId change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const circlesLayer = circlesLayerRef.current;
    if (!map || !markersLayer || !circlesLayer) return;

    markersLayer.clearLayers();
    circlesLayer.clearLayers();
    markersMapRef.current.clear();

    properties.forEach((prop) => {
      const isSelected = selectedPropertyId === prop.id;

      // Price label formatting matching Image 1
      let formattedPrice = "";
      if (prop.price >= 1000000) {
        const millions = prop.price / 1000000;
        formattedPrice = (millions % 1 === 0 ? millions.toString() : millions.toFixed(1)) + " مليون";
      } else if (prop.price >= 1000) {
        formattedPrice = Math.round(prop.price / 1000) + " ألف";
      } else {
        formattedPrice = prop.price.toString();
      }

      // Create Custom HTML Marker Icon matching Image 1 green pin
      const iconHtml = `
        <div class="saudi-aqar-marker ${isSelected ? "active" : ""}">
          <span>${formattedPrice}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: iconHtml,
        iconSize: [64, 26],
        iconAnchor: [32, 26],
      });

      const marker = L.marker([prop.lat, prop.lng], { icon: customIcon });
      markersMapRef.current.set(prop.id, marker);

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
        if (onSelectPropertyRef.current) onSelectPropertyRef.current(prop);
      });

      marker.addTo(markersLayer);

      // Open popup if selected
      if (isSelected) {
        marker.openPopup();
      }
    });

    // Render User Location Pin if provided
    if (userLocation && typeof userLocation.lat === "number" && typeof userLocation.lng === "number") {
      const userHtml = `
        <div style="position: relative; width: 22px; height: 22px;">
          <div style="position: absolute; width: 44px; height: 44px; background: rgba(37, 99, 235, 0.25); border-radius: 50%; top: -11px; left: -11px; animation: markerPulse 2s infinite ease-out;"></div>
          <div style="position: absolute; width: 18px; height: 18px; background: #2563eb; border: 3px solid white; border-radius: 50%; top: 2px; left: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
        </div>
      `;
      const userMarkerIcon = L.divIcon({
        className: "user-radar-marker",
        html: userHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const uMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: userMarkerIcon,
        zIndexOffset: 3000,
      });
      uMarker.bindPopup('<div style="font-family: Cairo, sans-serif; padding: 6px 10px; font-weight: bold; font-size: 13px; color: #1e3a8a; text-align: center;">📍 موقعك الحالي</div>');
      uMarker.addTo(markersLayer);
    }

    // Auto-fit bounds or fly to searched properties whenever autoFitKey changes or properties list updates
    const shouldAutoFit =
      (autoFitKey !== undefined && autoFitKey !== prevFitKeyRef.current) ||
      (properties.length !== prevPropertiesCountRef.current && properties.length > 0);

    if (shouldAutoFit) {
      prevFitKeyRef.current = autoFitKey;
      prevPropertiesCountRef.current = properties.length;

      if (properties.length === 1) {
        // Single property match: fly directly and open popup
        isProgrammaticMoveRef.current = true;
        map.flyTo([properties[0].lat, properties[0].lng], Math.max(map.getZoom(), 15), {
          duration: 1.2,
        });

        setTimeout(() => {
          const singleMarker = markersMapRef.current.get(properties[0].id);
          if (singleMarker) singleMarker.openPopup();
          isProgrammaticMoveRef.current = false;
        }, 1300);
      } else if (properties.length > 1) {
        // Multiple properties match: fit bounds to encompass all
        const latLngs = properties.map((p) => [p.lat, p.lng] as [number, number]);
        const bounds = L.latLngBounds(latLngs);
        if (bounds.isValid()) {
          isProgrammaticMoveRef.current = true;
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15,
            animate: true,
          });

          setTimeout(() => {
            isProgrammaticMoveRef.current = false;
          }, 1000);
        }
      } else if (center) {
        // 0 properties, but user searched a district or center was changed
        isProgrammaticMoveRef.current = true;
        map.flyTo(center, zoom || 13, { duration: 1.2 });
        setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 1300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, selectedPropertyId, autoFitKey, center, zoom, userLocation]);

  // When selectedPropertyId changes explicitly, pan to marker and open popup
  useEffect(() => {
    if (!selectedPropertyId || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const marker = markersMapRef.current.get(selectedPropertyId);
    const prop = properties.find((p) => p.id === selectedPropertyId);

    if (prop) {
      isProgrammaticMoveRef.current = true;
      map.panTo([prop.lat, prop.lng], { animate: true });
      if (marker) {
        marker.openPopup();
      }
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 500);
    }
  }, [selectedPropertyId, properties]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
