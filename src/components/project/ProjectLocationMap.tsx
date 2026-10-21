"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { getMapTileConfig } from "@/lib/map/tileConfig";

interface ProjectLocationMapProps {
  lat: number;
  lng: number;
  currentLocation?: { lat: number; lng: number } | null;
  routeCoordinates?: [number, number][];
}

export default function ProjectLocationMap({
  lat,
  lng,
  currentLocation = null,
  routeCoordinates = [],
}: ProjectLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false,
    });
    const tileConfig = getMapTileConfig();

    L.tileLayer(tileConfig.tileUrl, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      ...(tileConfig.subdomains ? { subdomains: tileConfig.subdomains } : {}),
    }).addTo(map);

    const projectPin = L.divIcon({
      className: "custom-leaflet-pin-wrapper",
      html: `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42" aria-hidden="true">
          <path d="M18 1C8.6 1 1 8.6 1 18c0 12.1 17 23 17 23s17-10.9 17-23C35 8.6 27.4 1 18 1Z" fill="#0f766e" stroke="#fff" stroke-width="2"/>
          <circle cx="18" cy="18" r="6" fill="#fff"/>
        </svg>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 41],
    });

    L.marker([lat, lng], {
      icon: projectPin,
      title: "موقع المشروع",
      alt: "دبوس موقع المشروع",
      keyboard: true,
    }).addTo(map);

    if (currentLocation) {
      L.circleMarker([currentLocation.lat, currentLocation.lng], {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
      })
        .bindTooltip("موقعك الحالي")
        .addTo(map);
    }

    if (routeCoordinates.length > 1) {
      const routeLine = L.polyline(routeCoordinates, {
        color: "#0f766e",
        weight: 5,
        opacity: 0.9,
        lineJoin: "round",
      }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [28, 28], maxZoom: 15 });
    }

    return () => {
      map.remove();
    };
  }, [lat, lng, currentLocation, routeCoordinates]);

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full"
      role="application"
      aria-label={routeCoordinates.length > 1 ? "خريطة مسار التنقل إلى المشروع" : "خريطة موقع المشروع"}
    />
  );
}
