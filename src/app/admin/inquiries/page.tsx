"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import {
  MessageSquare,
  Phone,
  Mail,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  Check,
  X,
  Loader2,
  RefreshCw,
  Send,
  MessageCircle,
} from "lucide-react";

interface Inquiry {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  seekerName: string;
  seekerPhone: string;
  seekerEmail?: string;
  advertiserId: string;
  message: string;
  preferredContact: "call" | "whatsapp" | "email";
  status: "new" | "contacted" | "closed";
  createdAt: string;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries");
      if (res.status === 401 || res.status === 403) {
        setError("غير مصرح، يجب تسجيل الدخول كمسؤول النظام");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.inquiries) {
        setInquiries(data.inquiries);
      }
    } catch {
      setError("حدث خطأ أثناء تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: Inquiry["status"]) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setInquiries((prev) =>
          prev.map((inq) => (inq.id === id ? { ...inq, status: newStatus } : inq))
        );
      } else {
        const err = await res.json();
        alert(err.error || "فشل تحديث الحالة");
      }
    } catch {
      alert("حدث خطأ في الاتصال");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter inquiries
  const filtered = inquiries.filter((inq) => {
    if (statusFilter !== "all" && inq.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = inq.seekerName?.toLowerCase().includes(q);
      const matchPhone = inq.seekerPhone?.includes(q);
      const matchTitle = inq.propertyTitle?.toLowerCase().includes(q);
      const matchMsg = inq.message?.toLowerCase().includes(q);
      return matchName || matchPhone || matchTitle || matchMsg;
    }
    return true;
  });

  const newCount = inquiries.filter((i) => i.status === "new").length;
  const contactedCount = inquiries.filter((i) => i.status === "contacted").length;
  const closedCount = inquiries.filter((i) => i.status === "closed").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminNav inquiriesCount={newCount} />

      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <span>إدارة طلبات واستفسارات المشترين والعملاء</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            متابعة جميع استفسارات العملاء على العقارات والتواصل معهم وتحديث حالة الطلبات.
          </p>
        </div>

        <button
          onClick={loadInquiries}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-2xl border text-right transition-all ${
            statusFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[11px] font-bold block opacity-75">إجمالي الطلبات</span>
          <span className="text-2xl font-black">{inquiries.length}</span>
        </button>

        <button
          onClick={() => setStatusFilter("new")}
          className={`p-4 rounded-2xl border text-right transition-all ${
            statusFilter === "new"
              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[11px] font-bold text-amber-700 block">طلبات جديدة</span>
          <span className="text-2xl font-black text-amber-600">{newCount}</span>
        </button>

        <button
          onClick={() => setStatusFilter("contacted")}
          className={`p-4 rounded-2xl border text-right transition-all ${
            statusFilter === "contacted"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-700 block">تم التواصل معها</span>
          <span className="text-2xl font-black text-emerald-600">{contactedCount}</span>
        </button>

        <button
          onClick={() => setStatusFilter("closed")}
          className={`p-4 rounded-2xl border text-right transition-all ${
            statusFilter === "closed"
              ? "bg-slate-600 text-white border-slate-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[11px] font-bold text-slate-500 block">مكتملة / مغلقة</span>
          <span className="text-2xl font-black text-slate-600">{closedCount}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="بحث باسم العميل، رقم الهاتف، أو اسم العقار..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-bold">جاري تحميل الاستفسارات والطلبات...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-xs text-rose-800 font-bold">{error}</p>
          <Link
            href="/login?role=admin"
            className="inline-block px-4 py-2 bg-slate-900 text-amber-400 rounded-xl text-xs font-bold"
          >
            تسجيل الدخول كإدارة
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">لا توجد طلبات تطابق الفلتر الحالي</h3>
          <p className="text-xs text-slate-400">ستظهر استفسارات المشترين هنا بمجرد إرسالها من صفحات العقارات.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inq) => {
            const cleanPhone = inq.seekerPhone.replace(/\D/g, "");
            const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
              `مرحباً ${inq.seekerName}، بخصوص استفسارك على منصة نبض العقار حول: ${inq.propertyTitle || "العقار المعروض"}`
            )}`;

            return (
              <div
                key={inq.id}
                className={`bg-white rounded-2xl border p-5 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  inq.status === "new"
                    ? "border-amber-300/80 ring-2 ring-amber-400/20"
                    : inq.status === "contacted"
                    ? "border-emerald-200"
                    : "border-slate-200 opacity-80"
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header: Client & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{inq.seekerName}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(inq.createdAt).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                        inq.status === "new"
                          ? "bg-amber-100 text-amber-800"
                          : inq.status === "contacted"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {inq.status === "new"
                        ? "طلب جديد 🔔"
                        : inq.status === "contacted"
                        ? "تم التواصل ✓"
                        : "مغلق"}
                    </span>
                  </div>

                  {/* Property Link */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">العقار المستفسر عنه:</span>
                    <Link
                      href={`/properties/${inq.propertyId}`}
                      target="_blank"
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{inq.propertyTitle || "معاينة العقار"}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                    </Link>
                  </div>

                  {/* Client Message */}
                  <div className="text-xs text-slate-700 bg-amber-50/40 p-3 rounded-xl border border-amber-100/60 leading-relaxed font-medium">
                    "{inq.message}"
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr" className="font-mono">{inq.seekerPhone}</span>
                    </div>
                    {inq.seekerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{inq.seekerEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* WhatsApp button */}
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>

                    {/* Direct Call */}
                    <a
                      href={`tel:${inq.seekerPhone}`}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال</span>
                    </a>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1 pt-1">
                    {inq.status !== "contacted" && (
                      <button
                        type="button"
                        disabled={updatingId === inq.id}
                        onClick={() => handleUpdateStatus(inq.id, "contacted")}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition-colors disabled:opacity-50"
                      >
                        {updatingId === inq.id ? "جاري..." : "تعيين: تم التواصل"}
                      </button>
                    )}

                    {inq.status !== "closed" && (
                      <button
                        type="button"
                        disabled={updatingId === inq.id}
                        onClick={() => handleUpdateStatus(inq.id, "closed")}
                        className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors disabled:opacity-50"
                      >
                        {updatingId === inq.id ? "جاري..." : "إغلاق الطلب"}
                      </button>
                    )}

                    {inq.status === "closed" && (
                      <button
                        type="button"
                        disabled={updatingId === inq.id}
                        onClick={() => handleUpdateStatus(inq.id, "new")}
                        className="flex-1 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-colors disabled:opacity-50"
                      >
                        إعادة فتح كالطلب جديد
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
