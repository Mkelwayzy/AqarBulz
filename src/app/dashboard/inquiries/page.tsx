"use client";

import React, { useState, useEffect } from "react";
import { User, Inquiry } from "@/lib/db/types";
import {
  MessageSquare,
  MessageCircle,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  Search,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InquiryChatModal from "@/components/chat/InquiryChatModal";

export default function InquiriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [incomingInquiries, setIncomingInquiries] = useState<Inquiry[]>([]);
  const [sentInquiries, setSentInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "incoming" | "sent">("all");
  const [activeChatInquiryId, setActiveChatInquiryId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();

    const handleAuth = () => loadData();
    window.addEventListener("auth-state-changed", handleAuth);
    return () => window.removeEventListener("auth-state-changed", handleAuth);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const meData = await meRes.json();
      setUser(meData.user);

      if (meData.user) {
        const [advRes, seekRes] = await Promise.all([
          fetch("/api/inquiries?mode=advertiser", { credentials: "include" }),
          fetch("/api/inquiries?mode=seeker", { credentials: "include" }),
        ]);

        const [advData, seekData] = await Promise.all([
          advRes.json().catch(() => ({ inquiries: [] })),
          seekRes.json().catch(() => ({ inquiries: [] })),
        ]);

        if (advData.inquiries) setIncomingInquiries(advData.inquiries);
        if (seekData.inquiries) setSentInquiries(seekData.inquiries);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (inqId: string, status: Inquiry["status"]) => {
    setActionLoading(inqId);
    try {
      const res = await fetch(`/api/inquiries/${inqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setIncomingInquiries((prev) =>
          prev.map((i) => (i.id === inqId ? { ...i, status } : i))
        );
      }
    } catch {
      // Ignore
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
        <span className="text-xs font-bold">جاري تحميل المحادثات والرسائل...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-4 border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-base font-black text-slate-900">يجب تسجيل الدخول لعرض المحادثات</h2>
          <Link
            href="/login?redirect=/dashboard/inquiries"
            className="inline-flex w-full justify-center px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  // Combine and filter
  const allList = [
    ...incomingInquiries.map((i) => ({ ...i, direction: "incoming" as const })),
    ...sentInquiries.map((i) => ({ ...i, direction: "sent" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayedInquiries = allList.filter((item) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "incoming" && item.direction === "incoming") ||
      (activeTab === "sent" && item.direction === "sent");

    const matchesSearch =
      !searchQuery ||
      item.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seekerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-28 font-sans" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="الرجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black text-slate-900">المحادثات والطلبات</h1>
        <div className="w-8" />
      </header>

      {/* Tabs & Search */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-3 shadow-2xs">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الرسائل، اسم العميل، أو العقار..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {[
            { key: "all", label: `كل المحادثات (${allList.length})` },
            { key: "incoming", label: `طلبات واردة (${incomingInquiries.length})` },
            { key: "sent", label: `طلبات مرسلة (${sentInquiries.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? "bg-emerald-700 text-white shadow-xs font-black"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {displayedInquiries.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-3 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">لا توجد محادثات أو طلبات في هذا القسم</h3>
            <p className="text-xs max-w-sm mx-auto leading-relaxed">
              عندما يتواصل معك المشترون بشأن إعلاناتك أو عندما ترسل طلباً لمعاينة عقار، ستظهر المحادثات هنا مباشرة.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/explore"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <span>تصفح العقارات</span>
              </Link>
              <Link
                href="/dashboard/properties/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition"
              >
                <span>+ أضف إعلان</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedInquiries.map((inq) => {
              const isIncoming = inq.direction === "incoming";
              return (
                <div
                  key={inq.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          {isIncoming ? inq.seekerName : inq.propertyTitle}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isIncoming
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                          }`}
                        >
                          {isIncoming ? "طلب وارد من عميل" : "طلب أرسلتَه"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {isIncoming
                          ? `هاتف العميل: ${inq.seekerPhone}`
                          : `العقار: ${inq.propertyTitle}`}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                        inq.status === "contacted"
                          ? "bg-blue-100 text-blue-800"
                          : inq.status === "qualified"
                          ? "bg-emerald-100 text-emerald-800"
                          : inq.status === "closed"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {inq.status === "contacted"
                        ? "تم التواصل"
                        : inq.status === "qualified"
                        ? "موعد معاينة"
                        : inq.status === "closed"
                        ? "مكتمل"
                        : "جديد"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    &quot;{inq.message}&quot;
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(inq.createdAt).toLocaleDateString("ar-EG")}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveChatInquiryId(inq.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>فتح المحادثة 💬</span>
                      </button>

                      <Link
                        href={`/properties/${inq.propertyId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                      >
                        <span>العقار</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Actions for Incoming Leads */}
                  {isIncoming && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400 font-bold ml-1">تحديث الحالة:</span>
                      <button
                        disabled={actionLoading === inq.id}
                        onClick={() => handleUpdateStatus(inq.id, "contacted")}
                        className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                          inq.status === "contacted" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        تم التواصل
                      </button>
                      <button
                        disabled={actionLoading === inq.id}
                        onClick={() => handleUpdateStatus(inq.id, "qualified")}
                        className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                          inq.status === "qualified" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        موعد معاينة
                      </button>
                      <button
                        disabled={actionLoading === inq.id}
                        onClick={() => handleUpdateStatus(inq.id, "closed")}
                        className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                          inq.status === "closed" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        مكتمل
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Interactive Live Chat Modal */}
      {activeChatInquiryId && (
        <InquiryChatModal
          inquiryId={activeChatInquiryId}
          isOpen={Boolean(activeChatInquiryId)}
          onClose={() => {
            setActiveChatInquiryId(null);
            loadData();
          }}
          currentUserRole={user?.role}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}
