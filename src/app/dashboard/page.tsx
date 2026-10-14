"use client";

import React, { useState, useEffect } from "react";
import { User, Property, Inquiry } from "@/lib/db/types";
import Link from "next/link";
import {
  Building2,
  Users,
  Eye,
  MessageCircle,
  PlusCircle,
  CheckCircle2,
  Clock,
  Phone,
  Calendar,
  AlertCircle,
  Shield,
  Loader2,
  Heart,
  Compass,
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  XCircle,
  PauseCircle,
  FileText,
  Briefcase,
  AlertTriangle,
  Home,
  Sparkles,
  RotateCcw,
  Edit3,
  Send,
  Play,
  Lock,
} from "lucide-react";
import InquiryChatModal from "@/components/chat/InquiryChatModal";
import EditPropertyModal from "@/components/properties/EditPropertyModal";
import RequestDeletionModal from "@/components/properties/RequestDeletionModal";
import OfficialNoticesList from "@/components/dashboard/OfficialNoticesList";
import ListingQualityScore from "@/components/property/ListingQualityScore";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [sentInquiries, setSentInquiries] = useState<Inquiry[]>([]);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"listings" | "inquiries" | "sent_inquiries">("listings");
  const [propertyStatusTab, setPropertyStatusTab] = useState<"all" | "published" | "pending_review" | "draft" | "rejected">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeChatInquiryId, setActiveChatInquiryId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletionRequestProperty, setDeletionRequestProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const statusParam = new URLSearchParams(window.location.search).get("status");
      if (statusParam && ["all", "published", "pending_review", "draft", "rejected"].includes(statusParam)) {
        setPropertyStatusTab(statusParam as any);
        setActiveTab("listings");
      }
    }
    loadDashboardData();

    const handleAuthChange = () => {
      loadDashboardData();
    };
    window.addEventListener("auth-state-changed", handleAuthChange);
    return () => window.removeEventListener("auth-state-changed", handleAuthChange);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Current user
      const meRes = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const meData = await meRes.json();
      setUser(meData.user);

      if (meData.user) {
        // Unified Account: Fetch user properties, incoming inquiries, sent inquiries, and favorites
        const [propRes, inqAdvRes, inqSeekRes, favRes] = await Promise.all([
          fetch("/api/dashboard/properties?status=all", { credentials: "include" }),
          fetch("/api/inquiries?mode=advertiser", { credentials: "include" }),
          fetch("/api/inquiries?mode=seeker", { credentials: "include" }),
          fetch("/api/favorites", { credentials: "include" }),
        ]);

        const [propData, inqAdvData, inqSeekData, favData] = await Promise.all([
          propRes.json().catch(() => ({ properties: [] })),
          inqAdvRes.json().catch(() => ({ inquiries: [] })),
          inqSeekRes.json().catch(() => ({ inquiries: [] })),
          favRes.json().catch(() => ({ favorites: [] })),
        ]);

        if (propData.properties) setProperties(propData.properties);
        if (inqAdvData.inquiries) setInquiries(inqAdvData.inquiries);
        if (inqSeekData.inquiries) setSentInquiries(inqSeekData.inquiries);
        if (favData.favorites) setFavoritesCount(favData.favorites.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInquiryStatus = async (inqId: string, status: Inquiry["status"]) => {
    setActionLoading(inqId);
    try {
      const res = await fetch(`/api/inquiries/${inqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((i) => (i.id === inqId ? { ...i, status } : i))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetractToDraft = async (propertyId: string) => {
    if (
      !confirm(
        "هل تريد التراجع عن إرسال هذا العقار وسحبه من سجل المشاريع المقيدة ليعود كمسودة خاصة وتعديل بياناته؟"
      )
    ) {
      return;
    }
    setActionLoading(propertyId);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (res.ok) {
        setProperties((prev) =>
          prev.map((p) => (p.id === propertyId ? { ...p, status: "draft" } : p))
        );
      } else {
        const data = await res.json();
        alert(data.error || "فشل التراجع عن الإرسال");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResubmitForReview = async (propertyId: string) => {
    setActionLoading(propertyId);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending_review" }),
      });
      if (res.ok) {
        setProperties((prev) =>
          prev.map((p) => (p.id === propertyId ? { ...p, status: "pending_review" } : p))
        );
      } else {
        const data = await res.json();
        alert(data.error || "فشل إرسال العقار للمراجعة");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePauseStatus = async (propertyId: string, currentStatus: string) => {
    const isPaused = currentStatus === "paused";
    const newStatus = isPaused ? "published" : "paused";
    const confirmMsg = isPaused
      ? "هل تريد إعادة تفعيل العقار واستئناف نشره للعامة على الخريطة التفاعلية وقوائم البحث؟"
      : "هل تريد إيقاف عرض العقار مؤقتاً (مثلاً: تم البيع أو التفاوض) وحجبه عن الخريطة العامة مع حفظه في أرشيفك؟";

    if (!confirm(confirmMsg)) return;

    setActionLoading(propertyId);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setProperties((prev) =>
          prev.map((p) => (p.id === propertyId ? { ...p, status: newStatus as any } : p))
        );
      } else {
        const data = await res.json();
        alert(data.error || "فشل تغيير حالة العرض");
      }
    } catch {
      alert("خطأ في الاتصال بالخادم");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <span className="text-xs font-bold">جاري تحميل لوحة التحكم...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-900">يجب تسجيل الدخول أولاً</h2>
        <p className="text-xs text-slate-500">
          سجل دخولك أو أنشئ حساباً لمتابعة إعلاناتك واستفساراتك العقارية.
        </p>
        <Link
          href="/login?redirect=/dashboard"
          className="inline-flex px-6 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20"
        >
          تسجيل الدخول الآن
        </Link>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  const totalViews = properties.reduce((acc, p) => acc + (p.viewsCount || 0), 0);
  const publishedCount = properties.filter((p) => p.status === "published").length;
  const pendingCount = properties.filter((p) => p.status === "pending_review").length;
  const draftsCount = properties.filter((p) => p.status === "draft").length;
  const rejectedCount = properties.filter((p) => p.status === "rejected").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Welcome & Role Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white font-extrabold flex items-center justify-center text-xl shadow-md ring-4 ring-emerald-500/20 shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              user.name.charAt(0)
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900">
                أهلاً بك، {user.name}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                {isAdmin ? "مدير النظام" : "حساب معتمد"}
              </span>
              {user.isVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  موثق
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              بوابة إدارة الإعلانات العقارية ومتابعة الطلبات والمحادثات المباشرة
            </p>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>لوحة الرقابة المركزية (Admin)</span>
            </Link>
          )}

          <Link
            href="/dashboard/properties/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00875a] hover:bg-[#00734c] text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ إضافة إعلان</span>
          </Link>

          <Link
            href="/explore"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>الخريطة الحية</span>
          </Link>

          <Link
            href="/account/favorites"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>المفضلة ({favoritesCount})</span>
          </Link>
        </div>
      </div>

      {/* 2. Unified Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => {
            setActiveTab("listings");
            setPropertyStatusTab("all");
          }}
          className={`p-5 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === "listings" && propertyStatusTab === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20"
              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs"
          }`}
        >
          <span
            className={`text-xs font-bold block mb-1 ${
              activeTab === "listings" && propertyStatusTab === "all" ? "text-slate-300" : "text-slate-400"
            }`}
          >
            كافة العقارات
          </span>
          <span className="text-2xl font-black block">{properties.length}</span>
          <span
            className={`text-[10px] block mt-1 ${
              activeTab === "listings" && propertyStatusTab === "all" ? "text-slate-300" : "text-slate-400"
            }`}
          >
            بمحفظتك العقارية
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("listings");
            setPropertyStatusTab("published");
          }}
          className={`p-5 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === "listings" && propertyStatusTab === "published"
              ? "bg-[#00875a] text-white border-[#00875a] shadow-md ring-2 ring-[#00875a]/30"
              : "bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-900 shadow-xs"
          }`}
        >
          <span
            className={`text-xs font-bold block mb-1 ${
              activeTab === "listings" && propertyStatusTab === "published" ? "text-emerald-100" : "text-slate-400"
            }`}
          >
            عقارات منشورة
          </span>
          <span
            className={`text-2xl font-black block ${
              activeTab === "listings" && propertyStatusTab === "published" ? "text-white" : "text-emerald-700"
            }`}
          >
            {publishedCount}
          </span>
          <span
            className={`text-[10px] font-bold block mt-1 ${
              activeTab === "listings" && propertyStatusTab === "published" ? "text-emerald-100" : "text-emerald-700"
            }`}
          >
            نشطة على الخريطة
          </span>
        </button>

        <button
          onClick={() => setActiveTab("inquiries")}
          className={`p-5 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === "inquiries"
              ? "bg-brand-700 text-white border-brand-700 shadow-md ring-2 ring-brand-700/20"
              : "bg-white hover:bg-brand-50/50 border-slate-200 text-slate-900 shadow-xs"
          }`}
        >
          <span
            className={`text-xs font-bold block mb-1 ${
              activeTab === "inquiries" ? "text-brand-100" : "text-slate-400"
            }`}
          >
            طلبات العملاء الواردة
          </span>
          <span
            className={`text-2xl font-black block ${
              activeTab === "inquiries" ? "text-white" : "text-brand-700"
            }`}
          >
            {inquiries.length}
          </span>
          <span
            className={`text-[10px] font-bold block mt-1 ${
              activeTab === "inquiries" ? "text-brand-100" : "text-brand-600"
            }`}
          >
            مهتمون بإعلاناتك
          </span>
        </button>

        <button
          onClick={() => setActiveTab("sent_inquiries")}
          className={`p-5 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === "sent_inquiries"
              ? "bg-indigo-700 text-white border-indigo-700 shadow-md ring-2 ring-indigo-700/20"
              : "bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-900 shadow-xs"
          }`}
        >
          <span
            className={`text-xs font-bold block mb-1 ${
              activeTab === "sent_inquiries" ? "text-indigo-100" : "text-slate-400"
            }`}
          >
            طلباتي المرسلة
          </span>
          <span
            className={`text-2xl font-black block ${
              activeTab === "sent_inquiries" ? "text-white" : "text-indigo-700"
            }`}
          >
            {sentInquiries.length}
          </span>
          <span
            className={`text-[10px] font-bold block mt-1 ${
              activeTab === "sent_inquiries" ? "text-indigo-100" : "text-indigo-600"
            }`}
          >
            استفسارات أرسلتها
          </span>
        </button>
      </div>

      {/* 3. Main Dashboard Workspace */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex border-b border-slate-200 text-xs font-bold gap-6 overflow-x-auto pb-0.5">
          <button
            onClick={() => setActiveTab("listings")}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "listings"
                ? "border-emerald-600 text-emerald-700 font-black text-sm"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>مشاريعي ({properties.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "inquiries"
                ? "border-brand-600 text-brand-700 font-black text-sm"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>طلبات العملاء والمعاينة الواردة ({inquiries.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("sent_inquiries")}
            className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "sent_inquiries"
                ? "border-indigo-600 text-indigo-700 font-black text-sm"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>طلبات المعاينة التي أرسلتها ({sentInquiries.length})</span>
          </button>
        </div>

          {activeTab === "listings" ? (
            /* Listings Tab */
            <div className="space-y-4">
              {/* Official Admin Communication Channel Notices */}
              <OfficialNoticesList
                onOpenEditProperty={(propId) => {
                  const target = properties.find((p) => p.id === propId);
                  if (target) setEditingProperty(target);
                }}
              />

              {/* Prominent High-Visibility Alert When User Has Restricted Listings */}
              {pendingCount > 0 && (
                <div className="p-4 bg-gradient-to-r from-amber-500/20 to-amber-100 border-2 border-amber-400 rounded-2xl flex items-start gap-3.5 text-amber-950 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-black text-sm sm:text-base text-slate-950">
                        لديك ({pendingCount}) منشور مقيد 🔒 بانتظار موافقة الإدارة
                      </span>
                      <button
                        type="button"
                        onClick={() => setPropertyStatusTab("pending_review")}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition self-start cursor-pointer"
                      >
                        <span>عرض المنشورات المقيدة ({pendingCount})</span>
                      </button>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      تم تسجيل بيانات مشروعك بنجاح وحالته الحالية <strong>«منشور مقيد»</strong> لحين مراجعته والتحقق من صحة التفاصيل من قِبل إدارة المنصة. بمجرد الموافقة سيخرج المشروع من المشاريع المقيدة وينشر تلقائياً للجمهور.
                    </p>
                  </div>
                </div>
              )}

              {/* Status Filter Sub-Tabs - Vertical-first grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-3 border-b border-slate-100 text-xs font-bold">
                {[
                  { key: "all", label: "كافة المنشورات", count: properties.length },
                  { key: "pending_review", label: "منشورات مقيدة", count: pendingCount, color: "amber" },
                  { key: "published", label: "عقارات معتمدة", count: publishedCount, color: "emerald" },
                  { key: "draft", label: "المسودات", count: draftsCount, color: "slate" },
                  { key: "rejected", label: "المرفوضة", count: rejectedCount, color: "rose" },
                ].map((tab) => {
                  const isActive = propertyStatusTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setPropertyStatusTab(tab.key as any)}
                      className={`p-2.5 rounded-xl transition-all flex items-center justify-between gap-1.5 ${
                        isActive
                          ? tab.color === "emerald"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : tab.color === "amber"
                            ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                            : tab.color === "rose"
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-slate-900 text-white shadow-sm"
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

              {/* Informative Banner for Pending Review Band (Restricted Projects Registry) */}
              {propertyStatusTab === "pending_review" && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900 text-xs shadow-xs">
                  <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-sm text-amber-950">سجل المنشورات والمشاريع المقيدة لدى الإدارة</div>
                    <p className="text-amber-800 leading-relaxed font-medium">
                      هذه المشاريع تم إرسالها للإدارة وهي مقيدة حالياً قيد الفحص والتدقيق. بمجرد موافقة الإدارة على المشروع سيخرج تلقائياً من المشاريع المقيدة ويتحول مباشرة إلى <strong>عقارات معتمدة ومنشورة</strong> ويصبح مرئياً لجميع المشترين على الخريطة التفاعلية وقوائم البحث.
                    </p>
                  </div>
                </div>
              )}

              {/* Informative Banner for Published Band */}
              {propertyStatusTab === "published" && (
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

              {/* Render Properties or Empty State */}
              {properties.filter((p) => propertyStatusTab === "all" || p.status === propertyStatusTab).length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    {propertyStatusTab === "pending_review"
                      ? "لا توجد عقارات قيد المراجعة حالياً"
                      : propertyStatusTab === "published"
                      ? "لا توجد عقارات منشورة حالياً"
                      : "لا توجد عقارات في هذا البند"}
                  </h3>
                  <p className="text-xs max-w-sm mx-auto">
                    {propertyStatusTab === "pending_review"
                      ? "عند إضافة عقار جديد وإرساله للاعتماد سيظهر في هذا البند لحين مراجعته والموافقة عليه."
                      : propertyStatusTab === "published"
                      ? "بمجرد موافقة الإدارة على مشاريعك المقيدة ستخرج من المشاريع المقيدة وتتحول إلى هذا البند مباشرة."
                      : "يمكنك إضافة عقار جديد أو استكمال المسودات في أي وقت."}
                  </p>
                  <Link
                    href="/dashboard/properties/new"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة عقار جديد الآن</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {properties
                    .filter((p) => propertyStatusTab === "all" || p.status === propertyStatusTab)
                    .map((property) => (
                      <div
                        key={property.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col gap-4 text-xs hover:border-slate-300 transition"
                      >
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-base">{property.title}</span>

                              {/* Prominent Status Badges in front of item */}
                              {property.status === "pending_review" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 border border-amber-600 font-black text-xs shadow-xs animate-pulse">
                                  <Lock className="w-3.5 h-3.5 text-slate-950" />
                                  <span>منشور مقيد 🔒 (بانتظار موافقة الإدارة)</span>
                                </span>
                              )}
                              {property.status === "rejected" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-950 border border-rose-300 font-black text-xs shadow-xs">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>لم توافق الإدارة على المشروع (مرفوض)</span>
                                </span>
                              )}
                              {property.status === "published" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 font-black text-xs shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>بند عقارات منشورة (معتمد ونشط)</span>
                                </span>
                              )}
                              {property.status === "draft" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-xs">
                                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                                  <span>مسودة خاصة</span>
                                </span>
                              )}
                              {property.status === "paused" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-white font-bold text-xs shadow-xs">
                                  <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                                  <span>متوقف مؤقتاً (تم البيع / معلق)</span>
                                </span>
                              )}
                              {property.status === "suspended" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-white font-bold text-xs">
                                  <PauseCircle className="w-3.5 h-3.5" />
                                  <span>معلق مؤقتاً</span>
                                </span>
                              )}
                            </div>

                            <div className="text-slate-600 font-medium">
                              السعر: <strong className="text-brand-700 font-bold">{property.price.toLocaleString("ar-EG")} ج.م</strong> • المساحة: {property.areaSqM} م² • {property.addressDetails}
                            </div>

                            {/* مؤشر جاهزية الإعلان للمالك (Listing Quality Score) */}
                            <ListingQualityScore property={property} />
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* In-place edit button */}
                            <button
                              type="button"
                              onClick={() => setEditingProperty(property)}
                              className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                              <span>تعديل ومراجعة</span>
                            </button>

                            {property.status === "published" && (
                              <Link
                                href={`/properties/${property.slug}`}
                                target="_blank"
                                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>معاينة العرض</span>
                              </Link>
                            )}

                            {/* Pause / Sold toggle for published or paused */}
                            {(property.status === "published" || property.status === "paused") && (
                              <button
                                type="button"
                                disabled={actionLoading === property.id}
                                onClick={() => handleTogglePauseStatus(property.id, property.status)}
                                className={`flex items-center gap-1 px-3 py-2 font-bold rounded-xl transition cursor-pointer ${
                                  property.status === "paused"
                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
                                }`}
                                title={property.status === "paused" ? "استئناف النشر على الخريطة" : "وسم تم البيع أو إيقاف العرض مؤقتاً"}
                              >
                                {property.status === "paused" ? (
                                  <>
                                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>استئناف ▶️</span>
                                  </>
                                ) : (
                                  <>
                                    <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>تم البيع / إيقاف ⏸️</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Official Deletion Request from Admin for published/paused */}
                            {(property.status === "published" || property.status === "paused") && (
                              <button
                                type="button"
                                onClick={() => setDeletionRequestProperty(property)}
                                className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-xl transition cursor-pointer"
                                title="إرسال طلب حذف رسمي للإدارة"
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-600" />
                                <span>طلب حذف 📨</span>
                              </button>
                            )}

                            <Link
                              href={`/dashboard/properties`}
                              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                            >
                              <span>إدارة كاملة</span>
                            </Link>
                          </div>
                        </div>

                        {/* Interactive Status & Retraction Banners */}
                        {property.status === "pending_review" && (
                          <div className="p-3.5 bg-amber-500/15 border-2 border-amber-400 rounded-xl text-amber-950 font-bold text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                              <span>منشور مقيد 🔒 — بانتظار موافقة واعتماد إدارة المنصة قبل النشر للجمهور.</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {property.isProject && (
                                <Link
                                  href={`/projects/${property.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>معاينة صفحة المشروع المقيد</span>
                                </Link>
                              )}
                              <button
                                type="button"
                                disabled={actionLoading === property.id}
                                onClick={() => handleRetractToDraft(property.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 font-bold text-xs shadow-xs transition cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>تراجع وسحب كمسودة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProperty(property)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 font-bold text-xs transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل الإعلان ✏️</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {property.status === "rejected" && (
                          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 font-bold text-xs space-y-2.5">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-black text-rose-900">سبب عدم موافقة الإدارة: </span>
                                <span className="font-medium text-rose-800">
                                  {property.moderationNotes || "يرجى مراجعة تفاصيل وسعر ومواصفات العقار وتصحيحها لإعادة النشر."}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-rose-200">
                              <button
                                type="button"
                                onClick={() => setEditingProperty(property)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل الإعلان وإعادة التقديم للإدارة ✏️</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === property.id}
                                onClick={() => handleRetractToDraft(property.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 font-bold text-xs transition cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>تراجع وحفظ كمسودة خاصة 💾</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === property.id}
                                onClick={() => handleResubmitForReview(property.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs transition cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>إعادة الإرسال للإدارة مباشرة 🚀</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {property.status === "draft" && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <span>هذا العقار محفوظ كمسودة خاصة ولم يُرسل للمراجعة بعد.</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setEditingProperty(property)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل المسودة ✏️</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === property.id}
                                onClick={() => handleResubmitForReview(property.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>إرسال للمراجعة (سجل المشاريع المقيدة) 🚀</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-400 font-mono">
                          المعرف: {property.id} • المشاهدات: {property.viewsCount || 0} • الخصوصية: {property.locationPrivacy === "approximate" ? "موقع تقريبي محمي (500م)" : "موقع دقيق"}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : activeTab === "inquiries" ? (
            /* Incoming Inquiries Tab */
            inquiries.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">لا توجد طلبات تواصل واردة حتى الآن</h3>
                <p className="text-xs max-w-sm mx-auto">
                  عندما يرسل المشترون استفسارات أو طلبات معاينة لإعلاناتك، ستظهر تفاصيلهم وأرقام هواتفهم هنا.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <div>
                        <span className="font-black text-slate-900 text-sm block">{inq.seekerName}</span>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                          <span>الهاتف: {inq.seekerPhone}</span>
                          {inq.seekerEmail && <span>• {inq.seekerEmail}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setActiveChatInquiryId(inq.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black text-[11px] shadow-sm shadow-brand-600/20 transition-all cursor-pointer relative"
                        >
                          {/* Notification Badge Pulse: نابضة لتسريع وتيرة الصفقات */}
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                          </span>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>شات المعاينة الخاص 💬</span>
                        </button>

                        {inq.seekerPhone && (
                          <>
                            <a
                              href={`tel:${inq.seekerPhone}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition-colors"
                            >
                              <Phone className="w-3 h-3" />
                              <span>اتصال</span>
                            </a>
                            <a
                              href={`https://wa.me/${inq.seekerPhone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>واتساب</span>
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                      &quot;{inq.message}&quot;
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px]">
                      <span className="text-slate-400">
                        عقار: <strong className="text-slate-700">{inq.propertyTitle}</strong> • {new Date(inq.createdAt).toLocaleDateString("ar-EG")}
                      </span>

                      {/* Status changer buttons */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold">الحالة:</span>
                        <button
                          disabled={actionLoading === inq.id}
                          onClick={() => handleUpdateInquiryStatus(inq.id, "contacted")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                            inq.status === "contacted"
                              ? "bg-blue-600 text-white font-black"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          تم التواصل
                        </button>
                        <button
                          disabled={actionLoading === inq.id}
                          onClick={() => handleUpdateInquiryStatus(inq.id, "qualified")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                            inq.status === "qualified"
                              ? "bg-emerald-600 text-white font-black"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          موعد معاينة
                        </button>
                        <button
                          disabled={actionLoading === inq.id}
                          onClick={() => handleUpdateInquiryStatus(inq.id, "closed")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                            inq.status === "closed"
                              ? "bg-slate-800 text-white font-black"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          مكتمل
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Sent Inquiries Tab */
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">طلبات المعاينة والاستفسارات التي أرسلتها</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  متابعة حالة تواصل المعلنين معك ومواعيد المعاينة المحددة للعقارات التي أبدَيْتَ اهتمامك بها
                </p>
              </div>

              {sentInquiries.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-sm">لم تقم بإرسال أي طلبات معاينة حتى الآن</h3>
                  <p className="text-xs max-w-sm mx-auto">
                    عند استعراض أي عقار على الخريطة التفاعلية، يمكنك الضغط على زر &quot;طلب معاينة&quot; للتواصل مباشرة مع المعلن.
                  </p>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    <span>تصفح العقارات على الخريطة</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentInquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{inq.propertyTitle}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              inq.status === "contacted"
                                ? "bg-blue-100 text-blue-800"
                                : inq.status === "qualified"
                                ? "bg-emerald-100 text-emerald-800"
                                : inq.status === "closed"
                                ? "bg-slate-200 text-slate-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {inq.status === "contacted"
                              ? "تم التواصل معك"
                              : inq.status === "qualified"
                              ? "تم تحديد موعد معاينة"
                              : inq.status === "closed"
                              ? "مكتمل"
                              : "قيد انتظار رد المعلن"}
                          </span>
                        </div>

                        <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                          &quot;{inq.message}&quot;
                        </p>

                        <div className="text-[11px] text-slate-400 font-mono">
                          تاريخ الطلب: {new Date(inq.createdAt).toLocaleDateString("ar-EG")} • طريقة الاتصال المفضلة: {inq.preferredContact === "whatsapp" ? "واتساب" : "مكالمة هاتفية"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveChatInquiryId(inq.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl transition-colors shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>محادثة المعلن</span>
                        </button>
                        <Link
                          href={`/properties/${inq.propertyId}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors shrink-0"
                        >
                          <span>عرض العقار</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      {activeChatInquiryId && (
        <InquiryChatModal
          inquiryId={activeChatInquiryId}
          isOpen={Boolean(activeChatInquiryId)}
          onClose={() => setActiveChatInquiryId(null)}
          currentUserRole={user?.role}
          currentUserId={user?.id}
        />
      )}

      {/* Reusable In-place Property Edit and Retraction Modal */}
      <EditPropertyModal
        property={editingProperty}
        isOpen={editingProperty !== null}
        onClose={() => setEditingProperty(null)}
        onSaved={(updated) => {
          setProperties((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }}
      />

      {/* Official Deletion Request Modal */}
      <RequestDeletionModal
        property={deletionRequestProperty}
        isOpen={deletionRequestProperty !== null}
        onClose={() => setDeletionRequestProperty(null)}
        onRequested={loadDashboardData}
      />
    </div>
  );
}
