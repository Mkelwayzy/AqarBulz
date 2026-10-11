"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  Trash2,
  ArrowUpRight,
  Loader2,
  Send,
  Sparkles,
  MapPin,
} from "lucide-react";

interface OwnerProperty {
  id: string;
  slug: string;
  title: string;
  price: number;
  transactionType: "sale" | "rent";
  category: string;
  areaSqM: number;
  status: "draft" | "pending_review" | "published" | "rejected" | "paused" | "archived";
  createdAt: string;
  images: string[];
  viewsCount?: number;
  inquiriesCount?: number;
  addressDetails?: string;
  moderationNotes?: string;
}

export default function OwnerPropertiesPage() {
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    published: 0,
    pending: 0,
    drafts: 0,
    rejected: 0,
  });
  const [currentTab, setCurrentTab] = useState<"all" | "published" | "pending_review" | "draft" | "rejected">("all");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search).get("status");
      if (sp && ["all", "published", "pending_review", "draft", "rejected"].includes(sp)) {
        setCurrentTab(sp as any);
      }
    }
  }, []);

  useEffect(() => {
    fetchOwnerListings(currentTab);
  }, [currentTab]);

  const fetchOwnerListings = async (tab: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/properties?status=${tab}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setProperties(data.properties || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit draft/rejected listing for review
  const handleSubmitForReview = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending_review" }),
      });
      if (res.ok) {
        await fetchOwnerListings(currentTab);
      } else {
        const err = await res.json();
        alert(err.error || "فشل إرسال العقار للمراجعة");
      }
    } catch (e) {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete listing
  const handleDeleteListing = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف العقار: "${title}"؟`)) return;

    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "فشل حذف العقار");
      }
    } catch (e) {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: OwnerProperty["status"]) => {
    switch (status) {
      case "published":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>منشور معتمد</span>
          </span>
        );
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>قيد المراجعة</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>مرفوض (يحتاج تعديل)</span>
          </span>
        );
      case "draft":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <FileText className="w-3.5 h-3.5" />
            <span>مسودة خاصة</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-700 mb-1">
            <Building2 className="w-4 h-4" />
            <span>لوحة تحكم المالك والوسيط</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">إدارة عقاراتي</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            متابعة حالة وحداتك المعروضة، المسودات المحفوظة، والطلبات المقدمة للاعتماد
          </p>
        </div>

        <Link
          href="/dashboard/properties/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>إضافة عقار جديد</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 text-xs font-bold">
        {[
          { key: "all", label: "كافة العقارات", count: metrics.total },
          { key: "published", label: "بند عقارات منشورة", count: metrics.published, color: "emerald" },
          { key: "pending_review", label: "بند قيد المراجعة", count: metrics.pending, color: "amber" },
          { key: "draft", label: "المسودات", count: metrics.drafts, color: "slate" },
          { key: "rejected", label: "المرفوضة", count: metrics.rejected, color: "rose" },
        ].map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCurrentTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 ${
                isActive
                  ? tab.color === "emerald"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : tab.color === "amber"
                    ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                    : tab.color === "rose"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-brand-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  isActive ? "bg-black/15 text-inherit" : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notice Banner for Pending Review Band */}
      {currentTab === "pending_review" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-black text-sm text-amber-950">بند قيد المراجعة (سجل المشاريع المقيدة لدى الإدارة)</div>
            <p className="text-amber-800 leading-relaxed font-medium">
              هذه العقارات تم إرسالها للإدارة وهي مقيدة حالياً قيد الفحص والتدقيق. بمجرد موافقة الإدارة على المشروع سيخرج تلقائياً من المشاريع المقيدة ويتحول مباشرة إلى <strong>بند عقارات منشورة</strong> ويصبح مرئياً لجميع المشترين على الخريطة وقوائم البحث.
            </p>
          </div>
        </div>
      )}

      {/* Notice Banner for Published Band */}
      {currentTab === "published" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 text-xs shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-black text-sm text-emerald-950">بند عقارات منشورة (معتمدة ونشطة)</div>
            <p className="text-emerald-800 leading-relaxed font-medium">
              هذه العقارات تمت موافقة الإدارة عليها بعد خروجها من المشاريع المقيدة، وهي منشورة حالياً ونشطة على الخريطة التفاعلية ويستطيع المشترون معاينتها والتواصل معك بشأنها مباشرة.
            </p>
          </div>
        </div>
      )}

      {/* Listings Table / Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <span className="text-xs font-bold text-slate-500">جاري تحميل قائمة العقارات الخاصة بك...</span>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لا توجد عقارات في هذا التصنيف</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            لم تقم بإضافة أي عقارات ضمن هذا القسم بعد. يمكنك إضافة عقار جديد أو مراجعة المسودات المحفوظة.
          </p>
          <Link
            href="/dashboard/properties/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة عقار جديد الآن</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
            >
              {/* Image Preview & Badges */}
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                <img
                  src={prop.images[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"}
                  alt={prop.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">{getStatusBadge(prop.status)}</div>
                <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-bold">
                  {prop.transactionType === "sale" ? "للبيع" : "للإيجار"} • {prop.category}
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-lg font-black text-brand-800 mb-1">
                    {prop.price?.toLocaleString("ar-EG")} <span className="text-xs">ج.م</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1" title={prop.title}>
                    {prop.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{prop.addressDetails || "موقع متميز، مصر"}</span>
                  </div>

                  {prop.status === "rejected" && prop.moderationNotes && (
                    <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        <span className="font-bold">سبب الرفض: </span>
                        <span>{prop.moderationNotes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* View full page if published */}
                    {prop.status === "published" ? (
                      <Link
                        href={`/properties/${prop.slug}`}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="عرض العقار المنشور"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    ) : null}

                    {/* Submit for review button for drafts / rejected */}
                    {(prop.status === "draft" || prop.status === "rejected") && (
                      <button
                        onClick={() => handleSubmitForReview(prop.id)}
                        disabled={actionLoadingId === prop.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition"
                        title="إرسال للمراجعة"
                      >
                        {actionLoadingId === prop.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>إرسال للمراجعة</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteListing(prop.id, prop.title)}
                    disabled={actionLoadingId === prop.id}
                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                    title="حذف العقار"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
