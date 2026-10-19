import { MetadataRoute } from "next";
import { dbStore } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await dbStore.getCmsHomepageSettingsForDisplayAsync();
  const identity = settings.visualIdentity;
  const appName = identity?.siteName || "نبض العقار";
  const iconUrl = identity?.appIconUrl || "/icons/icon-512x512.png";
  const iconExtension = new URL(iconUrl, "https://aqarpulse.local").pathname.split(".").pop()?.toLowerCase();
  const iconTypeByExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  };
  const iconType = iconTypeByExtension[iconExtension || ""] || "image/png";
  return {
    name: `${appName} | ${identity?.siteSubtitle || "AqarPulse Egypt"}`,
    short_name: appName,
    description: settings.metaDescription || settings.heroDescription,
    start_url: "/?source=pwa",
    id: "/?source=pwa",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: identity?.primaryColor || "#0f766e",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    icons: [
      {
        src: iconUrl,
        sizes: "192x192",
        type: iconType,
        purpose: "any",
      },
      {
        src: iconUrl,
        sizes: "512x512",
        type: iconType,
        purpose: "any",
      },
      {
        src: iconUrl,
        sizes: "512x512",
        type: iconType,
        purpose: "maskable",
      },
      {
        src: iconUrl,
        sizes: "180x180",
        type: iconType,
      },
    ],
    shortcuts: [
      {
        name: "الخريطة الذكية",
        short_name: "الخريطة",
        description: "استكشف العقارات مباشرة على الخريطة التفاعلية",
        url: "/explore",
        icons: [{ src: iconUrl, sizes: "192x192" }],
      },
      {
        name: "عقارات للبيع",
        short_name: "بيع",
        description: "شقق وفيلات للبيع في مصر",
        url: "/properties?transactionType=sale",
        icons: [{ src: iconUrl, sizes: "192x192" }],
      },
      {
        name: "عقارات للإيجار",
        short_name: "إيجار",
        description: "شقق ووحدات للإيجار الفوري",
        url: "/properties?transactionType=rent",
        icons: [{ src: iconUrl, sizes: "192x192" }],
      },
      {
        name: "أضف عقارك",
        short_name: "إضافة عقار",
        description: "أضف شقتك أو فيلتك للبيع أو الإيجار",
        url: "/dashboard/properties/new",
        icons: [{ src: iconUrl, sizes: "192x192" }],
      },
    ],
  };
}
