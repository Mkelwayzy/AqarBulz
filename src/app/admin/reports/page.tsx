"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import { PropertyReport, ReportStatus, ReportReasonCategory } from "@/lib/db/types";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Building2,
  Phone,
  User,
  Filter,
  Check,
  X,
  Loader2,
  FileText,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

interface EnrichedReport extends PropertyReport {
  propertyTitle?: string;
  propertySlug?: string;
  propertyStatus?: string;
  propertyPrice?: number;
  advertiserName?: string;
  advertiserId?: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Resolution modal
  const [selectedReport, setSelectedReport] = useState<EnrichedReport | null>(null);
  const [targetStatus, setTargetStatus] = useState<ReportStatus>("resolved");
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const data = await res.json();
      if (data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAction = async () => {
    if (!selectedReport) return;
    setActionLoading(selectedReport.id);

    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReport.id,
          status: targetStatus,
          resolutionNotes: resolutionNotes.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === selectedReport.id
              ? {
                  ...r,
                  status: targetStatus,
                  resolutionNotes: resolutionNotes.trim(),
                  resolvedAt: new Date().toISOString(),
                }
              : r
          )
        );
        setSelectedReport(null);
        setResolutionNotes("");
      } else {
        alert(data.error || "فشلت العملية");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء معالجة البلاغ");
    } finally {
      setActionLoading(null);
    }
  };

  const reasonLabel = (category: ReportReasonCategory) => {
    switch (category) {
      case "misleading_details":
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">بيانات أو صور مضللة</span>;
      case "duplicate_listing":
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">إعلان مكرر</span>;
      case "unavailable":
        return <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">العقار لم يعد متاحاً</span>;
      case "suspected_fraud":
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">اشتباه احتيال أو انتحال</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">محتوى غير لائق</span>;
    }
  };

  const statusBadge = (status: ReportStatus) => {
    switch (status) {
      case "pending":
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">قيد الانتظار</span>;
      case "investigating":
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">قيد الفحص</span>;
      case "resolved":
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">تم الحل والامتثال</span>;
      case "dismissed":
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">مرفوض (بلاغ غير صحيح)</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminNav reportsCount={reports.filter((r) => r.status === "pending").length} />

      {/* Header & Filter */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <span>إدارة بلاغات وشكاوى المحتوى العقاري</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              تدقيق شكاوى الزوار والمشترين بشأن دقة الإعلانات، الأسعار، واشتباه الاحتيال
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">تصفية حسب الحالة:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold"
            >
              <option value="all">جميع البلاغات</option>
              <option value="pending">قيد الانتظار (جديدة)</option>
              <option value="investigating">قيد الفحص والتحقيق</option>
              <option value="resolved">تم الحل</option>
              <option value="dismissed">مرفوضة / ملغاة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">جاري تحميل قائمة البلاغات...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">لا توجد بلاغات مسجلة في هذا القسم</p>
            <p className="text-xs">سجل البلاغات نظيف، ولم يتم تقديم أي شكاوى مطابقة للتصفية الحالية.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">العقار المُبلّغ عنه</th>
                  <th className="p-4">تصنيف المخالفة</th>
                  <th className="p-4">تفاصيل الشكوى</th>
                  <th className="p-4">المُبلّغ</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Property */}
                    <td className="p-4 max-w-xs">
                      <div className="space-y-0.5">
                        <span className="font-black text-slate-900 block text-sm">
                          {report.propertyTitle}
                        </span>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {report.propertyId}
                        </div>
                        {report.advertiserName && (
                          <div className="text-[10px] text-slate-500">
                            المعلن: {report.advertiserName}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Reason Category */}
                    <td className="p-4 whitespace-nowrap">{reasonLabel(report.reasonCategory)}</td>

                    {/* Details */}
                    <td className="p-4 max-w-md">
                      <p className="text-slate-700 leading-relaxed line-clamp-2">
                        {report.details}
                      </p>
                      {report.resolutionNotes && (
                        <p className="text-[11px] text-emerald-700 mt-1 font-bold">
                          قرار المشرف: {report.resolutionNotes}
                        </p>
                      )}
                    </td>

                    {/* Reporter */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-slate-800 font-bold">{report.reporterName}</div>
                      {report.reporterPhone && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {report.reporterPhone}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        {new Date(report.createdAt).toLocaleDateString("ar-EG")}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4 whitespace-nowrap">{statusBadge(report.status)}</td>

                    {/* Actions */}
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setTargetStatus(report.status === "pending" ? "resolved" : report.status);
                            setResolutionNotes(report.resolutionNotes || "");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                        >
                          معالجة البلاغ
                        </button>

                        <Link
                          href={`/admin/properties?search=${report.propertyId}`}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                          title="فحص الإعلان في لوحة الإشراف"
                        >
                          <Building2 className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolution Dialog */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand-700" />
                <span>معالجة بلاغ العقار #{selectedReport.id}</span>
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <span className="font-bold text-slate-900 block">{selectedReport.propertyTitle}</span>
              <p className="text-slate-600">{selectedReport.details}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">اتخاذ قرار المعالجة:</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as ReportStatus)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="resolved">تم الحل (تم التحقق وتصحيح العقار أو اتخاذ إجراء)</option>
                <option value="investigating">قيد التحقيق والفحص</option>
                <option value="dismissed">رفض البلاغ (بلاغ كيدي أو غير صحيح)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                ملاحظات المشرف وإجراءات الامتثال (تُحفظ بسجل التدقيق):
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
                placeholder="وضح الإجراء المتخذ: مثال (تم الاتصال بالمعلن وتحديث السعر، أو تم تعليق الإعلان)..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                disabled={actionLoading !== null}
                onClick={handleResolveAction}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                حفظ القرار وتحديث السجل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
