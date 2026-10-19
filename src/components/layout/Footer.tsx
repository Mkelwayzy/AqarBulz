"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import type { CmsHomepageSettings } from "@/lib/db/types";
import { DEFAULT_BRAND_LOGO_PATH, getBrandLogoHeightPx } from "@/lib/brand-theme";

export default function Footer() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<CmsHomepageSettings | null>(null);

  useEffect(() => {
    const loadSettings = () => {
      fetch("/api/cms/homepage", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("تعذر تحميل إعدادات التذييل");
          const data = await response.json();
          if (data.settings) setSettings(data.settings as CmsHomepageSettings);
        })
        .catch((error: unknown) => console.error("[Footer] CMS settings load failed:", error));
    };
    loadSettings();
    window.addEventListener("cms-settings-updated", loadSettings);
    return () => window.removeEventListener("cms-settings-updated", loadSettings);
  }, []);

  if (pathname === "/") return null;
  const labels = settings?.navLabels;
  const siteName = settings?.visualIdentity?.siteName || "دار العقار";
  const logoUrl = !settings || settings.visualIdentity?.logoType === "image"
    ? settings?.visualIdentity?.logoImageUrl || DEFAULT_BRAND_LOGO_PATH
    : null;
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 py-6 pb-28 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <NextImage
                src={logoUrl}
                alt={siteName}
                width={80}
                height={41}
                unoptimized
                style={{ height: `${getBrandLogoHeightPx(settings?.visualIdentity)}px`, width: "auto" }}
                className="rounded-md bg-white object-contain"
              />
            )}
            <span>© {new Date().getFullYear()} {siteName}. جميع الحقوق محفوظة.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              {labels?.privacy || "سياسة الخصوصية"}
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              {labels?.terms || "شروط الاستخدام"}
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-slate-300 transition-colors">
              {labels?.contact || "اتصل بنا"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
