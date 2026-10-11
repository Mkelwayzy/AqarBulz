import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نبض العقار | AqarPulse Egypt",
    short_name: "نبض العقار",
    description: "المنصة العقارية الذكية والخريطة التفاعلية في جمهورية مصر العربية",
    start_url: "/?source=pwa",
    id: "/?source=pwa",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f766e",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "الخريطة الذكية",
        short_name: "الخريطة",
        description: "استكشف العقارات مباشرة على الخريطة التفاعلية",
        url: "/explore",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "عقارات للبيع",
        short_name: "بيع",
        description: "شقق وفيلات للبيع في مصر",
        url: "/properties?transactionType=sale",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "عقارات للإيجار",
        short_name: "إيجار",
        description: "شقق ووحدات للإيجار الفوري",
        url: "/properties?transactionType=rent",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "أضف عقارك",
        short_name: "إضافة عقار",
        description: "أضف شقتك أو فيلتك للبيع أو الإيجار",
        url: "/dashboard/properties/new",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
