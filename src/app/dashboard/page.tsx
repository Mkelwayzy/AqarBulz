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
} from "lucide-react";
import InquiryChatModal from "@/components/chat/InquiryChatModal";
import EditPropertyModal from "@/components/properties/EditPropertyModal";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"listings" | "inquiries">("listings");
  const [propertyStatusTab, setPropertyStatusTab] = useState<"all" | "published" | "pending_review" | "draft" | "rejected">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeChatInquiryId, setActiveChatInquiryId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const statusParam = new URLSearchParams(window.location.search).get("status");
      if (statusParam && ["all", "published", "pending_review", "draft", "rejected"].includes(statusParam)) {
        setPropertyStatusTab(statusParam as any);
        setActiveTab("listings");
      }
    }
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Current user
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json();
      setUser(meData.user);

      if (meData.user) {
        const isBuyer = meData.user.role === "seeker" || meData.user.role === "buyer";

        if (isBuyer) {
          // Fetch inquiries sent by this seeker
          const inqRes = await fetch("/api/inquiries?mode=seeker");
          const inqData = await inqRes.json();
          if (inqData.inquiries) setInquiries(inqData.inquiries);

          // Fetch favorites count
          const favRes = await fetch("/api/favorites");
          const favData = await favRes.json();
          if (favData.favorites) setFavoritesCount(favData.favorites.length);
        } else {
          // Owner or Broker: fetch isolated properties and incoming inquiries
          const [propRes, inqRes] = await Promise.all([
            fetch("/api/dashboard/properties?status=all"),
            fetch("/api/inquiries?mode=advertiser"),
          ]);

          const propData = await propRes.json();
          const inqData = await inqRes.json();

          if (propData.properties) setProperties(propData.properties);
          if (inqData.inquiries) setInquiries(inqData.inquiries);
        }
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

  const isBuyer = user.role === "seeker" || user.role === "buyer";
  const isOwnerOrBroker = user.role === "owner" || user.role === "broker";
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-800 to-brand-600 text-white font-extrabold flex items-center justify-center text-xl shadow-md">
            {user.name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900">
                أهلاً بك، {user.name}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200">
                {isBuyer
                  ? "حساب مشتري / باحث"
                  : user.role === "broker"
                  ? "وسيط عقاري معتمد"
                  : user.role === "admin"
                  ? "مدير النظام"
                  : "مالك عقار"}
              </span>
              {user.isVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  موثق
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isBuyer
                ? "متابعة طلبات المعاينة والاستفسارات المرسلة والعقارات المحفوظة في المفضلة"
                : "بوابة إدارة الإعلانات العقارية ومتابعة طلبات المشترين (Leads)"}
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

          {isBuyer ? (
            <>
              <Link
                href="/explore"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md shadow-brand-600/25 transition-all"
              >
                <Compass className="w-4 h-4" />
                <span>استكشاف الخريطة الحية</span>
              </Link>
              <Link
                href="/account/favorites"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                <Heart className="w-4 h-4 text-rose-500" />
                <span>المفضلة ({favoritesCount})</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard/properties"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                <Building2 className="w-4 h-4" />
                <span>إدارة عقاراتي ({properties.length})</span>
              </Link>
              <Link
                href="/dashboard/properties/new"
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-md shadow-brand-600/25 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة عقار جديد</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Buyer Upgrade Call-To-Action Banner */}
      {isBuyer && (
        <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-700/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">
              <Sparkles className="w-3 h-3" />
              <span>ترقية مجانية فورية لنوع الحساب</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white">
              هل تملك عقاراً للبيع أو ترغب في العمل كوسيط معتمد؟
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              حسابك الحالي مخصص للشراء والبحث. يمكنك تحويل حسابك مجاناً بنقرة واحدة إلى <strong className="text-amber-300">مالك عقار</strong> أو <strong className="text-teal-300">وسيط عقاري معتمد</strong> لإضافة وإدارة العقارات والمشاريع فوراً!
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 relative z-10 flex-wrap sm:flex-nowrap">
            <Link
              href="/account/profile#upgrade-role"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>تحويل نوع الحساب الآن</span>
              <ArrowLeft className="w-3.5 h-3.5 mr-0.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 2. Metrics Cards */}
      {isBuyer ? (
        /* Buyer Metrics */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">طلبات المعاينة والتواصل</span>
              <span className="text-2xl font-black text-slate-900">{inquiries.length}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">مرسلة للملاك والوسطاء</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">العقارات المحفوظة</span>
              <span className="text-2xl font-black text-rose-600">{favoritesCount}</span>
              <Link href="/account/favorites" className="text-[11px] text-rose-600 hover:underline block mt-0.5 font-bold">
                عرض المفضلة &larr;
              </Link>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">طلبات تم الرد عليها</span>
              <span className="text-2xl font-black text-emerald-600">
                {inquiries.filter((i) => i.status === "contacted" || i.status === "qualified").length}
              </span>
              <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">تواصل نشط</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      ) : (
        /* Owner / Broker Metrics */
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
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/30"
                : "bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-900 shadow-xs"
            }`}
          >
            <span
              className={`text-xs font-bold block mb-1 ${
                activeTab === "listings" && propertyStatusTab === "published" ? "text-emerald-100" : "text-slate-400"
              }`}
            >
              بند عقارات منشورة
            </span>
            <span
              className={`text-2xl font-black block ${
                activeTab === "listings" && propertyStatusTab === "published" ? "text-white" : "text-emerald-600"
              }`}
            >
              {publishedCount}
            </span>
            <span
              className={`text-[10px] font-bold block mt-1 ${
                activeTab === "listings" && propertyStatusTab === "published" ? "text-emerald-100" : "text-emerald-600"
              }`}
            >
              معتمدة ونشطة على الخريطة
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("listings");
              setPropertyStatusTab("pending_review");
            }}
            className={`p-5 rounded-2xl border text-right transition-all cursor-pointer ${
              activeTab === "listings" && propertyStatusTab === "pending_review"
                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-500/40"
                : "bg-amber-50/60 hover:bg-amber-100/60 border-amber-200/80 text-amber-950 shadow-xs"
            }`}
          >
            <span
              className={`text-xs font-bold block mb-1 ${
                activeTab === "listings" && propertyStatusTab === "pending_review" ? "text-slate-900" : "text-amber-800"
              }`}
            >
              بند قيد المراجعة
            </span>
            <span
              className={`text-2xl font-black block ${
                activeTab === "listings" && propertyStatusTab === "pending_review" ? "text-slate-950" : "text-amber-700"
              }`}
            >
              {pendingCount}
            </span>
            <span
              className={`text-[10px] font-bold block mt-1 ${
                activeTab === "listings" && propertyStatusTab === "pending_review" ? "text-slate-900" : "text-amber-700"
              }`}
            >
              في سجل المشاريع المقيدة
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
              طلبات العملاء والمعاينة
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
              مهتمون بمعاينة عقاراتك
            </span>
          </button>
        </div>
      )}

      {/* 3. Main Dashboard Workspace */}
      {isBuyer ? (
        /* Buyer Requests Section */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-brand-600" />
                <span>طلبات المعاينة والاستفسارات العقارية التي أرسلتها ({inquiries.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع حالة تواصل المعلنين معك ومواعيد المعاينة المحددة
              </p>
            </div>
            <Link
              href="/explore"
              className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1"
            >
              <span>البحث عن عقارات جديدة</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {inquiries.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">لم تقم بإرسال أي طلبات معاينة حتى الآن</h3>
              <p className="text-xs max-w-sm mx-auto">
                عند استعراض أي عقار على الخريطة التفاعلية، يمكنك الضغط على زر &quot;طلب معاينة&quot; للتواصل مباشرة مع المالك أو السمسار المعتمد.
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
              >
                <span>تصفح العقارات على الخريطة الآن</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {inquiries.map((inq) => (
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

                  <Link
                    href={`/properties/${inq.propertyId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors shrink-0"
                  >
                    <span>عرض صفحة العقار</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Owner / Broker Workspace Tabs */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex border-b border-slate-200 text-xs font-bold gap-6">
            <button
              onClick={() => setActiveTab("listings")}
              className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === "listings"
                  ? "border-brand-600 text-brand-700 font-black text-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>إعلاناتي وعقاراتي ({properties.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("inquiries")}
              className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === "inquiries"
                  ? "border-brand-600 text-brand-700 font-black text-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>طلبات العملاء والمعاينة الواردة ({inquiries.length})</span>
            </button>
          </div>

          {activeTab === "listings" ? (
            /* Listings Tab */
            <div className="space-y-4">
              {/* Status Filter Sub-Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 text-xs font-bold">
                {[
                  { key: "all", label: "كافة العقارات", count: properties.length },
                  { key: "published", label: "بند عقارات منشورة", count: publishedCount, color: "emerald" },
                  { key: "pending_review", label: "بند قيد المراجعة", count: pendingCount, color: "amber" },
                  { key: "draft", label: "المسودات", count: draftsCount, color: "slate" },
                  { key: "rejected", label: "المرفوضة", count: rejectedCount, color: "rose" },
                ].map((tab) => {
                  const isActive = propertyStatusTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setPropertyStatusTab(tab.key as any)}
                      className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
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
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs shadow-xs">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-sm text-amber-950">بند قيد المراجعة (سجل المشاريع المقيدة لدى الإدارة)</div>
                    <p className="text-amber-800 leading-relaxed font-medium">
                      هذه العقارات تم إرسالها للإدارة وهي مقيدة حالياً قيد الفحص والتدقيق. بمجرد موافقة الإدارة على المشروع سيخرج تلقائياً من المشاريع المقيدة ويتحول مباشرة إلى <strong>بند عقارات منشورة</strong> ويصبح مرئياً لجميع المشترين على الخريطة التفاعلية وقوائم البحث.
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
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-950 border border-amber-300 font-black text-xs shadow-xs animate-pulse">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>بند قيد المراجعة (في سجل المشاريع المقيدة لدى الإدارة)</span>
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
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
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
                          <div className="p-3.5 bg-amber-500/10 border border-amber-300 rounded-xl text-amber-950 font-bold text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>العقار قيد المراجعة الإدارية حالياً في سجل المشاريع المقيدة. يمكنك التراجع وسحبه كمسودة أو تعديل بياناته:</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                disabled={actionLoading === property.id}
                                onClick={() => handleRetractToDraft(property.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>تراجع وسحب الطلب كمسودة</span>
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
          ) : (
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black text-[11px] shadow-sm shadow-brand-600/20 transition-all cursor-pointer"
                        >
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
          )}
        </div>
      )}

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
    </div>
  );
}
