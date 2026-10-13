"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import { AuditEvent, Property } from "@/lib/db/types";
import {
  Building2,
  Users,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  History,
  Loader2,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Search,
  Eye,
  AlertCircle,
  UserCheck,
  UserX,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalProperties: number;
  pendingReviewCount: number;
  publishedCount: number;
  rejectedCount: number;
  draftsCount: number;
  archivedCount: number;
  soldCount: number;
  totalAdvertisers: number;
  activeAdvertisers: number;
  suspendedAdvertisers: number;
  totalInquiries: number;
  pendingReportsCount: number;
  totalReportsCount: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ propertyId: string; title: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, auditRes, pendingRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/audit"),
        fetch("/api/admin/moderation?status=pending_review"),
      ]);

      if (statsRes.status === 401 || statsRes.status === 403) {
        setError("غير مصرح لك بالوصول إلى لوحة الإدارة. يجب تسجيل الدخول بحساب مسؤول (Admin).");
        setLoading(false);
        return;
      }

      const statsData = await statsRes.json();
      const auditData = await auditRes.json();
      const pendingData = await pendingRes.json();

      if (statsData.stats) setStats(statsData.stats);
      if (auditData.auditEvents) setAuditLogs(auditData.auditEvents);
      if (pendingData.properties) setPendingProperties(pendingData.properties);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء الاتصال بالخادم لجلب بيانات الإدارة.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (propertyId: string) => {
    setActionLoading(propertyId);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          decision: "approve",
        }),
      });

      if (res.ok) {
        setPendingProperties((prev) => prev.filter((p) => p.id !== propertyId));
        if (stats) {
          setStats({
            ...stats,
            pendingReviewCount: Math.max(0, stats.pendingReviewCount - 1),
            publishedCount: stats.publishedCount + 1,
          });
        }
      } else {
        const data = await res.json();
        alert(data.error || "فشلت عملية الموافقة");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ في الاتصال");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionModal) return;
    if (!rejectionReason.trim()) {
      alert("سبب الرفض إلزامي لتوضيح المخالفة للمعلن");
      return;
    }

    setActionLoading(rejectionModal.propertyId);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: rejectionModal.propertyId,
          decision: "reject",
          reason: rejectionReason.trim(),
        }),
      });

      if (res.ok) {
        setPendingProperties((prev) => prev.filter((p) => p.id !== rejectionModal.propertyId));
        if (stats) {
          setStats({
            ...stats,
            pendingReviewCount: Math.max(0, stats.pendingReviewCount - 1),
            rejectedCount: stats.rejectedCount + 1,
          });
        }
        setRejectionModal(null);
        setRejectionReason("");
      } else {
        const data = await res.json();
        alert(data.error || "فشلت عملية الرفض");
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء رفض الإعلان");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
        <p className="text-slate-600 font-bold text-sm">جاري تحميل لوحة التحكم المركزية...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 text-white shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">بوابة الإدارة المركزية (AqarPulse Admin)</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              يتطلب هذا القسم صلاحيات مسؤول النظام (Admin) لمراجعة العقارات وإدارة العمليات.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/login?role=admin"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 block"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تسجيل الدخول بحساب مسؤول (Admin Login)</span>
            </Link>

            <Link
              href="/"
              className="text-[11px] font-bold text-slate-500 hover:text-slate-400 block pt-1"
            >
              العودة للموقع الرئيسي
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <AdminNav
        pendingCount={stats?.pendingReviewCount}
        reportsCount={stats?.pendingReportsCount}
      />

      {/* Operational Metrics Cards */}
      {stats && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>مؤشرات الأداء العقاري والعمليات الحية</span>
              <span className="text-[11px] font-normal text-slate-400 font-mono">Real DB Metrics</span>
            </h2>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Properties */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي العقارات</span>
              <span className="text-2xl font-black text-slate-900">{stats.totalProperties}</span>
              <span className="text-[10px] text-slate-400 block mt-1">كل الحالات المسجلة</span>
            </div>

            {/* Published */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">عقارات منشورة</span>
              <span className="text-2xl font-black text-emerald-600">{stats.publishedCount}</span>
              <span className="text-[10px] text-emerald-600 font-bold block mt-1">معروضة للمشترين</span>
            </div>

            {/* Pending Review */}
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-amber-800 block mb-1">بانتظار المراجعة</span>
              <span className="text-2xl font-black text-amber-600">{stats.pendingReviewCount}</span>
              <Link
                href="/admin/properties?status=pending_review"
                className="text-[10px] text-amber-700 font-bold block mt-1 hover:underline"
              >
                مراجعة الآن &larr;
              </Link>
            </div>

            {/* Rejected */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">إعلانات مرفوضة</span>
              <span className="text-2xl font-black text-rose-600">{stats.rejectedCount}</span>
              <span className="text-[10px] text-slate-400 block mt-1">بسبب مخالفات</span>
            </div>

            {/* Drafts */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">مسودات معلنين</span>
              <span className="text-2xl font-black text-slate-600">{stats.draftsCount}</span>
              <span className="text-[10px] text-slate-400 block mt-1">غير مكتملة التقديم</span>
            </div>

            {/* Sold / Closed */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">تم البيع / الإيجار</span>
              <span className="text-2xl font-black text-blue-600">{stats.soldCount}</span>
              <span className="text-[10px] text-slate-400 block mt-1">صفقات مكتملة</span>
            </div>
          </div>

          {/* Advertiser & Reports Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">إجمالي المعلنين</span>
                <span className="text-xl font-black text-slate-900">{stats.totalAdvertisers}</span>
              </div>
              <Users className="w-6 h-6 text-slate-400" />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">معلنون نشطون</span>
                <span className="text-xl font-black text-emerald-600">{stats.activeAdvertisers}</span>
              </div>
              <UserCheck className="w-6 h-6 text-emerald-500" />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">حسابات معلقة</span>
                <span className="text-xl font-black text-rose-600">{stats.suspendedAdvertisers}</span>
              </div>
              <UserX className="w-6 h-6 text-rose-500" />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">بلاغات قيد الفحص</span>
                <span className="text-xl font-black text-amber-600">{stats.pendingReportsCount}</span>
              </div>
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </section>
      )}

      {/* Moderation Fast Queue */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                قائمة الإعلانات العاجلة بانتظار المراجعة ({pendingProperties.length})
              </h3>
              <p className="text-xs text-slate-500">
                يتعين التحقق من دقة الأسعار والمواصفات وخيارات حجب الإحداثيات قبل الموافقة
              </p>
            </div>
          </div>
          <Link
            href="/admin/properties"
            className="text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline"
          >
            عرض جميع العقارات مع الفلاتر &larr;
          </Link>
        </div>

        {pendingProperties.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <span className="font-bold text-slate-700 text-sm block">لا توجد إعلانات معلقة في قائمة المراجعة</span>
            <p className="mt-1">تمت مراجعة واعتماد أو رفض جميع الإعلانات المقدمة مؤخراً.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingProperties.slice(0, 5).map((property) => (
              <div
                key={property.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">{property.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                      {property.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        property.locationPrivacy === "approximate"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {property.locationPrivacy === "approximate" ? "موقع تقريبي (محمي)" : "موقع دقيق"}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    السعر: <strong className="text-brand-700">{property.price.toLocaleString("ar-EG")} ج.م</strong> • المساحة: {property.areaSqM} م² • {property.addressDetails}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    معرف الإعلان: {property.id} • تاريخ التقديم: {new Date(property.createdAt).toLocaleDateString("ar-EG")}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={actionLoading === property.id}
                    onClick={() => handleApprove(property.id)}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>موافقة ونشر</span>
                  </button>

                  <button
                    disabled={actionLoading === property.id}
                    onClick={() => setRejectionModal({ propertyId: property.id, title: property.title })}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>رفض مع سبب</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Audit Log Table */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                سجل التدقيق الأمني والعمليات الإدارية (Audit Trail)
              </h3>
              <p className="text-xs text-slate-400">سجل تراكمي آمن غير قابل للحذف (Append-Only Log)</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">آخر {auditLogs.length} عملية مسجلة</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            لا توجد عمليات تدقيق مسجلة حتى الآن.
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">نوع الإجراء (Action)</th>
                    <th className="p-3">نوع الكيان</th>
                    <th className="p-3">المعرف</th>
                    <th className="p-3">المسؤول المنفذ</th>
                    <th className="p-3">التفاصيل</th>
                    <th className="p-3">التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {auditLogs.slice(0, 15).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-brand-700">{log.action}</td>
                      <td className="p-3 text-slate-600">{log.entityType}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{log.entityId}</td>
                      <td className="p-3 text-slate-600">{log.userId || "النظام التلقائي"}</td>
                      <td className="p-3 text-slate-500 max-w-xs truncate text-[11px]">
                        {log.details ? JSON.stringify(log.details) : "-"}
                      </td>
                      <td className="p-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(log.timestamp).toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Vertical Cards View (Strictly Vertical, No Horizontal Scroll) */}
            <div className="block md:hidden space-y-2.5">
              {auditLogs.slice(0, 15).map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-md text-[11px] border border-brand-200">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(log.timestamp).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                    <span>{log.entityType} • <span className="font-mono text-slate-400">{log.entityId}</span></span>
                    <span className="text-slate-700 font-bold">{log.userId || "النظام التلقائي"}</span>
                  </div>
                  {log.details && (
                    <p className="text-[10px] font-mono text-slate-500 bg-white p-2 rounded-xl border border-slate-100 truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Mandatory Rejection Reason Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>رفض الإعلان العقاري</span>
              </h3>
              <button
                onClick={() => setRejectionModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              إعلان: <strong className="text-slate-900">{rejectionModal.title}</strong>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                سبب الرفض الإلزامي (سيتم إرساله للمعلن وحفظه بسجل التدقيق):
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="مثال: الإحداثيات المحددة لا تتطابق مع العنوان، أو الصور تحتوي على علامات مائية مخالفة..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            {/* Quick Presets */}
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
                    onClick={() => setRejectionReason(preset)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold border border-slate-200 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectionModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                disabled={actionLoading !== null || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
