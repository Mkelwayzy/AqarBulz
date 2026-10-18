"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminProjectsTab from "@/components/admin/AdminProjectsTab";
import AdminMessagesTab from "@/components/admin/AdminMessagesTab";
import AdminCmsTab from "@/components/admin/AdminCmsTab";
import AdminSupportTab from "@/components/admin/AdminSupportTab";
import AdminStaffTab from "@/components/admin/AdminStaffTab";
import {
  ShieldCheck,
  Building2,
  MessageSquare,
  Palette,
  HelpCircle,
  Users,
  Loader2,
  ExternalLink,
  ChevronLeft,
  BarChart3,
  TrendingUp,
  Eye,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

type AdminTab = "projects" | "messages" | "cms" | "support" | "staff";

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<AdminTab>("projects");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Sync tab with URL query
  useEffect(() => {
    if (rawTab && ["projects", "messages", "cms", "support", "staff"].includes(rawTab)) {
      setActiveTab(rawTab as AdminTab);
    } else {
      setActiveTab("projects");
    }
  }, [rawTab]);

  const fetchMetrics = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/metrics", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
      }
    } catch {}
    setStatsLoading(false);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user || data.user.role !== "admin") {
          router.push("/login?redirect=/admin");
        } else {
          setCurrentUser(data.user);
          fetchMetrics();
        }
      })
      .catch(() => router.push("/login?redirect=/admin"))
      .finally(() => setLoading(false));
  }, [router]);

  const switchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    router.push(`/admin?tab=${tab}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-xs font-bold text-slate-400">جاري التحقق من صلاحيات إدارة المنصة...</p>
      </div>
    );
  }

  const tabItems: Array<{
    id: AdminTab;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    color: string;
    activeBg: string;
    activeText: string;
    borderColor: string;
  }> = [
    {
      id: "projects",
      label: "إدارة المشاريع",
      sublabel: "مراجعة، موافقة، وحذف المشاريع والعقارات",
      icon: Building2,
      color: "text-amber-500",
      activeBg: "bg-amber-500/10",
      activeText: "text-amber-600",
      borderColor: "border-amber-500",
    },
    {
      id: "messages",
      label: "مراقبة الرسائل",
      sublabel: "التواصل بين العملاء والملاك والوسطاء",
      icon: MessageSquare,
      color: "text-emerald-500",
      activeBg: "bg-emerald-500/10",
      activeText: "text-emerald-600",
      borderColor: "border-emerald-500",
    },
    {
      id: "cms",
      label: "الهوية والمحتوى",
      sublabel: "الشعار، الأيقونة، الأزرار، وكامل الهوية البصرية",
      icon: Palette,
      color: "text-purple-500",
      activeBg: "bg-purple-500/10",
      activeText: "text-purple-600",
      borderColor: "border-purple-500",
    },
    {
      id: "support",
      label: "الدعم والعمليات",
      sublabel: "البلاغات، الشكاوى، وسجل التدقيق الرقابي",
      icon: HelpCircle,
      color: "text-sky-500",
      activeBg: "bg-sky-500/10",
      activeText: "text-sky-600",
      borderColor: "border-sky-500",
    },
    {
      id: "staff",
      label: "المستخدمين والموظفين",
      sublabel: "سجل المستخدمين الشامل، التوثيق، وموظفو الإدارة",
      icon: Users,
      color: "text-indigo-500",
      activeBg: "bg-indigo-500/10",
      activeText: "text-indigo-600",
      borderColor: "border-indigo-500",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-36 font-sans" dir="rtl">
      {/* Main Executive Vertical Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* ========================================================
            REAL-TIME ANALYTICS OVERVIEW (قسم التحليلات والمؤشرات الفعلية)
           ======================================================== */}
        {stats && (
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    مركز التحليلات والمؤشرات التشغيلية المباشرة
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    بيانات حقيقية ومباشرة من قاعدة البيانات للمستخدمين والمحادثات ومعدلات الاستجابة والتحويل
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchMetrics}
                  disabled={statsLoading}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin text-emerald-600" : ""}`} />
                  <span>تحديث المؤشرات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnalytics((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  {showAnalytics ? "طي اللوحة" : "عرض التحليلات"}
                </button>
              </div>
            </div>

            {showAnalytics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* 1. Users & Verification */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700">المستخدمون والتوثيق</span>
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalUsers}</div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600 font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      ملاك: {stats.ownersCount ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      وسطاء: {stats.brokersCount ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      موثّق: {stats.verifiedUsersCount ?? 0}
                    </span>
                  </div>
                </div>

                {/* 2. Conversations & Response Rate */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900">المحادثات ومعدل الاستجابة</span>
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-950">{stats.responseRatePercent ?? 0}%</span>
                    <span className="text-[11px] font-bold text-emerald-700">معدل استجابة المعلنين</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-emerald-900 font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200">
                      المحادثات: {stats.totalInquiries ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200">
                      الرسائل: {stats.totalMessagesCount ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                      بانتظار الرد: {stats.newInquiriesCount ?? 0}
                    </span>
                  </div>
                </div>

                {/* 3. Conversion to Viewings & Closed Deals */}
                <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-900">التحويل لمعاينات وصفقات</span>
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="flex items-baseline gap-3">
                    <div>
                      <span className="text-2xl font-black text-sky-950">{stats.viewingConversionPercent ?? 0}%</span>
                      <span className="text-[10px] font-bold text-sky-700 block">تحويل لمعاينة/تفاوض</span>
                    </div>
                    <div className="border-r border-sky-200 pr-3">
                      <span className="text-2xl font-black text-emerald-800">{stats.dealClosedCount ?? 0}</span>
                      <span className="text-[10px] font-bold text-emerald-700 block">صفقات مكتملة</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-sky-900 font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-sky-200">
                      معاينات مجدولة: {stats.viewingScheduledCount ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-sky-200">
                      تفاوض: {stats.negotiatingCount ?? 0}
                    </span>
                  </div>
                </div>

                {/* 4. Property Engagement & Reports */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900">تفاعل العقارات والبلاغات</span>
                    <Eye className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex items-baseline gap-3">
                    <div>
                      <span className="text-2xl font-black text-amber-950">
                        {Number(stats.totalPropertyViews ?? 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 block">مشاهدة للعقارات</span>
                    </div>
                    <div className="border-r border-amber-200 pr-3">
                      <span className="text-2xl font-black text-slate-900">
                        {stats.reportResolutionRatePercent ?? 0}%
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 block">معدل معالجة البلاغات</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-amber-900 font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-amber-200">
                      منشور: {stats.publishedCount ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-amber-200">
                      مباع/مؤجر: {stats.soldCount ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900">
                      بلاغات معلقة: {stats.pendingReportsCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================
              VERTICAL SIDEBAR NAVIGATION (القائمة الرأسية للشاشات الكبيرة)
             ======================================================== */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-6">
            {/* Management Company Badge Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">شركة الإدارة</h3>
                  <span className="text-[11px] text-emerald-400 font-bold block">
                    لوحة التحكم الرأسية المركزية
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                المسؤول الحالي:{" "}
                <span className="text-slate-200 font-bold">
                  {currentUser?.name || currentUser?.email || "مدير النظام"}
                </span>
              </p>
            </div>

            {/* Vertical Tab Selector Items */}
            <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-xs space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 px-3 pt-2 block tracking-wider">
                أقسام لوحة التحكم الرأسية
              </span>

              {tabItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchTab(item.id)}
                    className={`w-full text-right p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                      isActive
                        ? `${item.activeBg} border-r-4 ${item.borderColor} shadow-2xs`
                        : "hover:bg-slate-50 border-r-4 border-transparent"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive
                          ? "bg-white shadow-xs"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <IconComponent
                        className={`w-5 h-5 ${isActive ? item.activeText : "text-slate-500"}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black block ${
                            isActive ? item.activeText : "text-slate-900"
                          }`}
                        >
                          {item.label}
                        </span>
                        {isActive && (
                          <ChevronLeft className={`w-3.5 h-3.5 ${item.activeText}`} />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
                        {item.sublabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Platform Quick Link */}
            <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-800 block">شريط التنقل السفلي:</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                عند دخولك كمسؤول، يتم تحويل الشريط السفلي بالكامل للتنقل اللحظي بين هذه الأقسام على كافة الأجهزة المحمولة.
              </p>
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-emerald-700 font-black hover:underline pt-1"
              >
                <span>معاينة الواجهة كزائر</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>

          {/* ========================================================
              ACTIVE TAB CONTENT CANVAS (المحتوى التنفيذي للقسم)
             ======================================================== */}
          <section className="lg:col-span-8 xl:col-span-9 min-w-0">
            {activeTab === "projects" && <AdminProjectsTab />}
            {activeTab === "messages" && <AdminMessagesTab />}
            {activeTab === "cms" && <AdminCmsTab />}
            {activeTab === "support" && <AdminSupportTab />}
            {activeTab === "staff" && <AdminStaffTab />}
          </section>
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-xs font-bold text-slate-400">جاري تشغيل لوحة تحكم شركة الإدارة...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
