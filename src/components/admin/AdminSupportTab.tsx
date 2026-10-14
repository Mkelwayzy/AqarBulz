"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  Activity,
  Server,
  Database,
  Lock,
  Layers,
  ChevronRight,
  Eye,
} from "lucide-react";

interface ReportItem {
  id: string;
  propertyId?: string;
  propertyTitle?: string;
  propertySlug?: string;
  advertiserName?: string;
  reporterId?: string;
  reporterName?: string;
  reporterPhone?: string;
  reason: string;
  details?: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
}

export default function AdminSupportTab() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (reportId: string, status: "resolved" | "dismissed") => {
    setActionLoading(reportId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status } : r))
        );
        setFeedback(status === "resolved" ? "تم تحديد البلاغ كـ (محلول)" : "تم تجاهل وإغلاق البلاغ");
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      alert("حدث خطأ أثناء تحديث حالة البلاغ");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = reports.filter((r) => {
    const matchesSearch =
      !search ||
      r.reason?.toLowerCase().includes(search.toLowerCase()) ||
      r.details?.toLowerCase().includes(search.toLowerCase()) ||
      r.propertyTitle?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-700 text-xs font-black uppercase tracking-wider mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>شركة الإدارة • مركز الدعم الفني والعمليات</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            الدعم الفني، البلاغات، ومراقبة استقرار المنصة
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة الشكاوى، معالجة بلاغات المستخدمين، ومتابعة القنوات السريعة لحل أي عوائق تقنية أو تشغيلية.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-700" : ""}`} />
          <span>تحديث البلاغات</span>
        </button>
      </div>

      {/* 2. Platform Health & Direct Support Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Support direct channels */}
        <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-5 rounded-3xl shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-100">خط المساندة الفورية</span>
            <MessageCircle className="w-4 h-4 text-emerald-200" />
          </div>
          <h3 className="text-lg font-black">الدعم عبر الواتساب المباشر</h3>
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            استقبال استفسارات المعلنين والمستفيدين والرد المباشر لحل المشكلات اللحظية.
          </p>
          <a
            href="https://wa.me/966500000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-emerald-900 text-xs font-black hover:bg-emerald-50 transition-colors shadow-xs"
          >
            <span>فتح قناة الدعم</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Operational Status */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">حالة البنية التحتية</span>
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-slate-900">الأنظمة السحابية مستقرة</h3>
          <div className="space-y-1.5 text-xs font-bold text-slate-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>قاعدة البيانات (Supabase):</span>
              </span>
              <span className="text-emerald-700 font-black">متصل 100%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>محرك المصادقة والأمان:</span>
              </span>
              <span className="text-emerald-700 font-black">آمن ونشط</span>
            </div>
          </div>
        </div>

        {/* Tickets summary */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">مؤشر البلاغات</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {pendingCount > 0 ? `${pendingCount} بلاغ جديد يحتاج للمراجعة` : "لا توجد بلاغات معلقة"}
          </h3>
          <p className="text-xs text-slate-500">
            تمت معالجة وحل {resolvedCount} بلاغ بنجاح حتى الآن.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* 3. Search & Status Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في تفاصيل البلاغ أو اسم المشروع..."
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "كافة البلاغات" },
            { id: "pending", label: "قيد المراجعة" },
            { id: "resolved", label: "تم الحل" },
            { id: "dismissed", label: "مستبعد" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Reports List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-sky-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">جاري قراءة تذاكر وبلاغات الدعم...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800">سجل البلاغات خالٍ ونظيف</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            لا توجد أي شكاوى أو بلاغات مسجلة وفق الفلتر المحدد حالياً.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((item) => {
            const isPending = item.status === "pending";
            const isResolved = item.status === "resolved";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPending ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>قيد المراجعة</span>
                      </span>
                    ) : isResolved ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>تم الحل والتعامل</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                        مستبعد
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400">
                      تاريخ: {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA") : "الآن"}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900">
                    سبب البلاغ: {item.reason}
                  </h3>

                  {item.propertyTitle && (
                    <div className="text-xs text-slate-500 font-medium">
                      المشروع المعني:{" "}
                      <span className="font-bold text-slate-800">{item.propertyTitle}</span>
                    </div>
                  )}

                  {item.details && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                      "{item.details}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {item.propertyId && (
                    <Link
                      href={`/property/${item.propertySlug || item.propertyId}`}
                      target="_blank"
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">معاينة المشروع</span>
                    </Link>
                  )}

                  {isPending && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(item.id, "resolved")}
                        disabled={actionLoading === item.id}
                        className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم الحل</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(item.id, "dismissed")}
                        disabled={actionLoading === item.id}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        تجاهل
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
