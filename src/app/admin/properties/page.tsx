"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import { Property, City, District, ModerationLog, DuplicateCheckResult } from "@/lib/db/types";
import {
  Building2,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Clock,
  Eye,
  Check,
  X,
  PauseCircle,
  RotateCcw,
  MapPin,
  Tag,
  DollarSign,
  Maximize2,
  User,
  History,
  Loader2,
  Info,
  Trash2,
  MessageSquare,
  Send,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";

interface EnrichedProperty extends Property {
  advertiser?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    isVerified: boolean;
    isSuspended?: boolean;
  };
  potentialDuplicate?: DuplicateCheckResult | null;
  deletionRequest?: {
    id: string;
    message: string;
    createdAt: string;
    senderName: string;
  } | null;
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<EnrichedProperty[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Status Metrics from Backend
  const [metrics, setMetrics] = useState<{
    pendingCount: number;
    publishedCount: number;
    rejectedCount: number;
    suspendedCount: number;
    allCount: number;
    deletionRequestsCount: number;
  }>({
    pendingCount: 0,
    publishedCount: 0,
    rejectedCount: 0,
    suspendedCount: 0,
    allCount: 0,
    deletionRequestsCount: 0,
  });

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Review Drawer / Modal
  const [selectedProperty, setSelectedProperty] = useState<EnrichedProperty | null>(null);
  const [propertyHistory, setPropertyHistory] = useState<ModerationLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Action dialogs
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: "reject" | "suspend";
    propertyId: string;
    propertyTitle: string;
  }>({
    isOpen: false,
    type: "reject",
    propertyId: "",
    propertyTitle: "",
  });
  const [actionReason, setActionReason] = useState("");
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Official Notice & Direct Contact Dialog State (Admin -> Advertiser)
  const [noticeDialog, setNoticeDialog] = useState<{
    isOpen: boolean;
    propertyId: string;
    propertyTitle: string;
    recipientId: string;
    advertiserName?: string;
    advertiserPhone?: string;
    advertiserEmail?: string;
    advertiserRole?: string;
  }>({
    isOpen: false,
    propertyId: "",
    propertyTitle: "",
    recipientId: "",
  });
  const [noticeTitle, setNoticeTitle] = useState("طلب تعديل رسمي على بيانات الإعلان");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeSending, setNoticeSending] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("status");
      if (p) setStatusFilter(p);
    }
    loadTaxonomy();
  }, []);

  useEffect(() => {
    loadProperties();
  }, [statusFilter, typeFilter, categoryFilter, cityFilter]);

  const loadTaxonomy = async () => {
    try {
      const res = await fetch("/api/taxonomy");
      const data = await res.json();
      if (data.cities) setCities(data.cities);
      if (data.districts) setDistricts(data.districts);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProperties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("transactionType", typeFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (cityFilter !== "all") params.append("cityId", cityFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      params.append("limit", "50");

      const res = await fetch(`/api/admin/properties?${params.toString()}`);
      const data = await res.json();
      if (data.properties) {
        setProperties(data.properties);
      }
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProperties();
  };

  const openReviewModal = async (property: EnrichedProperty) => {
    setSelectedProperty(property);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?propertyId=${property.id}`);
      const data = await res.json();
      if (data.history) {
        setPropertyHistory(data.history);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openContactDialog = (property: EnrichedProperty) => {
    setNoticeDialog({
      isOpen: true,
      propertyId: property.id,
      propertyTitle: property.title,
      recipientId: property.advertiserId,
      advertiserName: property.advertiser?.name,
      advertiserPhone: property.advertiser?.phone,
      advertiserEmail: property.advertiser?.email,
      advertiserRole: property.advertiser?.role,
    });
    setNoticeTitle("طلب تعديل رسمي على بيانات الإعلان");
    setNoticeMessage("");
  };

  const executeDecision = async (
    propertyId: string,
    decision: "approve" | "reject" | "suspend" | "restore" | "delete",
    reason?: string
  ) => {
    setActionLoading(propertyId);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          decision,
          reason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const targetProp = properties.find((p) => p.id === propertyId);
        if (decision === "delete" && targetProp?.deletionRequest?.id) {
          fetch("/api/official-notices", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noticeId: targetProp.deletionRequest.id, action: "resolve" }),
          }).catch(console.error);
        }

        if (decision === "delete") {
          setProperties((prev) => prev.filter((p) => p.id !== propertyId));
          setSuccessFeedback("تم حذف العقار بقرار إداري بنجاح وخروجه من كافة السجلات.");
        } else if (decision === "approve" && statusFilter === "pending_review") {
          setProperties((prev) => prev.filter((p) => p.id !== propertyId));
          setSuccessFeedback("تمت الموافقة واعتماد المشروع بنجاح! خرج العقار الآن من «سجل المشاريع المقيدة» وتحول إلى «عقارات منشورة» في حساب المالك/الوسيط وعلى الخريطة.");
        } else if (decision === "reject" && statusFilter === "pending_review") {
          setProperties((prev) => prev.filter((p) => p.id !== propertyId));
          setSuccessFeedback("تم رفض المشروع وخرج من «سجل المشاريع المقيدة» مع إشعار المعلن بسبب الرفض.");
        } else if (decision === "suspend") {
          setSuccessFeedback("تم إخفاء العقار مؤقتاً بنجاح وحجبه عن الخريطة والبحث العام.");
          setProperties((prev) =>
            prev.map((p) => (p.id === propertyId ? { ...p, status: "suspended" } : p))
          );
        } else {
          setProperties((prev) =>
            prev.map((p) => (p.id === propertyId ? { ...p, status: data.property?.status || p.status } : p))
          );
          if (decision === "approve") {
            setSuccessFeedback("تمت الموافقة واعتماد المشروع بنجاح وتحول إلى «عقارات منشورة».");
          } else if (decision === "reject") {
            setSuccessFeedback("تم تسجيل رفض الإعلان بنجاح.");
          }
        }

        if (selectedProperty && selectedProperty.id === propertyId) {
          if (decision === "delete") {
            setSelectedProperty(null);
          } else {
            setSelectedProperty({ ...selectedProperty, status: data.property?.status || selectedProperty.status });
          }
        }
        setDialogState({ isOpen: false, type: "reject", propertyId: "", propertyTitle: "" });
        setActionReason("");
        loadProperties();
      } else {
        alert(data.error || "فشلت العملية");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء تنفيذ الإجراء");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendOfficialNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeMessage.trim()) {
      alert("يرجى كتابة نص التوجيه أو طلب التعديل للمعلن");
      return;
    }
    setNoticeSending(true);
    try {
      const res = await fetch("/api/official-notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: noticeDialog.propertyId,
          propertyTitle: noticeDialog.propertyTitle,
          recipientId: noticeDialog.recipientId,
          type: "edit_request",
          title: noticeTitle.trim(),
          message: noticeMessage.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessFeedback("تم إرسال طلب التعديل الرسمي بنجاح إلى حساب المعلن عبر قناة التواصل الرسمية.");
        setNoticeDialog({ isOpen: false, propertyId: "", propertyTitle: "", recipientId: "" });
        setNoticeMessage("");
      } else {
        alert(data.error || "فشل إرسال المراسلة الرسمية");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setNoticeSending(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">منشور نشط</span>;
      case "pending_review":
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">قيد المراجعة</span>;
      case "rejected":
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">مرفوض</span>;
      case "suspended":
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-bold">معلق</span>;
      case "draft":
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">مسودة</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminNav />

      {/* Success Feedback Banner */}
      {successFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successFeedback}</span>
          </div>
          <button
            onClick={() => setSuccessFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition-colors"
          >
            ✕ إغلاق
          </button>
        </div>
      )}

      {/* 4 Segmented Tab Cards: Restricted Projects vs Published vs Rejected vs All */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter("pending_review")}
          className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
            statusFilter === "pending_review"
              ? "bg-amber-500/10 border-amber-500 text-amber-950 ring-2 ring-amber-500/30 shadow-sm"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black">سجل المشاريع المقيدة ⏳</span>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                statusFilter === "pending_review" ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800"
              }`}>
                {metrics.pendingCount}
              </span>
              <Clock className={`w-4 h-4 ${statusFilter === "pending_review" ? "text-amber-600" : "text-slate-400"}`} />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            عقارات قيد المراجعة والاعتماد
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("published")}
          className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
            statusFilter === "published"
              ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/30 shadow-sm"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black">المشاريع المنشورة المعتمدة ✓</span>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                statusFilter === "published" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"
              }`}>
                {metrics.publishedCount}
              </span>
              <CheckCircle className={`w-4 h-4 ${statusFilter === "published" ? "text-emerald-600" : "text-slate-400"}`} />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            خرجت من المقيدة ومعروضة للعامة
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("rejected")}
          className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
            statusFilter === "rejected"
              ? "bg-rose-500/10 border-rose-500 text-rose-950 ring-2 ring-rose-500/30 shadow-sm"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black">المشاريع المرفوضة ✕</span>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                statusFilter === "rejected" ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-800"
              }`}>
                {metrics.rejectedCount}
              </span>
              <XCircle className={`w-4 h-4 ${statusFilter === "rejected" ? "text-rose-600" : "text-slate-400"}`} />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            مرفوضة مع ذكر السبب الإداري
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
            statusFilter === "all"
              ? "bg-brand-600 text-white border-brand-600 shadow-sm"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black">كافة المشاريع 📋</span>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                statusFilter === "all" ? "bg-white text-brand-900" : "bg-slate-100 text-slate-700"
              }`}>
                {metrics.allCount}
              </span>
              <Building2 className={`w-4 h-4 ${statusFilter === "all" ? "text-white" : "text-slate-400"}`} />
            </div>
          </div>
          <span className={`text-[11px] font-medium ${statusFilter === "all" ? "text-brand-100" : "text-slate-500"}`}>
            سجل العقارات بجميع الحالات
          </span>
        </button>
      </div>

      {/* Deletion Request Alert for Admin */}
      {metrics.deletionRequestsCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-950 font-bold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              يوجد <strong>{metrics.deletionRequestsCount}</strong> طلب حذف رسمي معلق وارد من المعلنين لعقارات منشورة — بصفتك الإدارة، تملك القرار الحصري للموافقة على الحذف أو الرفض أو التواصل مع المعلن.
            </span>
          </div>
          <button
            onClick={() => setStatusFilter("published")}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs"
          >
            فحص المشاريع المنشورة
          </button>
        </div>
      )}

      {/* Notice Banner when viewing Restricted Projects Registry */}
      {statusFilter === "pending_review" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-black text-sm text-amber-950">سجل المشاريع المقيدة (بانتظار المراجعة والاعتماد)</div>
            <p className="text-amber-800 leading-relaxed font-medium">
              جميع العقارات المعروضة هنا مقيدة بانتظار فحص واعتماد الإدارة. بمجرد الضغط على <strong>[ موافقة ونشر الآن ]</strong>، يخرج المشروع فوراً من هذا السجل ويتحول إلى <strong>عقارات منشورة</strong> في حساب المالك أو الوسيط وعلى الخريطة التفاعلية.
            </p>
          </div>
        </div>
      )}

      {/* Header and Filter Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-brand-700" />
              <span>إدارة وتدقيق الإعلانات العقارية</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              فلترة متقدمة، فحص التكرارات، فحص الخصوصية الجغرافية، والتحكم بحالات النشر
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالعنوان، الحي، أو المعرف..."
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              بحث
            </button>
          </form>
        </div>

        {/* Filter Badges / Selects */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">حالة الإعلان</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending_review">قيد المراجعة فقط</option>
              <option value="published">منشور نشط</option>
              <option value="rejected">مرفوض</option>
              <option value="suspended">معلق</option>
              <option value="draft">مسودة</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">نوع المعاملة</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
            >
              <option value="all">الكل (بيع وإيجار)</option>
              <option value="sale">للبيع</option>
              <option value="rent">للإيجار</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">فئة العقار</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
            >
              <option value="all">جميع الفئات</option>
              <option value="apartment">شقة</option>
              <option value="villa">فيلا</option>
              <option value="office">مكتب إداري</option>
              <option value="commercial">تجاري</option>
              <option value="land">أرض</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">المدينة</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
            >
              <option value="all">جميع المدن</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">جاري تحميل قائمة العقارات...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Info className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">لا توجد عقارات مطابقة لمعايير البحث الحالية</p>
            <p className="text-xs">جرب تغيير الفلاتر أو إزالة شروط البحث للعثور على العقارات.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">العقار</th>
                  <th className="p-4">السعر والمعاملة</th>
                  <th className="p-4">المعلن</th>
                  <th className="p-4">الموقع والخصوصية</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {properties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Title & Duplicate Warning */}
                    <td className="p-4 max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-900 text-sm hover:underline cursor-pointer" onClick={() => openReviewModal(prop)}>
                            {prop.title}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                            {prop.category}
                          </span>
                        </div>

                        {prop.potentialDuplicate && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>تنبيه: اشتباه تكرار ({Math.round(prop.potentialDuplicate.confidenceScore * 100)}%)</span>
                          </div>
                        )}

                        {prop.deletionRequest && (
                          <div className="mt-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-[11px] font-bold space-y-1">
                            <div className="flex items-center gap-1 text-rose-700">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>طلب حذف معلق من المعلن ({prop.deletionRequest.senderName})</span>
                            </div>
                            <p className="text-slate-700 font-medium text-[10px] bg-white/80 p-1.5 rounded-lg border border-rose-100">
                              &ldquo;{prop.deletionRequest.message}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          ID: {prop.id} • {new Date(prop.createdAt).toLocaleDateString("ar-EG")}
                        </div>
                      </div>
                    </td>

                    {/* Price & Type */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {prop.price.toLocaleString("ar-EG")} ج.م
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {prop.transactionType === "sale" ? "للبيع" : "للإيجار"} • {prop.areaSqM} م²
                      </div>
                    </td>

                    {/* Advertiser */}
                    <td className="p-4 whitespace-nowrap">
                      {prop.advertiser ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <span>{prop.advertiser.name}</span>
                            {prop.advertiser.isVerified && (
                              <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {prop.advertiser.phone || prop.advertiser.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">غير متوفر</span>
                      )}
                    </td>

                    {/* Location & Privacy */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="text-slate-700 truncate max-w-xs">{prop.addressDetails}</div>
                        <div className="flex items-center gap-1.5">
                          {prop.locationPrivacy === "approximate" ? (
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                              تقريبي (نصف قطر 500م)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              دقيق للعامة
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4 whitespace-nowrap">{statusBadge(prop.status)}</td>

                    {/* Actions Tailored per User Diagram */}
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* 1. Review / View Property Data: Shared for all */}
                        <button
                          onClick={() => openReviewModal(prop)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors shadow-2xs"
                          title="رؤية كافة بيانات العقار والمستندات"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>رؤية البيانات</span>
                        </button>

                        {/* Restricted Projects Registry (Pending Review): Exactly 4 actions per diagram */}
                        {prop.status === "pending_review" && (
                          <>
                            {/* 2. Approve Project */}
                            <button
                              disabled={actionLoading === prop.id}
                              onClick={() => executeDecision(prop.id, "approve")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                              title="قبول العقار واعتماده ونقله للمنشورة"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>قبول العقار</span>
                            </button>

                            {/* 3. Reject Project */}
                            <button
                              disabled={actionLoading === prop.id}
                              onClick={() =>
                                setDialogState({
                                  isOpen: true,
                                  type: "reject",
                                  propertyId: prop.id,
                                  propertyTitle: prop.title,
                                })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors disabled:opacity-50"
                              title="رفض العقار مع ذكر السبب الإداري"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>رفض العقار</span>
                            </button>

                            {/* 4. Contact Owner/Broker */}
                            <button
                              onClick={() => openContactDialog(prop)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors"
                              title="التواصل مع المالك أو الوسيط المسؤول عن العقار"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>تواصل مع المسؤول</span>
                            </button>
                          </>
                        )}

                        {/* Published Projects Registry: Exactly 4 actions per diagram */}
                        {prop.status === "published" && (
                          <>
                            {/* 2. Temporarily Hide Property */}
                            <button
                              disabled={actionLoading === prop.id}
                              onClick={() =>
                                setDialogState({
                                  isOpen: true,
                                  type: "suspend",
                                  propertyId: prop.id,
                                  propertyTitle: prop.title,
                                })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-colors disabled:opacity-50"
                              title="إخفاء العقار مؤقتاً وحجبه عن الخريطة العامة"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              <span>إخفاء مؤقتاً</span>
                            </button>

                            {/* 3. Delete Property (Admin Right) */}
                            <button
                              disabled={actionLoading === prop.id}
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف هذا العقار المنشور نهائياً ("${prop.title}") بقرار إداري حاسم؟\n(يحق للإدارة فقط حذف المنشور وفق نظام الحوكمة).`)) {
                                  executeDecision(prop.id, "delete");
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                              title="حذف العقار المنشور نهائياً بقرار إداري"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف العقار</span>
                            </button>

                            {/* 4. Contact Owner/Broker */}
                            <button
                              onClick={() => openContactDialog(prop)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors"
                              title="التواصل مع المالك أو الوسيط المسؤول عن العقار"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>تواصل مع المسؤول</span>
                            </button>

                            {/* Public Preview Link */}
                            <Link
                              href={`/properties/${prop.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-700 transition-colors"
                              title="معاينة رابط العرض العام"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </>
                        )}

                        {/* Rejected Projects */}
                        {prop.status === "rejected" && (
                          <>
                            <button
                              disabled={actionLoading === prop.id}
                              onClick={() => executeDecision(prop.id, "restore")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs transition-colors disabled:opacity-50"
                              title="استعادة العقار لسجل المشاريع المقيدة لإعادة المراجعة"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>استعادة للمراجعة</span>
                            </button>

                            <button
                              onClick={() => openContactDialog(prop)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors"
                              title="التواصل مع المالك أو الوسيط لتوضيح أسباب الرفض"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>تواصل مع المسؤول</span>
                            </button>

                            <button
                              disabled={actionLoading === prop.id}
                              onClick={() => {
                                if (confirm(`حذف هذا العقار المرفوض نهائياً ("${prop.title}")؟`)) {
                                  executeDecision(prop.id, "delete");
                                }
                              }}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors disabled:opacity-50"
                              title="حذف نهائي"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Suspended / Hidden Projects */}
                        {prop.status === "suspended" && (
                          <>
                            <button
                              disabled={actionLoading === prop.id}
                              onClick={() => executeDecision(prop.id, "approve")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                              title="إلغاء الإخفاء وإعادة النشر للعامة"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>إعادة النشر للعامة</span>
                            </button>

                            <button
                              onClick={() => openContactDialog(prop)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors"
                              title="التواصل مع المسؤول"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>تواصل مع المسؤول</span>
                            </button>

                            <button
                              disabled={actionLoading === prop.id}
                              onClick={() => {
                                if (confirm(`حذف هذا العقار المعلق ("${prop.title}") بقرار إداري؟`)) {
                                  executeDecision(prop.id, "delete");
                                }
                              }}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors disabled:opacity-50"
                              title="حذف نهائي"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Review Drawer / Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-slate-100 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-bold text-xs text-slate-700">
                    {selectedProperty.id}
                  </span>
                  {statusBadge(selectedProperty.status)}
                </div>
                <h3 className="text-lg font-black text-slate-900">{selectedProperty.title}</h3>
              </div>
              <button
                onClick={() => setSelectedProperty(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Duplicate Alert if detected */}
            {selectedProperty.potentialDuplicate && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>تنبيه نظام الذكاء العقاري: اشتباه تكرار مع إعلان آخر</span>
                </div>
                <div className="text-xs text-amber-800 space-y-1">
                  {selectedProperty.potentialDuplicate.reasons.map((r, i) => (
                    <div key={i}>• {r}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">السعر</span>
                <span className="font-black text-brand-700 text-sm">
                  {selectedProperty.price.toLocaleString("ar-EG")} ج.م
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">المساحة</span>
                <span className="font-bold text-slate-900">{selectedProperty.areaSqM} م²</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">الغرف / الحمامات</span>
                <span className="font-bold text-slate-900">
                  {selectedProperty.bedrooms || 0} غرف • {selectedProperty.bathrooms || 0} حمام
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">التشطيب</span>
                <span className="font-bold text-slate-900">{selectedProperty.finishingStatus || "غير محدد"}</span>
              </div>
            </div>

            {/* Location & Coordinates Security */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>بيانات الموقع والخصوصية الجغرافية</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  إحداثيات المشرف: {selectedProperty.lat.toFixed(6)}, {selectedProperty.lng.toFixed(6)}
                </span>
              </div>
              <p className="text-slate-600">{selectedProperty.addressDetails}</p>
              <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">
                {selectedProperty.locationPrivacy === "approximate" ? (
                  <span className="text-purple-800 font-bold">
                    ✓ خصوصية مفعلة: يتم حجب الإحداثيات الدقيقة عن الزوار وتوليد دائرة تقريبية 500 متر لحماية خصوصية العقار.
                  </span>
                ) : (
                  <span className="text-blue-800 font-bold">
                    ✓ موقع دقيق: وافق المعلن على ظهور موقع العقار بدقة للعامة.
                  </span>
                )}
              </div>
            </div>

            {/* Images */}
            {selectedProperty.images && selectedProperty.images.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-xs text-slate-900 block">صور الإعلان المرفقة ({selectedProperty.images.length})</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {selectedProperty.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`صورة ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-xl border border-slate-200"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1 text-xs">
              <span className="font-bold text-slate-900 block">الوصف والتفاصيل الإضافية:</span>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">
                {selectedProperty.description}
              </p>
            </div>

            {/* Moderation History */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-500" />
                <span>سجل المراجعات والقرارات السابقة لهذا الإعلان</span>
              </span>
              {historyLoading ? (
                <div className="p-4 text-center text-xs text-slate-400">جاري جلب السجل...</div>
              ) : propertyHistory.length === 0 ? (
                <div className="p-3 bg-slate-50 text-slate-400 rounded-xl text-xs text-center">
                  لا توجد قرارات مراجعة سابقة مسجلة.
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {propertyHistory.map((h) => (
                    <div key={h.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800">
                          {h.previousStatus} &rarr; {h.newStatus}
                        </span>
                        {h.reason && <p className="text-rose-700 text-[11px] mt-0.5">السبب: {h.reason}</p>}
                      </div>
                      <div className="text-[11px] text-slate-400 text-left font-mono">
                        {h.adminName} • {new Date(h.timestamp).toLocaleDateString("ar-EG")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions Tailored per User Diagram */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 flex-wrap">
              {selectedProperty.status === "pending_review" && (
                <>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => executeDecision(selectedProperty.id, "approve")}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                  >
                    ✓ قبول العقار واعتماده
                  </button>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() =>
                      setDialogState({
                        isOpen: true,
                        type: "reject",
                        propertyId: selectedProperty.id,
                        propertyTitle: selectedProperty.title,
                      })
                    }
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                  >
                    ✕ رفض العقار مع ذكر السبب
                  </button>
                  <button
                    type="button"
                    onClick={() => openContactDialog(selectedProperty)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
                  >
                    💬 تواصل مع المسؤول
                  </button>
                </>
              )}

              {selectedProperty.status === "published" && (
                <>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() =>
                      setDialogState({
                        isOpen: true,
                        type: "suspend",
                        propertyId: selectedProperty.id,
                        propertyTitle: selectedProperty.title,
                      })
                    }
                    className="px-5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    ⏸️ إخفاء مؤقتاً
                  </button>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف هذا العقار المنشور نهائياً ("${selectedProperty.title}") بقرار إداري حاسم؟`)) {
                        executeDecision(selectedProperty.id, "delete");
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                  >
                    🗑️ حذف العقار
                  </button>
                  <button
                    type="button"
                    onClick={() => openContactDialog(selectedProperty)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
                  >
                    💬 تواصل مع المسؤول
                  </button>
                  <Link
                    href={`/properties/${selectedProperty.slug}`}
                    target="_blank"
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>رابط العرض العام</span>
                  </Link>
                </>
              )}

              {selectedProperty.status === "rejected" && (
                <>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => executeDecision(selectedProperty.id, "restore")}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    🔄 استعادة للمراجعة
                  </button>
                  <button
                    type="button"
                    onClick={() => openContactDialog(selectedProperty)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
                  >
                    💬 تواصل مع المسؤول
                  </button>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => {
                      if (confirm(`حذف هذا العقار المرفوض نهائياً ("${selectedProperty.title}")؟`)) {
                        executeDecision(selectedProperty.id, "delete");
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    🗑️ حذف نهائي
                  </button>
                </>
              )}

              {selectedProperty.status === "suspended" && (
                <>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => executeDecision(selectedProperty.id, "approve")}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    ✓ إعادة النشر للعامة
                  </button>
                  <button
                    type="button"
                    onClick={() => openContactDialog(selectedProperty)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
                  >
                    💬 تواصل مع المسؤول
                  </button>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => {
                      if (confirm(`حذف هذا العقار المعلق ("${selectedProperty.title}") بقرار إداري؟`)) {
                        executeDecision(selectedProperty.id, "delete");
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    🗑️ حذف العقار
                  </button>
                </>
              )}

              <button
                onClick={() => setSelectedProperty(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Reason Dialog for Reject / Suspend */}
      {dialogState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                {dialogState.type === "reject" ? (
                  <XCircle className="w-5 h-5 text-rose-600" />
                ) : (
                  <PauseCircle className="w-5 h-5 text-slate-700" />
                )}
                <span>
                  {dialogState.type === "reject" ? "رفض الإعلان العقاري" : "تعليق الإعلان العقاري"}
                </span>
              </h3>
              <button
                onClick={() => setDialogState({ isOpen: false, type: "reject", propertyId: "", propertyTitle: "" })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              العقار: <strong className="text-slate-900">{dialogState.propertyTitle}</strong>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                {dialogState.type === "reject"
                  ? "سبب الرفض الإلزامي (يتم إرساله للمعلن):"
                  : "سبب تعليق الإعلان الإلزامي:"}
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
                placeholder="وضح السبب بالتفصيل لتوثيقه في سجل التدقيق..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {dialogState.type === "reject" && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">أسباب شائعة جاهزة للاختيار:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "صور غير واضحة أو مخالفة",
                    "السعر أو المساحة غير منطقية",
                    "الموقع الجغرافي غير دقيق",
                    "إعلان مكرر لنفس العقار",
                    "تفاصيل ومواصفات غير مكتملة",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setActionReason(preset)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold border border-slate-200 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDialogState({ isOpen: false, type: "reject", propertyId: "", propertyTitle: "" })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                disabled={actionLoading !== null || !actionReason.trim()}
                onClick={() =>
                  executeDecision(
                    dialogState.propertyId,
                    dialogState.type,
                    actionReason.trim()
                  )
                }
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-colors disabled:opacity-50 ${
                  dialogState.type === "reject"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-800 hover:bg-slate-900"
                }`}
              >
                تأكيد الإجراء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Notice Modal (Admin -> Advertiser) */}
      {noticeDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">إرسال طلب تعديل رسمي للمعلن</h3>
                  <p className="text-[11px] text-slate-500 font-medium">عبر قناة التواصل الرسمية التفاعلية</p>
                </div>
              </div>
              <button
                onClick={() => setNoticeDialog({ isOpen: false, propertyId: "", propertyTitle: "", recipientId: "" })}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>{noticeDialog.advertiserName || "المعلن المسؤول"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    {noticeDialog.advertiserRole === "broker" ? "وسيط عقاري" : "مالك العقار"}
                  </span>
                </div>
              </div>

              {/* Direct Instant Channels: Call & WhatsApp */}
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                {noticeDialog.advertiserPhone && (
                  <>
                    <a
                      href={`tel:${noticeDialog.advertiserPhone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-bold border border-slate-200 hover:border-emerald-300 transition-colors shadow-2xs"
                      title="اتصال هاتفي مباشر"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{noticeDialog.advertiserPhone}</span>
                    </a>
                    <a
                      href={`https://wa.me/${noticeDialog.advertiserPhone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs text-[11px]"
                      title="مراسلة واتساب فورية"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب فوري</span>
                    </a>
                  </>
                )}
                {noticeDialog.advertiserEmail && (
                  <a
                    href={`mailto:${noticeDialog.advertiserEmail}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 transition-colors shadow-2xs text-[11px]"
                    title="مراسلة بريدية"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate max-w-[150px]">{noticeDialog.advertiserEmail}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-950 flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">العقار: {noticeDialog.propertyTitle}</span>
            </div>

            <form onSubmit={handleSendOfficialNotice} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان التوجيه الرسمي:</label>
                <input
                  type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نص الملاحظات والتعديلات المطلوبة:</label>
                <textarea
                  rows={4}
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  placeholder="مثال: يرجى توضيح الدور السكني بدقة، وتعديل السعر ليكون شاملاً وديعة الصيانة..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNoticeDialog({ isOpen: false, propertyId: "", propertyTitle: "", recipientId: "" })}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={noticeSending || !noticeMessage.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
                >
                  {noticeSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>إرسال التوجيه للمعلن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
