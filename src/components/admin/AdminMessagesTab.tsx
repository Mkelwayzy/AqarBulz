"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  RefreshCw,
  User,
  Phone,
  Mail,
  Building2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
  Send,
  MessageCircle,
  X,
  ArrowRight,
  Filter,
} from "lucide-react";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: "seeker" | "advertiser" | "admin" | string;
  content: string;
  createdAt: string;
}

interface InquiryItem {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  propertySlug?: string;
  seekerId: string;
  seekerName: string;
  seekerPhone: string;
  seekerEmail?: string;
  advertiserId: string;
  advertiserName?: string;
  advertiserPhone?: string;
  message: string;
  preferredContact?: "call" | "whatsapp" | "in_app";
  status: "new" | "contacted" | "closed" | string;
  createdAt: string;
  messages?: ChatMessage[];
}

export default function AdminMessagesTab() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeInquiry, setActiveInquiry] = useState<InquiryItem | null>(null);
  const [filterContact, setFilterContact] = useState<string>("all");

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inquiries?mode=admin", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.inquiries || []);
      }
    } catch (err) {
      console.error("Failed to fetch admin inquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const filtered = inquiries.filter((inq) => {
    const matchesSearch =
      !search ||
      inq.seekerName?.toLowerCase().includes(search.toLowerCase()) ||
      inq.seekerPhone?.includes(search) ||
      inq.propertyTitle?.toLowerCase().includes(search.toLowerCase()) ||
      inq.message?.toLowerCase().includes(search.toLowerCase());

    const matchesContact =
      filterContact === "all" ||
      inq.preferredContact === filterContact;

    return matchesSearch && matchesContact;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-black uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>شركة الإدارة • مراقبة المحادثات والرسائل</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            متابعة التواصل بين العملاء والملاك / الوسطاء
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            الإشراف المركزي والتدقيق على جودة التواصل والرسائل المتبادلة لمنع المخالفات وضمان رضا المستفيدين.
          </p>
        </div>

        <button
          onClick={fetchInquiries}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-700" : ""}`} />
          <span>تحديث المحادثات</span>
        </button>
      </div>

      {/* 2. Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي المحادثات والطلبات</span>
          <span className="text-2xl font-black text-slate-900">{inquiries.length}</span>
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-800">تواصل عبر الواتساب</span>
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700">
            {inquiries.filter((i) => i.preferredContact === "whatsapp").length}
          </span>
        </div>

        <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-sky-800">مراسلات ومكالمات</span>
            <Phone className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <span className="text-2xl font-black text-sky-700">
            {inquiries.filter((i) => i.preferredContact !== "whatsapp").length}
          </span>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم العميل، رقم الهاتف، أو اسم المشروع العقاري..."
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "كافة القنوات" },
            { id: "whatsapp", label: "واتساب" },
            { id: "call", label: "اتصال هاتفي" },
            { id: "in_app", label: "داخل التطبيق" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterContact(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterContact === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Inquiries List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">جاري قراءة سجل الرسائل والمحادثات...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800">لا توجد رسائل مسجلة حالياً</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            عند قيام أي عميل بالتواصل مع مالك عقار أو وسيط، ستظهر تفاصيل الرسالة والمحادثة هنا للرقابة والمتابعة.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((inq) => {
            const hasMultipleMessages = Array.isArray(inq.messages) && inq.messages.length > 0;
            const messageCount = hasMultipleMessages ? inq.messages!.length : 1;

            return (
              <div
                key={inq.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>العميل: {inq.seekerName || "زائر"}</span>
                    </span>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span dir="ltr">{inq.seekerPhone}</span>
                    </span>

                    {inq.preferredContact && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                        {inq.preferredContact === "whatsapp"
                          ? "عبر الواتساب"
                          : inq.preferredContact === "call"
                          ? "اتصال هاتفي"
                          : "رسالة داخل التطبيق"}
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{inq.createdAt ? new Date(inq.createdAt).toLocaleDateString("ar-SA") : "الآن"}</span>
                    </span>
                  </div>

                  {/* Target project */}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>المشروع المرتبط:</span>
                    <span className="text-emerald-700 truncate">{inq.propertyTitle || `عقار #${inq.propertyId}`}</span>
                  </div>

                  {/* Message snippet */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium leading-relaxed">
                    "{inq.message}"
                  </div>
                </div>

                {/* Inspect Thread Action */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={() => setActiveInquiry(inq)}
                    className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>فحص سجل المحادثة الكامل ({messageCount})</span>
                  </button>

                  {inq.seekerPhone && (
                    <>
                      <a
                        href={`tel:${inq.seekerPhone.replace(/[^0-9+]/g, "")}`}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors border border-slate-200"
                        title="اتصال هاتفي بالعميل"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      <a
                        href={`https://wa.me/${inq.seekerPhone.replace(/\+/g, "").replace(/\s/g, "")}?text=${encodeURIComponent(
                          `مرحباً ${inq.seekerName}، بخصوص طلبك على منصة نبض العقار.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200"
                        title="فتح واتساب العميل"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Thread Modal */}
      {activeInquiry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">سجل المحادثة وتدقيق التواصل</h3>
                  <p className="text-xs text-slate-500">
                    العميل: {activeInquiry.seekerName} • الهاتف: {activeInquiry.seekerPhone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveInquiry(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Property meta */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-slate-700">المشروع المعني:</span>
                <span className="font-black text-slate-900">{activeInquiry.propertyTitle || activeInquiry.propertyId}</span>
              </div>

              <Link
                href={`/property/${activeInquiry.propertyId}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
              >
                <span>معاينة الإعلان</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Chat Transcript Body */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-100/70 rounded-2xl min-h-[220px] max-h-[360px]">
              {/* Initial message */}
              <div className="flex flex-col items-start space-y-1">
                <span className="text-[10px] font-black text-slate-500 px-1">
                  {activeInquiry.seekerName} (العميل):
                </span>
                <div className="bg-white border border-slate-200 text-slate-800 p-3.5 rounded-2xl rounded-tr-xs shadow-2xs max-w-[85%] text-xs font-medium leading-relaxed">
                  {activeInquiry.message}
                </div>
                <span className="text-[9px] text-slate-400 px-1">
                  {activeInquiry.createdAt ? new Date(activeInquiry.createdAt).toLocaleString("ar-SA") : ""}
                </span>
              </div>

              {/* Sub-messages if any */}
              {activeInquiry.messages && activeInquiry.messages.map((m) => {
                const isSeeker = m.senderRole === "seeker" || m.senderId === activeInquiry.seekerId;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isSeeker ? "items-start" : "items-end"} space-y-1`}
                  >
                    <span className="text-[10px] font-black text-slate-500 px-1">
                      {isSeeker ? `${activeInquiry.seekerName} (العميل)` : "المالك / الوسيط"}:
                    </span>
                    <div
                      className={`p-3.5 rounded-2xl shadow-2xs max-w-[85%] text-xs font-medium leading-relaxed ${
                        isSeeker
                          ? "bg-white border border-slate-200 text-slate-800 rounded-tr-xs"
                          : "bg-emerald-700 text-white rounded-tl-xs"
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-[9px] text-slate-400 px-1">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString("ar-SA") : ""}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Direct Admin Quick Action */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] font-medium text-slate-400">
                تسجيل المحادثة مشفر وموثق لأغراض الأمان والنزاهة التعاقدية.
              </span>
              <button
                type="button"
                onClick={() => setActiveInquiry(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer"
              >
                إغلاق الفحص
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
