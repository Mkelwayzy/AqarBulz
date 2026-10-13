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
  RotateCcw,
  Edit3,
  XCircle,
  AlertTriangle,
  PauseCircle,
  Play,
} from "lucide-react";
import { Property } from "@/lib/db/types";
import EditPropertyModal from "@/components/properties/EditPropertyModal";
import RequestDeletionModal from "@/components/properties/RequestDeletionModal";
import OfficialNoticesList from "@/components/dashboard/OfficialNoticesList";
import ListingQualityScore from "@/components/property/ListingQualityScore";

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
  description?: string;
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
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletionRequestProperty, setDeletionRequestProperty] = useState<Property | null>(null);

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

  // Retract listing back to draft
  const handleRetractToDraft = async (id: string) => {
    if (
      !confirm(
        "هل تريد التراجع عن إرسال هذا العقار وسحبه من سجل المشاريع المقيدة ليعود كمسودة خاصة وتعديل بياناته؟"
      )
    ) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (res.ok) {
        await fetchOwnerListings(currentTab);
      } else {
        const err = await res.json();
        alert(err.error || "فشل التراجع عن الإرسال");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle Pause (Sold / Temporarily Paused) status
  const handleTogglePauseStatus = async (id: string, currentStatus: string) => {
    const isPaused = currentStatus === "paused";
    const newStatus = isPaused ? "published" : "paused";
    const confirmMsg = isPaused
      ? "هل تريد إعادة تفعيل العقار واستئناف نشره للعامة على الخريطة التفاعلية وقوائم البحث؟"
      : "هل تريد إيقاف عرض العقار مؤقتاً (مثلاً: تم البيع أو التفاوض) وحجبه عن الخريطة العامة مع حفظه في أرشيفك؟";

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchOwnerListings(currentTab);
      } else {
        const err = await res.json();
        alert(err.error || "فشل تغيير حالة العرض");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete listing (strictly for drafts, pending review, or rejected)
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>بند عقارات منشورة (معتمد)</span>
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-800 text-white shadow-xs">
            <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>متوقف مؤقتاً (تم البيع / معلق)</span>
          </span>
        );
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-950 border border-amber-300 shadow-xs animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>بند قيد المراجعة (في سجل المشاريع المقيدة)</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-950 border border-rose-300 shadow-xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>لم توافق الإدارة على المشروع (مرفوض)</span>
          </span>
        );
      case "draft":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
            <FileText className="w-3.5 h-3.5 text-slate-600" />
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

      {/* Official Admin Communication Channel Notices */}
      <OfficialNoticesList
        onOpenEditProperty={(propId) => {
          const target = properties.find((p) => p.id === propId);
          if (target) setEditingProperty(target as any);
        }}
      />

      {/* Tabs - Vertical-first responsive grid (no horizontal scrolling) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-3 border-b border-slate-200 text-xs font-bold">
        {[
          { key: "all", label: "كافة العقارات", count: metrics.total },
          { key: "published", label: "عقارات منشورة", count: metrics.published, color: "emerald" },
          { key: "pending_review", label: "قيد المراجعة", count: metrics.pending, color: "amber" },
          { key: "draft", label: "المسودات", count: metrics.drafts, color: "slate" },
          { key: "rejected", label: "المرفوضة", count: metrics.rejected, color: "rose" },
        ].map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCurrentTab(tab.key as any)}
              className={`p-2.5 rounded-xl transition flex items-center justify-between gap-1.5 ${
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
                <div className="space-y-2.5">
                  <div className="text-lg font-black text-brand-800">
                    {prop.price?.toLocaleString("ar-EG")} <span className="text-xs">ج.م</span>
                  </div>
                  <h3 className="font-black text-sm text-slate-900 line-clamp-1" title={prop.title}>
                    {prop.title}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{prop.addressDetails || "موقع متميز، مصر"}</span>
                  </div>

                  {/* مؤشر جاهزية الإعلان للمالك (Listing Quality Score) */}
                  <ListingQualityScore property={prop} />

                  {/* Pending Review Notice & Retraction */}
                  {prop.status === "pending_review" && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-950 text-xs space-y-2">
                      <div className="flex items-start gap-1.5 font-bold">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>العقار مسجل في سجل المشاريع المقيدة لدى الإدارة:</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleRetractToDraft(prop.id)}
                          disabled={actionLoadingId === prop.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>تراجع وسحب كمسودة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProperty(prop as any)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 font-bold text-[11px] transition cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>تعديل ✏️</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rejected Rejection Banner & Quick Retract/Resubmit */}
                  {prop.status === "rejected" && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs space-y-2">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <span className="font-black text-rose-900">سبب عدم موافقة الإدارة: </span>
                          <span className="font-medium text-rose-800">
                            {prop.moderationNotes || "يرجى مراجعة تفاصيل وسعر ومواصفات العقار وتصحيحها لإعادة النشر."}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-rose-200">
                        <button
                          type="button"
                          onClick={() => setEditingProperty(prop as any)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>تعديل وإعادة التقديم ✏️</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRetractToDraft(prop.id)}
                          disabled={actionLoadingId === prop.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 font-bold text-[11px] transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>تراجع كمسودة 💾</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitForReview(prop.id)}
                          disabled={actionLoadingId === prop.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] shadow-xs transition cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>إرسال للإدارة 🚀</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Draft Notice */}
                  {prop.status === "draft" && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center justify-between gap-2">
                      <span className="font-medium">مسودة غير مرسلة</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingProperty(prop as any)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-[11px] transition cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitForReview(prop.id)}
                          disabled={actionLoadingId === prop.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>إرسال 🚀</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* General In-place Edit Button */}
                    <button
                      type="button"
                      onClick={() => setEditingProperty(prop as any)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      title="تعديل بيانات الإعلان"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>تعديل ومراجعة</span>
                    </button>

                    {/* View full page if published */}
                    {prop.status === "published" && (
                      <Link
                        href={`/properties/${prop.slug}`}
                        target="_blank"
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="عرض العقار المنشور"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    )}

                    {/* Pause / Sold toggle for published or paused listings */}
                    {(prop.status === "published" || prop.status === "paused") && (
                      <button
                        type="button"
                        disabled={actionLoadingId === prop.id}
                        onClick={() => handleTogglePauseStatus(prop.id, prop.status)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                          prop.status === "paused"
                            ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
                        }`}
                        title={prop.status === "paused" ? "استئناف العرض على الخريطة" : "وسم تم البيع أو إيقاف العرض مؤقتاً"}
                      >
                        {prop.status === "paused" ? (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-600" />
                            <span>استئناف العرض ▶️</span>
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>تم البيع / إيقاف ⏸️</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Official Deletion Request from Admin for published or paused listings */}
                    {(prop.status === "published" || prop.status === "paused") && (
                      <button
                        type="button"
                        onClick={() => setDeletionRequestProperty(prop as any)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition cursor-pointer"
                        title="إرسال طلب حذف رسمي لإدارة المنصة"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-600" />
                        <span>طلب حذف للإدارة 📨</span>
                      </button>
                    )}
                  </div>

                  {/* Direct Delete Button: STRICTLY for drafts, pending review, or rejected */}
                  {prop.status !== "published" && prop.status !== "paused" && (
                    <button
                      onClick={() => handleDeleteListing(prop.id, prop.title)}
                      disabled={actionLoadingId === prop.id}
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="حذف المشروع مباشرة (مسموح وهو قيد المراجعة)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reusable In-place Property Edit and Retraction Modal */}
      <EditPropertyModal
        property={editingProperty}
        isOpen={editingProperty !== null}
        onClose={() => setEditingProperty(null)}
        onSaved={async () => {
          await fetchOwnerListings(currentTab);
        }}
      />

      {/* Official Deletion Request Modal */}
      <RequestDeletionModal
        property={deletionRequestProperty}
        isOpen={deletionRequestProperty !== null}
        onClose={() => setDeletionRequestProperty(null)}
        onRequested={async () => {
          await fetchOwnerListings(currentTab);
        }}
      />
    </div>
  );
}
