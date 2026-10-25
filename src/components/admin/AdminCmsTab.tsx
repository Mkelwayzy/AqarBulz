"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import {
  Palette,
  Save,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Smartphone,
} from "lucide-react";
import { CmsHomepageSettings, VisualIdentitySettings } from "@/lib/db/types";
import {
  DEFAULT_BRAND_LOGO_HEIGHT_PX,
  DEFAULT_BRAND_LOGO_PATH,
  MAX_BRAND_LOGO_HEIGHT_PX,
  MIN_BRAND_LOGO_HEIGHT_PX,
  getBrandLogoHeightPx,
} from "@/lib/brand-theme";

export default function AdminCmsTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Logo / app icon / icon colors only
  const [logoImageUrl, setLogoImageUrl] = useState(DEFAULT_BRAND_LOGO_PATH);
  const [logoHeightPx, setLogoHeightPx] = useState(DEFAULT_BRAND_LOGO_HEIGHT_PX);
  const [appIconUrl, setAppIconUrl] = useState("");
  const [iconColor, setIconColor] = useState("#059669");
  const [mapIconColor, setMapIconColor] = useState("#047857");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAppIcon, setUploadingAppIcon] = useState(false);

  const fetchCmsSettings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/cms/settings", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر تحميل إعدادات الهوية");
      }

      const s: CmsHomepageSettings = data.settings;
      const persistenceUnavailable = data.persistenceAvailable === false;
      setLoadError(persistenceUnavailable);
      setErrorMsg(
        persistenceUnavailable
          ? `${data.error || "تعذر الاتصال بمخزن الهوية المركزي."} أعد المحاولة قبل الحفظ لتجنب استبدال الإعدادات المحفوظة.`
          : null
      );

      if (s?.visualIdentity) {
        const vi = s.visualIdentity as VisualIdentitySettings;
        setLogoImageUrl(vi.logoImageUrl || DEFAULT_BRAND_LOGO_PATH);
        setLogoHeightPx(getBrandLogoHeightPx(vi));
        setAppIconUrl(vi.appIconUrl || "");
        setIconColor(vi.iconColor || "#059669");
        setMapIconColor(vi.mapIconColor || "#047857");
      }
    } catch (err) {
      console.error("Failed to fetch CMS settings:", err);
      setLoadError(true);
      setErrorMsg(err instanceof Error ? err.message : "تعذر تحميل إعدادات الهوية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCmsSettings();
  }, []);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: "logo" | "appIcon"
  ) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const input = event.currentTarget;
    const setUploading = target === "logo" ? setUploadingLogo : setUploadingAppIcon;

    setUploading(true);
    setErrorMsg(null);
    try {
      if (target === "appIcon") {
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const objectUrl = URL.createObjectURL(file);
          const image = document.createElement("img");
          image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: image.width, height: image.height });
          };
          image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("تعذر قراءة أبعاد الصورة"));
          };
          image.src = objectUrl;
        });
        const isSquare = dimensions.width === dimensions.height;
        const isLargeEnough = dimensions.width >= 192;
        if (!isSquare || !isLargeEnough) {
          throw new Error("يجب أن تكون أيقونة التطبيق مربعة وبأبعاد لا تقل عن 192×192 بكسل");
        }
      }

      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("propertyId", "draft");
      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: uploadData,
      });
      const result = await response.json();
      if (!response.ok || !result.url) {
        throw new Error(result.error || "فشل رفع الصورة");
      }
      if (target === "logo") setLogoImageUrl(result.url);
      else setAppIconUrl(result.url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      // Load current settings, then patch only the visual identity fields we manage here
      const currentRes = await fetch("/api/admin/cms/settings", { cache: "no-store", credentials: "include" });
      if (!currentRes.ok) throw new Error("تعذر جلب الإعدادات الحالية قبل الحفظ");
      const currentData = await currentRes.json();
      const current: CmsHomepageSettings = currentData.settings;
      const currentVi = (current?.visualIdentity || {}) as VisualIdentitySettings;

      const payload: Partial<CmsHomepageSettings> = {
        ...current,
        visualIdentity: {
          ...currentVi,
          logoImageUrl,
          logoHeightPx,
          appIconUrl,
          iconColor,
          mapIconColor,
        },
      };

      const res = await fetch("/api/cms/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        if (!result.success) throw new Error(result.error || "فشل حفظ التعديلات");
        const savedLogoHeight = result.settings?.visualIdentity?.logoHeightPx;
        if (typeof savedLogoHeight === "number") {
          setLogoHeightPx(getBrandLogoHeightPx({ logoHeightPx: savedLogoHeight }));
        }
        setSaveSuccess(true);
        window.dispatchEvent(new Event("cms-settings-updated"));
        router.refresh();
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const d = await res.json();
        throw new Error(d.error || "فشل حفظ التعديلات");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الإعدادات في الخادم");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-purple-700 text-xs font-black uppercase tracking-wider mb-1">
            <Palette className="w-4 h-4" />
            <span>شركة الإدارة • هوية الموقع</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            الشعار وأيقونة التطبيق وألوان الأيقونات
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            التحكم في صورة الشعار وحجمها، أيقونة التطبيق المثبت، ولون أيقونات الواجهة والخريطة.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || loading || loadError || uploadingLogo || uploadingAppIcon}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md shadow-purple-700/20 cursor-pointer self-start md:self-auto"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جاري الحفظ والاعتماد...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات فوراً</span>
            </>
          )}
        </button>
        {loadError && (
          <button
            type="button"
            onClick={() => void fetchCmsSettings()}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة تحميل الإعدادات
          </button>
        )}
      </div>

      {/* Success / Error notification */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>تم حفظ الهوية وتحديث واجهة التطبيق بنجاح!</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {/* 2. Settings Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel A: الشعار وأيقونة التطبيق */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base pb-3 border-b border-slate-100">
            <ImageIcon className="w-4 h-4 text-purple-700" />
            <span>الشعار وأيقونة التطبيق</span>
          </div>

          <div className="space-y-4 text-xs font-bold text-slate-700">
            {/* Logo upload / URL + live preview */}
            <div>
              <label className="block mb-1.5">صورة الشعار (URL أو مسار في /images)</label>
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <NextImage
                  src={logoImageUrl || DEFAULT_BRAND_LOGO_PATH}
                  alt="معاينة الشعار"
                  width={144}
                  height={74}
                  unoptimized
                  style={{ height: `${logoHeightPx}px`, width: "auto" }}
                  className="rounded-xl border border-slate-200 bg-white object-contain"
                />
                <span className="text-[11px] text-slate-500">معاينة مباشرة بالحجم المختار</span>
              </div>
              <input
                type="text"
                value={logoImageUrl}
                onChange={(e) => setLogoImageUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                dir="ltr"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white text-left"
              />
              <label className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-800 cursor-pointer">
                <ImageIcon className="w-4 h-4" />
                <span>{uploadingLogo ? "جارٍ رفع الشعار..." : "رفع صورة شعار"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  disabled={uploadingLogo}
                  onChange={(event) => void handleImageUpload(event, "logo")}
                  className="sr-only"
                />
              </label>
              <label className="mt-4 block space-y-2">
                <span className="flex items-center justify-between">
                  <span>حجم الشعار في التطبيق</span>
                  <span className="text-purple-700" dir="ltr">{logoHeightPx}px</span>
                </span>
                <input
                  type="range"
                  min={MIN_BRAND_LOGO_HEIGHT_PX}
                  max={MAX_BRAND_LOGO_HEIGHT_PX}
                  step={4}
                  value={logoHeightPx}
                  disabled={saving}
                  onChange={(event) => setLogoHeightPx(Number(event.target.value))}
                  className="w-full accent-purple-700 disabled:cursor-wait disabled:opacity-60"
                  aria-label="حجم الشعار بالبكسل"
                />
                <span className="flex justify-between text-[10px] text-slate-500" dir="ltr">
                  <span>{MIN_BRAND_LOGO_HEIGHT_PX}px</span>
                  <span>{MAX_BRAND_LOGO_HEIGHT_PX}px</span>
                </span>
              </label>
            </div>

            {/* App icon upload + preview */}
            <div>
              <label className="block mb-1.5">أيقونة التطبيق المثبت والمتصفح</label>
              <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                ارفع صورة PNG أو JPEG أو WebP أو AVIF مربعة، 192×192 بكسل على الأقل. ستُستخدم لأيقونة التطبيق وPWA.
              </p>
              {appIconUrl && (
                <div className="mb-2 flex items-center gap-3">
                  <NextImage
                    src={appIconUrl}
                    alt="معاينة أيقونة التطبيق"
                    width={64}
                    height={64}
                    unoptimized
                    className="w-16 h-16 rounded-xl border border-slate-200 object-contain bg-white"
                  />
                  <span className="text-[11px] text-slate-500">معاينة أيقونة التطبيق</span>
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-800 cursor-pointer">
                <Smartphone className="w-4 h-4" />
                <span>{uploadingAppIcon ? "جارٍ رفع الأيقونة..." : "رفع أيقونة التطبيق"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  disabled={uploadingAppIcon}
                  onChange={(event) => void handleImageUpload(event, "appIcon")}
                  className="sr-only"
                />
              </label>
              <input
                type="text"
                value={appIconUrl}
                onChange={(e) => setAppIconUrl(e.target.value)}
                placeholder="رابط HTTPS أو مسار صورة الأيقونة"
                dir="ltr"
                className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white text-left"
              />
            </div>
          </div>
        </div>

        {/* Panel B: ألوان الأيقونات */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base pb-3 border-b border-slate-100">
            <Palette className="w-4 h-4 text-purple-700" />
            <span>ألوان الأيقونات</span>
          </div>

          <div className="space-y-4 text-xs font-bold text-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="block">لون أيقونات الواجهة</span>
                <input
                  type="color"
                  value={iconColor}
                  onChange={(event) => setIconColor(event.target.value)}
                  className="h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                />
                <input
                  type="text"
                  value={iconColor}
                  onChange={(event) => setIconColor(event.target.value)}
                  dir="ltr"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 text-left"
                />
              </label>
              <label className="space-y-1.5">
                <span className="block">لون علامات العقارات على الخريطة</span>
                <input
                  type="color"
                  value={mapIconColor}
                  onChange={(event) => setMapIconColor(event.target.value)}
                  className="h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                />
                <input
                  type="text"
                  value={mapIconColor}
                  onChange={(event) => setMapIconColor(event.target.value)}
                  dir="ltr"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 text-left"
                />
              </label>
            </div>

            {/* Live color preview chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                style={{ backgroundColor: iconColor }}
                className="px-3 py-1.5 rounded-xl text-white text-xs font-black shadow-xs"
              >
                لون أيقونات الواجهة
              </span>
              <span
                style={{ backgroundColor: mapIconColor }}
                className="px-3 py-1.5 rounded-full text-white text-xs font-black shadow-xs"
              >
                علامة الخريطة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="sticky bottom-20 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between gap-4">
        <span className="text-xs font-bold text-slate-600">
          يتم تطبيق الشعار والألوان فور حفظها على كافة صفحات التطبيق وزواره.
        </span>

        <button
          type="submit"
          disabled={saving || loading || loadError || uploadingLogo || uploadingAppIcon}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md shadow-purple-700/20 cursor-pointer"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات فوراً</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
