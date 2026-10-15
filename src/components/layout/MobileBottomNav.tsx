"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Search,
  Heart,
  User as UserIcon,
  PlusCircle,
  Sparkles,
  Building2,
  LogOut,
  CheckCircle2,
  Shield,
  ShieldCheck,
  X,
  ChevronLeft,
  Loader2,
  ArrowRight,
  UserCheck,
  Briefcase,
  LayoutDashboard,
  MessageSquare,
  Users,
  AlertTriangle,
  KeyRound,
  FileText,
  MapPin,
  Wallet,
  Bell,
  BarChart2,
  CreditCard,
  Crown,
  Flag,
  Star,
  Share2,
  Plus,
  Palette,
  HelpCircle,
} from "lucide-react";
import { User, UserRole } from "@/lib/db/types";
import MobileSearchDrawer from "./MobileSearchDrawer";
import OfficialNoticesList from "@/components/dashboard/OfficialNoticesList";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [adminStats, setAdminStats] = useState<{
    pendingReviewCount: number;
    totalInquiries: number;
    pendingReportsCount: number;
  } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [addChoiceModalOpen, setAddChoiceModalOpen] = useState(false);
  const [addAdvertiserStep, setAddAdvertiserStep] = useState<"choice" | "role_question">("choice");
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [aqarPlusModalOpen, setAqarPlusModalOpen] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [changePhoneModalOpen, setChangePhoneModalOpen] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState("");
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const [phoneUpdating, setPhoneUpdating] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  // Sync user status on pathname change and via auth-state-changed event
  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setUser(null);
    }
  };

  const fetchUnreadMessages = async () => {
    try {
      const res = await fetch("/api/inquiries", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUnreadMessagesCount(typeof data.totalUnread === "number" ? data.totalUnread : 0);
      }
    } catch {
      // Ignore
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch("/api/admin/metrics", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.stats) {
          setAdminStats({
            pendingReviewCount: data.stats.pendingReviewCount || 0,
            totalInquiries: data.stats.totalInquiries || 0,
            pendingReportsCount: data.stats.pendingReportsCount || 0,
          });
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchUser();
    fetchUnreadMessages();
    setAccountDrawerOpen(false);
    setAdminDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/admin") || user?.role === "admin") {
      fetchAdminStats();
    }
  }, [pathname, user?.role]);

  useEffect(() => {
    const handleAuthChange = () => {
      fetchUser();
      fetchAdminStats();
      fetchUnreadMessages();
    };
    const handleMessagesRead = () => {
      setUnreadMessagesCount(0);
    };
    window.addEventListener("auth-state-changed", handleAuthChange);
    window.addEventListener("messages-read", handleMessagesRead);
    return () => {
      window.removeEventListener("auth-state-changed", handleAuthChange);
      window.removeEventListener("messages-read", handleMessagesRead);
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setAccountDrawerOpen(false);
      setAdminDrawerOpen(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-state-changed"));
      }
      router.push("/");
      router.refresh();
    } catch {
      // Ignore
    } finally {
      setLoggingOut(false);
    }
  };

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhoneInput.trim()) return;
    setPhoneUpdating(true);
    setPhoneMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhoneInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setPhoneMessage("تم تحديث رقم الجوال بنجاح!");
        fetchUser();
        setTimeout(() => {
          setChangePhoneModalOpen(false);
          setPhoneMessage(null);
        }, 1500);
      } else {
        setPhoneMessage(data.error || "تعذر تحديث رقم الجوال");
      }
    } catch {
      setPhoneMessage("حدث خطأ أثناء تحديث رقم الجوال");
    } finally {
      setPhoneUpdating(false);
    }
  };

  const [currentAdminTab, setCurrentAdminTab] = useState("projects");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setCurrentAdminTab(sp.get("tab") || "projects");
    }
  }, [pathname]);

  const isAccountActive =
    accountDrawerOpen ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/account");

  const isAdminSection = (user?.role === "admin") || pathname.startsWith("/admin");
  const isAdminDrawerActive = adminDrawerOpen;

  return (
    <>
      {isAdminSection ? (
        /* ========================================================
           ADMIN CONTROL PANEL BOTTOM BAR (وضع لوحة تحكم شركة الإدارة)
           ======================================================== */
        <nav
          aria-label="شريط لوحة تحكم شركة الإدارة"
          className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 text-slate-300 shadow-[0_-8px_25px_rgba(0,0,0,0.45)] px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom,16px))]"
        >
          <div className="max-w-md mx-auto flex items-center justify-around relative">
            {/* 1. إدارة المشاريع */}
            <Link
              href="/admin?tab=projects"
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative active:scale-95 ${
                pathname.startsWith("/admin") && currentAdminTab === "projects"
                  ? "text-amber-400 font-black"
                  : "text-slate-400 hover:text-slate-200 font-bold"
              }`}
            >
              <div className="relative">
                <Building2
                  className={`w-5 h-5 transition-transform ${
                    pathname.startsWith("/admin") && currentAdminTab === "projects" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {pathname.startsWith("/admin") && currentAdminTab === "projects" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/80" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                المشاريع
              </span>
            </Link>

            {/* 2. مراقبة الرسائل */}
            <Link
              href="/admin?tab=messages"
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative active:scale-95 ${
                pathname.startsWith("/admin") && currentAdminTab === "messages"
                  ? "text-emerald-400 font-black"
                  : "text-slate-400 hover:text-slate-200 font-bold"
              }`}
            >
              <div className="relative">
                <MessageSquare
                  className={`w-5 h-5 transition-transform ${
                    pathname.startsWith("/admin") && currentAdminTab === "messages" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {pathname.startsWith("/admin") && currentAdminTab === "messages" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
                )}
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse ring-2 ring-slate-900 shadow-xs">
                    {unreadMessagesCount > 99 ? "+99" : unreadMessagesCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                الرسائل
              </span>
            </Link>

            {/* 3. الهوية والمحتوى */}
            <Link
              href="/admin?tab=cms"
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative active:scale-95 ${
                pathname.startsWith("/admin") && currentAdminTab === "cms"
                  ? "text-purple-400 font-black"
                  : "text-slate-400 hover:text-slate-200 font-bold"
              }`}
            >
              <div className="relative">
                <Palette
                  className={`w-5 h-5 transition-transform ${
                    pathname.startsWith("/admin") && currentAdminTab === "cms" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {pathname.startsWith("/admin") && currentAdminTab === "cms" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/80" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                الهوية والمحتوى
              </span>
            </Link>

            {/* 4. الدعم */}
            <Link
              href="/admin?tab=support"
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative active:scale-95 ${
                pathname.startsWith("/admin") && currentAdminTab === "support"
                  ? "text-sky-400 font-black"
                  : "text-slate-400 hover:text-slate-200 font-bold"
              }`}
            >
              <div className="relative">
                <HelpCircle
                  className={`w-5 h-5 transition-transform ${
                    pathname.startsWith("/admin") && currentAdminTab === "support" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {pathname.startsWith("/admin") && currentAdminTab === "support" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/80" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                الدعم
              </span>
            </Link>

            {/* 5. إدارة الموظفين */}
            <Link
              href="/admin?tab=staff"
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative active:scale-95 ${
                pathname.startsWith("/admin") && currentAdminTab === "staff"
                  ? "text-indigo-400 font-black"
                  : "text-slate-400 hover:text-slate-200 font-bold"
              }`}
            >
              <div className="relative">
                <Users
                  className={`w-5 h-5 transition-transform ${
                    pathname.startsWith("/admin") && currentAdminTab === "staff" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {pathname.startsWith("/admin") && currentAdminTab === "staff" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/80" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                الموظفين
              </span>
            </Link>
          </div>
        </nav>
      ) : (
        /* ========================================================
           STANDARD USER BOTTOM BAR (وضع المستخدم العام)
           ======================================================== */
        <nav
          aria-label="التنقل السريع للموقع"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom,16px))]"
        >
          <div className="max-w-md mx-auto flex items-center justify-around relative">
            {/* 1. حسابي (أقصى اليمين) */}
            <button
              type="button"
              onClick={() => setAccountDrawerOpen(true)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative active:scale-95 ${
                isAccountActive
                  ? "text-emerald-700 font-black"
                  : "text-slate-500 hover:text-slate-800 font-bold"
              }`}
            >
              <div className="relative">
                {user ? (
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-emerald-700 text-white font-black text-[10px] flex items-center justify-center shadow-xs ring-1 ring-emerald-500/30">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                ) : (
                  <UserIcon
                    className={`w-5 h-5 transition-transform ${
                      isAccountActive ? "scale-110 stroke-[2.5] text-emerald-700" : "stroke-2"
                    }`}
                  />
                )}
                {isAccountActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/50" />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  isAccountActive ? "font-black text-emerald-700" : "font-semibold"
                }`}
              >
                حسابي
              </span>
            </button>

            {/* 2. الإعلانات */}
            <Link
              href="/"
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative active:scale-95 ${
                pathname === "/" || pathname === "/explore"
                  ? "text-emerald-700 font-black"
                  : "text-slate-500 hover:text-slate-800 font-bold"
              }`}
            >
              <div className="relative">
                <MapPin
                  className={`w-5 h-5 transition-transform ${
                    pathname === "/" || pathname === "/explore" ? "scale-110 stroke-[2.5] text-emerald-700" : "stroke-2"
                  }`}
                />
                {(pathname === "/" || pathname === "/explore") && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/50" />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  pathname === "/" || pathname === "/explore" ? "font-black text-emerald-700" : "font-semibold"
                }`}
              >
                الإعلانات
              </span>
            </Link>

            {/* 3. المشاريع (مغلق مؤقتاً) */}
            <div
              onClick={() => {
                alert("قسم المشاريع مغلق مؤقتاً للتطوير والتحديث وسيتوفر قريباً.");
              }}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative cursor-not-allowed opacity-60 select-none active:scale-95"
              title="قسم المشاريع مغلق مؤقتاً"
            >
              <div className="relative">
                <Building2 className="w-5 h-5 stroke-2 text-slate-400" />
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[8px] font-black bg-amber-100 text-amber-800 leading-none shadow-2xs border border-amber-200">
                  مغلق
                </span>
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-semibold text-slate-400">
                المشاريع
              </span>
            </div>

            {/* 4. المحادثات */}
            <Link
              href={user ? "/dashboard/inquiries" : "/login?redirect=/dashboard/inquiries"}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative active:scale-95 ${
                pathname === "/dashboard/inquiries"
                  ? "text-emerald-700 font-black"
                  : "text-slate-500 hover:text-slate-800 font-bold"
              }`}
            >
              <div className="relative">
                <MessageSquare
                  className={`w-5 h-5 transition-transform ${
                    pathname === "/dashboard/inquiries" ? "scale-110 stroke-[2.5] text-emerald-700" : "stroke-2"
                  }`}
                />
                {pathname === "/dashboard/inquiries" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/50" />
                )}
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse ring-2 ring-white shadow-xs">
                    {unreadMessagesCount > 99 ? "+99" : unreadMessagesCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  pathname === "/dashboard/inquiries" ? "font-black text-emerald-700" : "font-semibold"
                }`}
              >
                المحادثات
              </span>
            </Link>

            {/* 5. الخدمات (أقصى اليسار) */}
            <Link
              href="/services"
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative active:scale-95 ${
                pathname === "/services"
                  ? "text-emerald-700 font-black"
                  : "text-slate-500 hover:text-slate-800 font-bold"
              }`}
            >
              <div className="relative">
                <LayoutDashboard
                  className={`w-5 h-5 transition-transform ${
                    pathname === "/services" ? "scale-110 stroke-[2.5] text-emerald-700" : "stroke-2"
                  }`}
                />
                {pathname === "/services" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/50" />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  pathname === "/services" ? "font-black text-emerald-700" : "font-semibold"
                }`}
              >
                الخدمات
              </span>
            </Link>
          </div>
        </nav>
      )}

      {/* ========================================================
          UNIFIED ACCOUNT BOTTOM SHEET (نافذة حسابي الموحدة المطابقة لتطبيق عقار)
          ======================================================== */}
      {accountDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setAccountDrawerOpen(false)}
          />

          {/* Sliding Bottom Drawer Panel */}
          <div className="relative w-full max-w-lg bg-slate-50 rounded-t-3xl shadow-2xl border-t border-slate-200 p-4 pb-36 max-h-[90vh] overflow-y-auto z-10 transition-transform duration-300 ease-out animate-in slide-in-from-bottom">
            {/* Grab Handle */}
            <div
              className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 cursor-pointer hover:bg-slate-400 transition-colors"
              onClick={() => setAccountDrawerOpen(false)}
            />

            {/* Top Bar matching screenshot */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3 bg-white -mx-4 -mt-1 px-5 pt-1">
              {/* Right: Title */}
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">حسابي</h3>
              </div>

              {/* Left: Wallet balance pill & Close */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-bold">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>لا يوجد رصيد</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content for Logged-in User */}
            {user ? (
              <div className="space-y-3.5">
                {/* 1. Profile Summary Card (بطاقة رقم الجوال / المعرف) */}
                <Link
                  href="/account/profile"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="block bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-emerald-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-black text-sm text-slate-900 block" dir="ltr">
                          {user.phone || user.email || user.name}
                        </span>
                        {user.name && user.phone && (
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {user.name}
                          </span>
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 2. Quick Action Row: المفضلة والتنبيهات (Grid 2 cols) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountDrawerOpen(false);
                      setNotificationsModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 font-bold text-xs shadow-2xs transition-all active:scale-98"
                  >
                    <span>التنبيهات</span>
                    <Bell className="w-4 h-4 text-slate-500" />
                  </button>
                  <Link
                    href="/account/favorites"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="flex items-center justify-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 font-bold text-xs shadow-2xs transition-all active:scale-98"
                  >
                    <span>المفضلة</span>
                    <Heart className="w-4 h-4 text-slate-500" />
                  </Link>
                </div>

                {/* 3. Promotional Value-Add Cards (مغلقة مؤقتاً بناءً على الطلب) */}
                <div className="space-y-2">
                  {/* عقار+ Card (مغلق مؤقتاً) */}
                  <div className="w-full flex items-center justify-between p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs text-right opacity-80 cursor-not-allowed">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        مغلق مؤقتاً
                      </span>
                      <ChevronLeft className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-1 justify-end">
                          <span className="font-black text-xs text-slate-700">+عقار</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          +استكشف مزايا عقار
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5 text-amber-400" />
                      </div>
                    </div>
                  </div>

                  {/* خدمات الترويج Card (مغلق مؤقتاً) */}
                  <div className="w-full flex items-center justify-between p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs text-right opacity-80 cursor-not-allowed">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        مغلق مؤقتاً
                      </span>
                      <ChevronLeft className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-black text-xs text-slate-700 block">
                          خدمات الترويج
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          خدمات تساعدك على تسريع بيع وتأجير العقار
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                        <Flag className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Section: النشاط */}
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center justify-end gap-1.5 px-1">
                    <span className="font-black text-xs text-slate-800">النشاط</span>
                    <BarChart2 className="w-4 h-4 text-slate-600" />
                  </div>

                  {/* Big Green Add Button (يخفي حسابي ويظهر لوحة إضافة إعلان بالتسلسل) */}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountDrawerOpen(false);
                      setAddAdvertiserStep("choice");
                      setAddChoiceModalOpen(true);
                    }}
                    className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-black text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>إضافة +</span>
                  </button>

                  {/* Activity Items Group */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    {/* مشاريعي */}
                    <Link
                      href="/dashboard/properties"
                      onClick={() => setAccountDrawerOpen(false)}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group text-right"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                      <div>
                        <span className="font-black text-xs text-slate-900 block">مشاريعي</span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          إدارة ومتابعة المشاريع والعقارات المضافة
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* 5. Section: إدارة الحساب */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-end gap-1.5 px-1">
                    <span className="font-black text-xs text-slate-800">إدارة الحساب</span>
                    <UserIcon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                    {/* الملف الشخصي */}
                    <Link
                      href="/account/profile"
                      onClick={() => setAccountDrawerOpen(false)}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group text-right"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                      <span className="font-black text-xs text-slate-900 block">الملف الشخصي</span>
                    </Link>

                    {/* تغيير رقم الجوال (مغلق مؤقتاً) */}
                    <div className="w-full flex items-center justify-between p-3.5 text-right opacity-70 cursor-not-allowed">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          مغلق مؤقتاً
                        </span>
                        <ChevronLeft className="w-4 h-4 text-slate-300" />
                      </div>
                      <span className="font-black text-xs text-slate-600 block">تغيير رقم الجوال</span>
                    </div>

                    {/* لوحة الإدارة للمدير */}
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setAccountDrawerOpen(false)}
                        className="flex items-center justify-between p-3.5 hover:bg-amber-50 text-amber-900 transition-colors group text-right"
                      >
                        <ChevronLeft className="w-4 h-4 text-amber-600 group-hover:-translate-x-0.5 transition-transform" />
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs block">لوحة الإدارة المركزية (Admin)</span>
                          <Shield className="w-4 h-4 text-amber-600" />
                        </div>
                      </Link>
                    )}

                    {/* تسجيل الخروج */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-rose-50 text-rose-600 font-black text-xs transition-colors group text-right disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
                      <div className="flex items-center gap-2">
                        <span>{loggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}</span>
                        <LogOut className="w-4 h-4 text-rose-600" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Content for Guest User */
              <div className="space-y-4 pt-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto text-brand-700">
                  <UserIcon className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">
                    أهلاً بك في منصة عقار
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    سجل دخولك برقم جوالك أو بريدك الإلكتروني للوصول إلى لوحة التحكم، وإضافة العقارات، وحفظ مفضلاتك.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
                  >
                    <span>تسجيل الدخول</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL 1: ماذا تريد أن تضيف؟ وتسلسل (مالك أم وسيط)
          ======================================================== */}
      {addChoiceModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => {
              setAddChoiceModalOpen(false);
              setAddAdvertiserStep("choice");
            }}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-36 z-10 transition-transform animate-in slide-in-from-bottom">
            <div
              className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 cursor-pointer hover:bg-slate-400"
              onClick={() => {
                setAddChoiceModalOpen(false);
                setAddAdvertiserStep("choice");
              }}
            />

            {addAdvertiserStep === "choice" ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-base font-black text-slate-900">ماذا تريد أن تضيف؟</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setAddChoiceModalOpen(false);
                      setAddAdvertiserStep("choice");
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* إضافة إعلان */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddAdvertiserStep("role_question");
                    }}
                    className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group text-right"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-black text-sm text-slate-900 block">إضافة إعلان</span>
                        <span className="text-xs text-slate-400 font-medium block mt-0.5">
                          اعرض عقارك أو وحدتك في منصة عقار
                        </span>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-emerald-700" />
                      </div>
                    </div>
                  </button>

                  {/* إضافة طلب بحث (مغلق مؤقتاً) */}
                  <div
                    className="w-full flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-right opacity-70 cursor-not-allowed select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                        مغلق مؤقتاً
                      </span>
                      <ChevronLeft className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-black text-sm text-slate-600 block">إضافة طلب بحث</span>
                        <span className="text-xs text-slate-400 font-medium block mt-0.5">
                          سجل طلبك للحصول على تنبيهات عند توفره
                        </span>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                        <Search className="w-6 h-6 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Step 2: هل أنت مالك أم وسيط عقاري؟ */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                  <button
                    type="button"
                    onClick={() => setAddAdvertiserStep("choice")}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>رجوع</span>
                  </button>
                  <h3 className="text-base font-black text-slate-900">هل أنت مالك أم وسيط عقاري؟</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setAddChoiceModalOpen(false);
                      setAddAdvertiserStep("choice");
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 font-medium text-right leading-relaxed">
                  يرجى تحديد صفتك لمتابعة إضافة العقار أو المشروع بالبيانات الصحيحة:
                </p>

                <div className="space-y-3 pt-1">
                  {/* Option 1: مالك */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddChoiceModalOpen(false);
                      setAddAdvertiserStep("choice");
                      setAccountDrawerOpen(false);
                      router.push("/dashboard/properties/new?advertiserType=owner");
                    }}
                    className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all group text-right shadow-2xs"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:-translate-x-0.5 group-hover:text-emerald-700 transition-all" />
                    <div className="flex items-center gap-3.5">
                      <div>
                        <span className="font-black text-sm text-slate-900 group-hover:text-emerald-800 block">
                          مالك العقار
                        </span>
                        <span className="text-xs text-slate-500 font-medium block mt-0.5">
                          أنا صاحب العقار أو الوكيل المباشر عن المالك
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 transition-transform">
                        <Home className="w-6 h-6 text-emerald-700" />
                      </div>
                    </div>
                  </button>

                  {/* Option 2: وسيط عقاري / مطور */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddChoiceModalOpen(false);
                      setAddAdvertiserStep("choice");
                      setAccountDrawerOpen(false);
                      router.push("/dashboard/properties/new?advertiserType=broker");
                    }}
                    className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all group text-right shadow-2xs"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:-translate-x-0.5 group-hover:text-emerald-700 transition-all" />
                    <div className="flex items-center gap-3.5">
                      <div>
                        <span className="font-black text-sm text-slate-900 group-hover:text-emerald-800 block">
                          وسيط عقاري / مطور
                        </span>
                        <span className="text-xs text-slate-500 font-medium block mt-0.5">
                          أنا وسيط عقاري أو مسوق أو شركة تطوير معتمدة
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 group-hover:scale-105 transition-transform">
                        <Briefcase className="w-6 h-6 text-teal-700" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          NOTIFICATIONS MODAL: لوحة التنبيهات الرسمية والإشعارات
          ======================================================== */}
      {notificationsModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setNotificationsModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-36 max-h-[85vh] overflow-y-auto z-10 transition-transform animate-in slide-in-from-bottom">
            <div
              className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 cursor-pointer hover:bg-slate-400"
              onClick={() => setNotificationsModalOpen(false)}
            />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">لوحة التنبيهات والإشعارات</h3>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    تحديثات العقارات والمراسلات الرسمية
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <OfficialNoticesList
                onOpenEditProperty={() => {
                  setNotificationsModalOpen(false);
                  router.push(`/dashboard/properties`);
                }}
              />

              <div className="pt-2 border-t border-slate-100">
                <Link
                  href="/dashboard/inquiries"
                  onClick={() => setNotificationsModalOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
                >
                  <span>عرض كافة المحادثات والاستفسارات</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL 2: عقار+ (مطابقة لصورة img_0_6.jpg)
          ======================================================== */}
      {aqarPlusModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setAqarPlusModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8 max-h-[88vh] overflow-y-auto z-10 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs text-slate-400">باقة التميز</span>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">عقار+</h3>
                <button
                  type="button"
                  onClick={() => setAqarPlusModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="text-center space-y-2 py-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                <Crown className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-600 font-bold max-w-xs mx-auto leading-relaxed">
                مجموعة من الخدمات المميزة تقدم ضمن باقة خاصة للعملاء للاستفادة الكاملة من تطبيق عقار
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 my-4">
              {[
                { title: "فلترة عقارات المالك", icon: Home },
                { title: "استخدام خريطة عقار", icon: Compass },
                { title: "البحث بالعقارات المباشرة", icon: Building2 },
                { title: "البحث بمحتوى الإعلان", icon: FileText },
                { title: "سجل إحصائيات الإعلان", icon: BarChart2 },
                { title: "طلبات عقارية حتى 20", icon: Plus },
                { title: "عرض المفضلة بالخريطة", icon: MapPin },
                { title: "خدمات حصرية أخرى", icon: Sparkles },
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center gap-1.5"
                  >
                    <Icon className="w-5 h-5 text-slate-700" />
                    <span className="text-[10px] font-bold text-slate-700 leading-tight">
                      {feat.title}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-xs font-black text-slate-900">29.99 ريال شهرياً</span>
              <button
                type="button"
                onClick={() => {
                  alert("تم تسجيل اهتمامك بباقة عقار+ بنجاح وسيتم إشعارك فور تفعيل الاشتراك المباشر");
                  setAqarPlusModalOpen(false);
                }}
                className="py-3 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-sm transition-all"
              >
                اشترك في الخدمة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL 3: ترويج الإعلان (مطابقة لصورة img_0_1.jpg)
          ======================================================== */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setPromoModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8 max-h-[88vh] overflow-y-auto z-10 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs text-slate-400">خدمات التسويق</span>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">ترويج الإعلان</h3>
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium text-right mb-4 leading-relaxed">
              مجموعة من الخدمات المخصصة تساعدك في إيصال إعلانك للعملاء المستهدفين لتسريع عملية البيع أو التأجير. الرجاء اختيار الخدمة:
            </p>

            <div className="space-y-2.5">
              {[
                {
                  title: "الإعلان المميز",
                  subtitle: "ميز إعلانك على عقار لجذب انتباه العملاء",
                  icon: Star,
                  bg: "bg-emerald-600 text-white",
                },
                {
                  title: "تنبيه المهتمين",
                  subtitle: "أرسل إعلانك للباحثين عن عقارات مشابهة لعقارك",
                  icon: Bell,
                  bg: "bg-blue-600 text-white",
                },
                {
                  title: "الإعلان الذهبي",
                  subtitle: "أظهر إعلانك باللون الذهبي على منصة عقار",
                  icon: Crown,
                  bg: "bg-amber-500 text-white",
                },
                {
                  title: "إعلان منصات التواصل الاجتماعي",
                  subtitle: "اعلن عبر حسابات عقار في منصات التواصل",
                  icon: Share2,
                  bg: "bg-slate-700 text-white",
                },
              ].map((promo, idx) => {
                const Icon = promo.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPromoModalOpen(false);
                      setAccountDrawerOpen(false);
                      router.push("/dashboard/properties");
                    }}
                    className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 shadow-2xs transition-all text-right group"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-black text-xs text-slate-900 block">{promo.title}</span>
                        <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                          {promo.subtitle}
                        </span>
                      </div>
                      <div className={`w-10 h-10 rounded-xl ${promo.bg} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}



      {/* ========================================================
          SUB-MODAL 5: تغيير رقم الجوال (مطابقة لصورة img_0_8.jpg)
          ======================================================== */}
      {changePhoneModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setChangePhoneModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8 z-10 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs text-slate-400">تحديث البيانات</span>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">تغيير رقم الجوال</h3>
                <button
                  type="button"
                  onClick={() => setChangePhoneModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdatePhone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 text-right">
                  رقم الجوال الجديد
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={newPhoneInput}
                  onChange={(e) => setNewPhoneInput(e.target.value)}
                  placeholder="+20 100 000 0000"
                  className="w-full text-left px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              {phoneMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center">
                  {phoneMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={phoneUpdating}
                className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-all"
              >
                {phoneUpdating ? "جاري الحفظ..." : "استمرار"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Bottom Sheet (نافذة التحكم والإدارة المركزية الشاملة) */}
      {adminDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setAdminDrawerOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-slate-900 text-white rounded-t-3xl shadow-2xl border-t border-slate-800 p-5 pb-8 max-h-[88vh] overflow-y-auto z-10 transition-transform duration-300 ease-out animate-in slide-in-from-bottom">
            {/* Grab Handle */}
            <div
              className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer hover:bg-slate-600 transition-colors"
              onClick={() => setAdminDrawerOpen(false)}
            />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-400 leading-tight">
                    لوحة التحكم والعمليات المركزية
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    admin@aqarpulse.eg • مسؤول النظام المعتمد
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action to New Admin Dashboard */}
            <div className="py-6 space-y-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">لوحة تحكم شركة الإدارة</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  تمت تهيئة وتصفير لوحة التحكم بالكامل، واللوحة جاهزة الآن لبدء التطوير الجديد.
                </p>
              </div>
              <Link
                href="/admin"
                onClick={() => setAdminDrawerOpen(false)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
              >
                <span>فتح لوحة تحكم شركة الإدارة</span>
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>

            {/* Quick Navigation to Public Site */}
            <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block px-1">
                معاينة المنصة:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/"
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Home className="w-3.5 h-3.5 text-brand-400" />
                  <span>الموقع الرئيسي</span>
                </Link>
                <Link
                  href="/explore"
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Compass className="w-3.5 h-3.5 text-brand-400" />
                  <span>الخريطة التفاعلية</span>
                </Link>
              </div>

              {/* Admin Logout */}
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="w-full mt-2 py-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {loggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-300" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span>تسجيل خروج مسؤول النظام</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Mobile Search & Filter Drawer */}
      <MobileSearchDrawer
        isOpen={searchDrawerOpen}
        onClose={() => setSearchDrawerOpen(false)}
      />
    </>
  );
}

function getRoleNameAr(role?: UserRole): string {
  switch (role) {
    case "admin":
      return "مدير النظام";
    case "broker":
      return "وسيط عقاري معتمد";
    case "owner":
      return "مالك عقار";
    case "seeker":
    case "buyer":
      return "عميل / باحث";
    default:
      return "زائر";
  }
}
