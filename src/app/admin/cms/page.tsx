"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Layout,
  Image as ImageIcon,
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Trash2,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Building2,
  MapPin,
  Menu,
} from "lucide-react";
import { CmsHomepageSettings, CmsStaticPage, CmsMediaAsset } from "@/lib/db/types";

export default function AdminCmsPage() {
  const [activeTab, setActiveTab] = useState<"homepage" | "nav" | "sections" | "pages" | "media" | "seo">("homepage");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // CMS State
  const [homepage, setHomepage] = useState<CmsHomepageSettings | null>(null);
  const [pages, setPages] = useState<CmsStaticPage[]>([]);
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>("about");
  const [mediaAssets, setMediaAssets] = useState<CmsMediaAsset[]>([]);

  // New Media Modal/State
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaAlt, setNewMediaAlt] = useState("");

  useEffect(() => {
    loadCmsData();
  }, []);

  const loadCmsData = async () => {
    setLoading(true);
    try {
      const [hpRes, pagesRes, mediaRes] = await Promise.all([
        fetch("/api/admin/cms/settings"),
        fetch("/api/admin/cms/pages"),
        fetch("/api/admin/cms/media"),
      ]);

      if (hpRes.ok) {
        const hpData = await hpRes.json();
        setHomepage(hpData.settings);
      }
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        setPages(pagesData.pages || []);
      }
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        setMediaAssets(mediaData.assets || []);
      }
    } catch {
      setMessage({ text: "فشل تحميل بيانات نظام إدارة المحتوى", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHomepage = async () => {
    if (!homepage) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/cms/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(homepage),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حفظ التعديلات");

      setHomepage(data.settings);
      setMessage({ text: "تم حفظ إعدادات الصفحة الرئيسية والمحتوى بنجاح", type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ";
      setMessage({ text: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePage = async (page: CmsStaticPage) => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/cms/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(page),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حفظ الصفحة");

      setPages((prev) => prev.map((p) => (p.slug === page.slug ? data.page : p)));
      setMessage({ text: `تم حفظ صفحة "${page.titleAr}" بنجاح`, type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ";
      setMessage({ text: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl.trim()) return;

    try {
      const res = await fetch("/api/admin/cms/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newMediaUrl.trim(),
          altText: newMediaAlt.trim(),
          fileName: newMediaUrl.split("/").pop() || "media.jpg",
          mimeType: "image/jpeg",
          fileSizeBytes: 204800,
        }),
      });

      const data = await res.json();
      if (res.ok && data.asset) {
        setMediaAssets((prev) => [data.asset, ...prev]);
        setNewMediaUrl("");
        setNewMediaAlt("");
        setMessage({ text: "تمت إضافة ملف الوسائط بنجاح", type: "success" });
      }
    } catch {
      setMessage({ text: "فشل إضافة ملف الوسائط", type: "error" });
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الملف من مكتبة الوسائط؟")) return;

    try {
      const res = await fetch(`/api/admin/cms/media?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حذف الملف");

      setMediaAssets((prev) => prev.filter((m) => m.id !== id));
      setMessage({ text: "تم حذف الملف بنجاح", type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      setMessage({ text: msg, type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="text-xs font-bold">جاري تحميل نظام إدارة المحتوى...</span>
      </div>
    );
  }

  const activePage = pages.find((p) => p.slug === selectedPageSlug);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <span>لوحة الإدارة</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-black text-purple-700">إدارة المحتوى وواجهة الموقع (CMS)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">نظام إدارة المحتوى CMS</h1>
          <p className="text-xs text-slate-500">
            تحكم كامل في نصوص الصفحة الرئيسية، ترتيب الأقسام، الصفحات الثابتة، ومكتبة الوسائط دون تعديل الكود البرمجي.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>معاينة الواجهة الحية</span>
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "homepage", label: "نصوص الواجهة الرئيسية", icon: Layout },
          { id: "nav", label: "عناوين الشريط العلوي", icon: Menu },
          { id: "sections", label: "ترتيب ورؤية الأقسام", icon: Layers },
          { id: "pages", label: "الصفحات الثابتة والسياسات", icon: FileText },
          { id: "media", label: "مكتبة الوسائط والبانرات", icon: ImageIcon },
          { id: "seo", label: "بيانات التواصل وSEO", icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Homepage Hero Text */}
      {activeTab === "homepage" && homepage && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-black text-slate-900">نصوص وبانرات الصفحة الرئيسية</h2>
            <p className="text-xs text-slate-500">تعديل الشارات والنصوص الترويجية التي تظهر للزوار في واجهة الموقع.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">شارة الإعلان العلوية (Hero Badge)</label>
              <input
                type="text"
                value={homepage.heroBadgeText}
                onChange={(e) => setHomepage({ ...homepage, heroBadgeText: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">عنوان الهيرو - السطر الأول</label>
                <input
                  type="text"
                  value={homepage.heroTitleLine1}
                  onChange={(e) => setHomepage({ ...homepage, heroTitleLine1: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">عنوان الهيرو - السطر الملون</label>
                <input
                  type="text"
                  value={homepage.heroTitleLine2}
                  onChange={(e) => setHomepage({ ...homepage, heroTitleLine2: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">الوصف التعريفي للرئيسية</label>
              <textarea
                rows={3}
                value={homepage.heroDescription}
                onChange={(e) => setHomepage({ ...homepage, heroDescription: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">نص زر الإجراء الرئيسي (CTA Button)</label>
                <input
                  type="text"
                  value={homepage.heroCtaText}
                  onChange={(e) => setHomepage({ ...homepage, heroCtaText: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">رابط زر الإجراء</label>
                <input
                  type="text"
                  value={homepage.heroCtaLink}
                  onChange={(e) => setHomepage({ ...homepage, heroCtaLink: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-black text-slate-800">بانر الخريطة التفاعلية</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">عنوان بانر الخريطة</label>
                  <input
                    type="text"
                    value={homepage.bannerTitle}
                    onChange={(e) => setHomepage({ ...homepage, bannerTitle: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">نص زر بانر الخريطة</label>
                  <input
                    type="text"
                    value={homepage.bannerCtaText}
                    onChange={(e) => setHomepage({ ...homepage, bannerCtaText: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">وصف بانر الخريطة</label>
                <textarea
                  rows={2}
                  value={homepage.bannerSubtitle}
                  onChange={(e) => setHomepage({ ...homepage, bannerSubtitle: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSaveHomepage}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ ونشر التعديلات</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB: Navbar Titles Customization */}
      {activeTab === "nav" && homepage && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-black text-slate-900">تخصيص عناوين وقوائم الشريط العلوي (Navbar)</h2>
            <p className="text-xs text-slate-500">
              تعديل مسميات خيارات القائمة العلوية والعقارات والصفحات لتناسب علامتك التجارية وحملاتك.
            </p>
          </div>

          <div className="space-y-6">
            {/* العلامة التجارية */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span>شعار وهوية المنصة في الشريط العلوي</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنصة الرئيسي</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.brandTitle ?? "نبض العقار"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), brandTitle: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">النص الفرعي للشعار</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.brandSubtitle ?? "AqarPulse Egypt"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), brandSubtitle: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>
            </div>

            {/* قائمة العقارات المنسدلة */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>قائمة العقارات وخياراتها المنسدلة</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان القائمة الرئيسي</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.propertiesDropdown ?? "العقارات"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), propertiesDropdown: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">خيار البيع</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.sale ?? "بيع"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), sale: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">خيار الإيجار</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.rent ?? "إيجار"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), rent: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">خيار الخريطة الذكية</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.explore ?? "الخريطة الذكية"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), explore: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">زر إضافة العقار</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.addProperty ?? "أضف عقارك"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), addProperty: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>
            </div>

            {/* روابط الصفحات ومعلومات المنصة */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>عناوين روابط الصفحات ومعلومات المنصة</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رابط الرئيسية</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.home ?? "الرئيسية"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), home: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عن منصة نبض العقار</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.about ?? "عن منصة نبض العقار"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), about: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اتصل بنا</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.contact ?? "اتصل بنا"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), contact: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الشروط والأحكام</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.terms ?? "الشروط والأحكام"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), terms: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سياسة الخصوصية وأمن البيانات</label>
                  <input
                    type="text"
                    value={homepage.navLabels?.privacy ?? "سياسة الخصوصية وأمن البيانات"}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        navLabels: { ...(homepage.navLabels || {}), privacy: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSaveHomepage}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ عناوين الشريط العلوي</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Sections Visibility & Order */}
      {activeTab === "sections" && homepage && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-black text-slate-900">إدارة ظهور وأقسام الصفحة الرئيسية</h2>
            <p className="text-xs text-slate-500">تفعيل أو إخفاء أقسام الواجهة حسب الحملات التسويقية والاحتياجات.</p>
          </div>

          <div className="space-y-3">
            {[
              { id: "hero", label: "قسم الهيرو ومحرك البحث السريع" },
              { id: "map_banner", label: "بانر الخريطة التفاعلية الفيكتورية" },
              { id: "categories", label: "شبكة تصنيفات العقارات (شقق، فيلات، بنتهاوس...)" },
              { id: "featured", label: "العقارات المميزة المعتمدة" },
              { id: "recent", label: "أحدث العقارات المضافة" },
              { id: "features", label: "لماذا منصة نبض العقار (الميزات الجغرافية والخصوصية)" },
            ].map((section) => {
              const isVisible = homepage.sectionVisibility?.[section.id] !== false;
              return (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{section.label}</span>
                      <span className="text-[11px] text-slate-400 font-mono">معرف القسم: {section.id}</span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => {
                        const newVis = { ...homepage.sectionVisibility, [section.id]: e.target.checked };
                        setHomepage({ ...homepage, sectionVisibility: newVis });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSaveHomepage}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ إعدادات الأقسام</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Static Pages & Policies */}
      {activeTab === "pages" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pages List Sidebar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-2 h-fit">
            <h3 className="text-xs font-black text-slate-900 px-2 py-1">الصفحات الثابتة</h3>
            {pages.map((p) => {
              const isSelected = p.slug === selectedPageSlug;
              return (
                <button
                  key={p.slug}
                  onClick={() => setSelectedPageSlug(p.slug)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all text-right ${
                    isSelected
                      ? "bg-purple-50 text-purple-900 border border-purple-200"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>{p.titleAr}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">/{p.slug}</span>
                </button>
              );
            })}
          </div>

          {/* Page Editor Form */}
          {activePage && (
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">تعديل: {activePage.titleAr}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">المسار: /{activePage.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">منشورة للعامة</label>
                  <input
                    type="checkbox"
                    checked={activePage.isPublished}
                    onChange={(e) => {
                      const updated = { ...activePage, isPublished: e.target.checked };
                      setPages((prev) => prev.map((p) => (p.slug === activePage.slug ? updated : p)));
                    }}
                    className="w-4 h-4 text-purple-600 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">عنوان الصفحة</label>
                  <input
                    type="text"
                    value={activePage.titleAr}
                    onChange={(e) => {
                      const updated = { ...activePage, titleAr: e.target.value };
                      setPages((prev) => prev.map((p) => (p.slug === activePage.slug ? updated : p)));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">محتوى الصفحة (نص منسق)</label>
                  <textarea
                    rows={8}
                    value={activePage.contentAr}
                    onChange={(e) => {
                      const updated = { ...activePage, contentAr: e.target.value };
                      setPages((prev) => prev.map((p) => (p.slug === activePage.slug ? updated : p)));
                    }}
                    className="w-full p-4 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">عنوان السيو (Meta Title)</label>
                    <input
                      type="text"
                      value={activePage.metaTitle || ""}
                      onChange={(e) => {
                        const updated = { ...activePage, metaTitle: e.target.value };
                        setPages((prev) => prev.map((p) => (p.slug === activePage.slug ? updated : p)));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">وصف السيو (Meta Description)</label>
                    <input
                      type="text"
                      value={activePage.metaDescription || ""}
                      onChange={(e) => {
                        const updated = { ...activePage, metaDescription: e.target.value };
                        setPages((prev) => prev.map((p) => (p.slug === activePage.slug ? updated : p)));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleSavePage(activePage)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ الصفحة</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Media Library */}
      {activeTab === "media" && (
        <div className="space-y-6">
          {/* Add Media Bar */}
          <form
            onSubmit={handleAddMedia}
            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3"
          >
            <input
              type="url"
              required
              placeholder="أدخل رابط الصورة أو البانر (https://...)..."
              value={newMediaUrl}
              onChange={(e) => setNewMediaUrl(e.target.value)}
              className="flex-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="النص البديل (Alt text)..."
              value={newMediaAlt}
              onChange={(e) => setNewMediaAlt(e.target.value)}
              className="w-full sm:w-64 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة للمكتبة</span>
            </button>
          </form>

          {/* Media Grid */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">ملفات الوسائط المحفوظة</h3>
              <span className="text-xs text-slate-400 font-mono">العدد: {mediaAssets.length} ملف</span>
            </div>

            {mediaAssets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold">لا توجد وسائط مسجلة في المكتبة بعد.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {mediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-slate-900">
                      <img
                        src={asset.url}
                        alt={asset.altText}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-slate-800 block truncate">{asset.fileName}</span>
                        <span className="text-slate-400 block truncate">{asset.altText}</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 mt-2">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {Math.round(asset.fileSizeBytes / 1024)} KB
                        </span>
                        <button
                          onClick={() => handleDeleteMedia(asset.id)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          title="حذف الملف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Contact Info & SEO */}
      {activeTab === "seo" && homepage && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-black text-slate-900">بيانات التواصل والـ SEO العالمية</h2>
            <p className="text-xs text-slate-500">إدارة أرقام خدمة العملاء والوسوم التعريفية لمحركات البحث.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>رقم هاتف المنصة</span>
              </label>
              <input
                type="text"
                dir="ltr"
                value={homepage.contactPhone}
                onChange={(e) => setHomepage({ ...homepage, contactPhone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none text-right"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>بريد الدعم الفني</span>
              </label>
              <input
                type="email"
                dir="ltr"
                value={homepage.contactEmail}
                onChange={(e) => setHomepage({ ...homepage, contactEmail: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none text-right"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>رقم واتساب الرسمي</span>
              </label>
              <input
                type="text"
                dir="ltr"
                value={homepage.contactWhatsApp}
                onChange={(e) => setHomepage({ ...homepage, contactWhatsApp: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none text-right"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-slate-800">بيانات محركات البحث (Meta Tags)</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">العنوان التعريفي (Meta Title)</label>
              <input
                type="text"
                value={homepage.metaTitle}
                onChange={(e) => setHomepage({ ...homepage, metaTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">الوصف التعريفي (Meta Description)</label>
              <textarea
                rows={2}
                value={homepage.metaDescription}
                onChange={(e) => setHomepage({ ...homepage, metaDescription: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSaveHomepage}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ بيانات التواصل وSEO</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
