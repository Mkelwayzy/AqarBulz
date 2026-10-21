"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminProjectsTab from "@/components/admin/AdminProjectsTab";
import AdminMessagesTab from "@/components/admin/AdminMessagesTab";
import AdminCmsTab from "@/components/admin/AdminCmsTab";
import AdminSupportTab from "@/components/admin/AdminSupportTab";
import AdminStaffTab from "@/components/admin/AdminStaffTab";
import AdminRatingsTab from "@/components/admin/AdminRatingsTab";
import {
  canAccessAdminSection,
  hasAdminPermission,
  type AdminSection,
} from "@/lib/auth/admin-permissions";
import type { User } from "@/lib/db/types";
import {
  ShieldCheck,
  Building2,
  MessageSquare,
  Palette,
  HelpCircle,
  Users,
  Star,
  Loader2,
  ExternalLink,
  ChevronLeft,
  Workflow,
} from "lucide-react";

type AdminTab = AdminSection;

const TAB_ITEMS: Array<{
  id: AdminTab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  activeBg: string;
  activeText: string;
  borderColor: string;
}> = [
  {
    id: "projects",
    label: "المشاريع والعقارات",
    sublabel: "مراجعة الإعلانات واتخاذ إجراءات الإشراف",
    icon: Building2,
    activeBg: "bg-amber-500/10",
    activeText: "text-amber-600",
    borderColor: "border-amber-500",
  },
  {
    id: "messages",
    label: "الرسائل والمحادثات",
    sublabel: "متابعة المحادثات بين العملاء والمعلنين",
    icon: MessageSquare,
    activeBg: "bg-emerald-500/10",
    activeText: "text-emerald-600",
    borderColor: "border-emerald-500",
  },
  {
    id: "support",
    label: "الدعم والطلبات",
    sublabel: "البلاغات وطلبات الخدمات وسجل المتابعة",
    icon: HelpCircle,
    activeBg: "bg-sky-500/10",
    activeText: "text-sky-600",
    borderColor: "border-sky-500",
  },
  {
    id: "cms",
    label: "المحتوى والهوية",
    sublabel: "إدارة محتوى المنصة وهويتها البصرية",
    icon: Palette,
    activeBg: "bg-purple-500/10",
    activeText: "text-purple-600",
    borderColor: "border-purple-500",
  },
  {
    id: "ratings",
    label: "التقييمات",
    sublabel: "إدارة التقييمات والبلاغات والشارات",
    icon: Star,
    activeBg: "bg-yellow-500/10",
    activeText: "text-yellow-700",
    borderColor: "border-yellow-500",
  },
  {
    id: "staff",
    label: "المستخدمون والموظفون",
    sublabel: "مراجعة الحسابات وإدارة فريق العمل",
    icon: Users,
    activeBg: "bg-indigo-500/10",
    activeText: "text-indigo-600",
    borderColor: "border-indigo-500",
  },
];

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<AdminTab>("projects");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const visibleTabItems = useMemo(
    () => TAB_ITEMS.filter((item) => canAccessAdminSection(currentUser, item.id)),
    [currentUser]
  );

  // Sync tab with URL query
  useEffect(() => {
    if (rawTab && ["projects", "messages", "cms", "support", "staff", "ratings"].includes(rawTab)) {
      setActiveTab(rawTab as AdminTab);
    } else {
      setActiveTab("projects");
    }
  }, [rawTab]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { user?: User }) => {
        if (!data.user || data.user.role !== "admin") {
          router.push("/login?redirect=/admin");
        } else {
          setCurrentUser(data.user);
        }
      })
      .catch(() => router.push("/login?redirect=/admin"))
      .finally(() => setLoading(false));
  }, [router]);

  const switchTab = (tab: AdminTab) => {
    if (!canAccessAdminSection(currentUser, tab)) return;
    setActiveTab(tab);
    router.push(`/admin?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    if (!currentUser || visibleTabItems.length === 0) return;
    if (visibleTabItems.some((item) => item.id === activeTab)) return;
    const firstAllowedTab = visibleTabItems[0].id;
    setActiveTab(firstAllowedTab);
    router.replace(`/admin?tab=${firstAllowedTab}`, { scroll: false });
  }, [activeTab, currentUser, router, visibleTabItems]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-xs font-bold text-slate-400">جاري التحقق من صلاحيات إدارة المنصة...</p>
      </div>
    );
  }

  const activeTabItem = visibleTabItems.find((item) => item.id === activeTab);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-36 font-sans" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              {activeTabItem ? React.createElement(activeTabItem.icon, { className: "h-5 w-5" }) : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500">لوحة الإدارة <span className="mx-1 text-slate-300">/</span>{activeTabItem?.label || "الأقسام المتاحة"}</p>
              <h1 className="mt-0.5 truncate text-lg font-black text-slate-900 sm:text-xl">{activeTabItem?.label || "إدارة المنصة"}</h1>
              <p className="mt-0.5 text-xs text-slate-500">{currentUser.name || currentUser.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/architecture"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 transition-colors hover:bg-cyan-100"
            >
              <Workflow className="h-3.5 w-3.5" />
              <span>مخطط النظام</span>
            </Link>
            {canAccessAdminSection(currentUser, "staff") && (
              <Link
                href="/admin/analytics"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>التحليلات</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700"
            >
              <span>معاينة المنصة</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================
              VERTICAL SIDEBAR NAVIGATION (القائمة الرأسية للشاشات الكبيرة)
             ======================================================== */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-24">
            {/* Management Company Badge Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">إدارة المنصة</h3>
                  <span className="text-[11px] text-emerald-400 font-bold block">
                    مساحة العمل الإدارية
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
                الأقسام المسموح بها
              </span>

              {visibleTabItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchTab(item.id)}
                    aria-current={isActive ? "page" : undefined}
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

          </aside>

          {/* ========================================================
              ACTIVE TAB CONTENT CANVAS (المحتوى التنفيذي للقسم)
             ======================================================== */}
          <section className="min-w-0 lg:col-span-9">
            {visibleTabItems.length === 0 ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold leading-relaxed text-amber-900">
                لا توجد صلاحيات إدارية مخصصة لهذا الحساب حالياً. يُرجى التواصل مع مدير النظام لتحديد الأقسام المطلوبة.
              </div>
            ) : (
              <>
            {activeTab === "projects" && canAccessAdminSection(currentUser, "projects") && (
              <AdminProjectsTab
                canReview={hasAdminPermission(currentUser, "projects.review")}
                canDelete={hasAdminPermission(currentUser, "projects.delete")}
              />
            )}
            {activeTab === "messages" && canAccessAdminSection(currentUser, "messages") && (
              <AdminMessagesTab canViewUserProfiles={hasAdminPermission(currentUser, "staff.manage")} />
            )}
            {activeTab === "cms" && canAccessAdminSection(currentUser, "cms") && <AdminCmsTab />}
            {activeTab === "support" && canAccessAdminSection(currentUser, "support") && <AdminSupportTab />}
            {activeTab === "ratings" && canAccessAdminSection(currentUser, "ratings") && <AdminRatingsTab />}
            {activeTab === "staff" && canAccessAdminSection(currentUser, "staff") && <AdminStaffTab />}
              </>
            )}
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
