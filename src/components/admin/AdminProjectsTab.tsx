"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  Eye,
  Check,
  ChevronDown,
  Sparkles,
  Layers,
  MapPin,
  Calendar,
  User,
  Phone,
} from "lucide-react";

interface PropertyItem {
  id: string;
  title: string;
  slug?: string;
  status: "pending_review" | "published" | "rejected" | "suspended" | "draft";
  price: number;
  category: string;
  transactionType: string;
  cityId?: string;
  cityName?: string;
  districtName?: string;
  advertiserId?: string;
  advertiserName?: string;
  advertiserPhone?: string;
  images?: Array<string | { url: string }>;
  createdAt?: string;
}

export default function AdminProjectsTab() {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; property: PropertyItem | null; reason: string }>({
    open: false,
    property: null,
    reason: "",
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; property: PropertyItem | null }>({
    open: false,
    property: null,
  });
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/properties?limit=100", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch (err) {
      console.error("Failed to fetch properties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleApprove = async (prop: PropertyItem) => {
    setActionLoading(prop.id);
    setFeedbackMsg(null);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: prop.id, decision: "approve" }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({ type: "success", text: `تمت الموافقة على المشروع "${prop.title}" ونشره بنجاح!` });
        setProperties((prev) =>
          prev.map((p) => (p.id === prop.id ? { ...p, status: "published" } : p))
        );
      } else {
        setFeedbackMsg({ type: "error", text: data.error || "فشلت الموافقة على المشروع" });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "حدث خطأ بالاتصال أثناء الموافقة" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.property || !rejectModal.reason.trim()) {
      alert("يرجى كتابة سبب الرفض لتوضيحه للمعلن");
      return;
    }
    const prop = rejectModal.property;
    setActionLoading(prop.id);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: prop.id,
          decision: "reject",
          reason: rejectModal.reason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({ type: "success", text: `تم رفض المشروع "${prop.title}" وإخطار المعلن بالسبب.` });
        setProperties((prev) =>
          prev.map((p) => (p.id === prop.id ? { ...p, status: "rejected" } : p))
        );
        setRejectModal({ open: false, property: null, reason: "" });
      } else {
        setFeedbackMsg({ type: "error", text: data.error || "فشل تسجيل رفض المشروع" });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "خطأ أثناء تسجيل الرفض" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.property) return;
    const prop = deleteModal.property;
    setActionLoading(prop.id);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: prop.id,
          decision: "delete",
          reason: "حذف نهائي بواسطة شركة الإدارة",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({ type: "success", text: `تم حذف المشروع "${prop.title}" نهائياً من النظام.` });
        setProperties((prev) => prev.filter((p) => p.id !== prop.id));
        setDeleteModal({ open: false, property: null });
      } else {
        setFeedbackMsg({ type: "error", text: data.error || "فشل حذف المشروع" });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "خطأ أثناء حذف المشروع" });
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered list
  const filtered = properties.filter((p) => {
    const matchesSearch =
      !search ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.advertiserName?.toLowerCase().includes(search.toLowerCase()) ||
      p.cityName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && p.status === "pending_review") ||
      (statusFilter === "published" && p.status === "published") ||
      (statusFilter === "rejected" && p.status === "rejected") ||
      (statusFilter === "suspended" && p.status === "suspended");

    return matchesSearch && matchesStatus;
  });

  const pendingCount = properties.filter((p) => p.status === "pending_review").length;
  const publishedCount = properties.filter((p) => p.status === "published").length;
  const rejectedCount = properties.filter((p) => p.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-black uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>شركة الإدارة • إدارة وقبول المشاريع</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            لوحة الإشراف على المشاريع والعقارات
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة المشروعات الجديدة، التدقيق على الاشتراطات، الاعتماد الفوري، أو الرفض مع إبداء الملاحظات.
          </p>
        </div>

        <button
          onClick={fetchProperties}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-700" : ""}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* 2. Quick Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
            statusFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-md"
              : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي المشاريع</span>
          <span className="text-2xl font-black">{properties.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
            statusFilter === "pending"
              ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20"
              : "bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100/60"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-800">بانتظار الموافقة</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-700">{pendingCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("published")}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
            statusFilter === "published"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20"
              : "bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100/60"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-800">منشورة ونشطة</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700">{publishedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
            statusFilter === "rejected"
              ? "bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20"
              : "bg-rose-50 text-rose-950 border-rose-200 hover:bg-rose-100/60"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-800">مرفوضة / معلقة</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <span className="text-2xl font-black text-rose-700">{rejectedCount}</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Search and Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، المعلن، أو المدينة..."
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "الكل" },
            { id: "pending", label: "بانتظار الموافقة" },
            { id: "published", label: "منشورة" },
            { id: "rejected", label: "مرفوضة" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-emerald-700 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Vertical List of Projects */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">جاري تحميل سجل المشاريع من قاعدة البيانات...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800">لا توجد مشاريع تطابق البحث الحالي</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            يمكنك مسح كلمة البحث أو تغيير الفلتر لعرض بقية المشروعات.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((prop) => {
            const firstImg = Array.isArray(prop.images) && prop.images.length > 0
              ? typeof prop.images[0] === "string"
                ? prop.images[0]
                : (prop.images[0] as any).url
              : null;

            const isPending = prop.status === "pending_review";
            const isPublished = prop.status === "published";
            const isRejected = prop.status === "rejected";

            return (
              <div
                key={prop.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Right: Info & Visual */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 relative">
                    {firstImg ? (
                      <img
                        src={firstImg}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Building2 className="w-6 h-6" />
                        <span className="text-[9px] mt-1">بدون صورة</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>بانتظار المراجعة</span>
                        </span>
                      )}
                      {isPublished && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>منشور ونشط</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>مرفوض</span>
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-bold">
                        معرف: #{prop.id.slice(0, 8)}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                      {prop.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <span className="font-black text-emerald-700">
                        {prop.price ? `${Number(prop.price).toLocaleString()} ر.س` : "السعر غير محدد"}
                      </span>
                      {prop.cityName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{prop.cityName} {prop.districtName ? `• ${prop.districtName}` : ""}</span>
                        </span>
                      )}
                      {prop.advertiserName && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>المعلن: {prop.advertiserName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Left: Administrative Control Actions */}
                <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0 flex-wrap justify-end">
                  {/* Preview Button */}
                  <Link
                    href={`/property/${prop.slug || prop.id}`}
                    target="_blank"
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="معاينة الإعلان"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">معاينة</span>
                  </Link>

                  {/* Approve Action */}
                  {!isPublished && (
                    <button
                      onClick={() => handleApprove(prop)}
                      disabled={actionLoading === prop.id}
                      className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>موافقة ونشر</span>
                    </button>
                  )}

                  {/* Reject Action */}
                  {!isRejected && (
                    <button
                      onClick={() => setRejectModal({ open: true, property: prop, reason: "" })}
                      disabled={actionLoading === prop.id}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>رفض</span>
                    </button>
                  )}

                  {/* Permanent Delete Action */}
                  <button
                    onClick={() => setDeleteModal({ open: true, property: prop })}
                    disabled={actionLoading === prop.id}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200 cursor-pointer"
                    title="حذف نهائي"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">حذف</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && rejectModal.property && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">إبداء سبب رفض المشروع</h3>
                <p className="text-xs text-slate-500">
                  مشروع: {rejectModal.property.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              سيتم إشعار المعلن بسبب الرفض ليتمكن من تصحيح البيانات وإعادة التقديم:
            </p>

            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="اكتب سبب الرفض هنا بالتفصيل (مثل: الصور غير واضحة، تفاصيل الموقع ناقصة، مخالف لاشتراطات الإعلان)..."
              rows={4}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, property: null, reason: "" })}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading === rejectModal.property.id || !rejectModal.reason.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-md"
              >
                تأكيد الرفض والإخطار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.open && deleteModal.property && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">حذف المشروع نهائياً</h3>
                <p className="text-xs text-rose-600 font-bold">هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف المشروع{" "}
              <span className="font-black text-slate-900">"{deleteModal.property.title}"</span> بالكامل من قاعدة البيانات؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, property: null })}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading === deleteModal.property.id}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-md"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
