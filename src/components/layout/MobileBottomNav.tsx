"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Bell,
  BarChart2,
  Crown,
  Flag,
  Star,
  Share2,
  Plus,
  Palette,
  HelpCircle,
  Phone,
} from "lucide-react";
import { User, UserRole } from "@/lib/db/types";
import { canAccessAdminSection } from "@/lib/auth/admin-permissions";
import MobileSearchDrawer from "./MobileSearchDrawer";
import OfficialNoticesList from "@/components/dashboard/OfficialNoticesList";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const fetchUnreadMessages = useCallback(async (role?: UserRole) => {
    if (!role) {
      setUnreadMessagesCount(0);
      return;
    }

    try {
      const mode = role === "admin" ? "?mode=admin" : "";
      const res = await fetch(`/api/inquiries${mode}`, { cache: "no-store", credentials: "include" });
      if (res.status === 401) {
        setUnreadMessagesCount(0);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUnreadMessagesCount(typeof data.totalUnread === "number" ? data.totalUnread : 0);
      } else {
        console.warn("[MobileBottomNav] Failed to refresh unread message count:", res.status);
      }
    } catch (error) {
      console.warn("[MobileBottomNav] Could not refresh unread message count:", error);
    }
  }, []);

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
    if (pathname.startsWith("/admin")) return;
    fetchUser();
    setAccountDrawerOpen(false);
    setAdminDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    void fetchUnreadMessages(user?.role);
  }, [fetchUnreadMessages, pathname, user?.role]);

  useEffect(() => {
    if (!pathname.startsWith("/admin") && user?.role === "admin") {
      fetchAdminStats();
    }
  }, [pathname, user?.role]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const refreshUnreadMessages = () => {
      if (document.visibilityState === "visible") {
        void fetchUnreadMessages(user?.role);
      }
    };
    const handleAuthChange = () => {
      fetchUser();
      fetchAdminStats();
      refreshUnreadMessages();
    };
    const intervalId = window.setInterval(refreshUnreadMessages, 15000);
    window.addEventListener("auth-state-changed", handleAuthChange);
    window.addEventListener("messages-read", refreshUnreadMessages);
    window.addEventListener("messages-updated", refreshUnreadMessages);
    window.addEventListener("focus", refreshUnreadMessages);
    document.addEventListener("visibilitychange", refreshUnreadMessages);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("auth-state-changed", handleAuthChange);
      window.removeEventListener("messages-read", refreshUnreadMessages);
      window.removeEventListener("messages-updated", refreshUnreadMessages);
      window.removeEventListener("focus", refreshUnreadMessages);
      document.removeEventListener("visibilitychange", refreshUnreadMessages);
    };
  }, [fetchUnreadMessages, pathname, user?.role]);

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
        setPhoneMessage("ØªÙ… ØªØ­Ø¯ÙŠØ« Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø¨Ù†Ø¬Ø§Ø­!");
        fetchUser();
        setTimeout(() => {
          setChangePhoneModalOpen(false);
          setPhoneMessage(null);
        }, 1500);
      } else {
        setPhoneMessage(data.error || "ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„");
      }
    } catch {
      setPhoneMessage("Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØ­Ø¯ÙŠØ« Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„");
    } finally {
      setPhoneUpdating(false);
    }
  };

  const currentAdminTab = searchParams.get("tab") || "projects";
  const isAdminHome = pathname === "/admin";
  const isAnalyticsActive = pathname === "/admin/analytics";

  const isAccountActive =
    accountDrawerOpen ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/account");

  const isAdminSection = user?.role === "admin" && pathname.startsWith("/admin");

  if (pathname.startsWith("/properties/") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {isAdminSection ? (
        /* ========================================================
           ADMIN CONTROL PANEL BOTTOM BAR (ÙˆØ¶Ø¹ Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø´Ø±ÙƒØ© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©)
           ======================================================== */
        <nav
          aria-label="Ø´Ø±ÙŠØ· Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø´Ø±ÙƒØ© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©"
          className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-slate-300 shadow-[0_-8px_25px_rgba(0,0,0,0.45)] px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom,16px))]"
        >
          <div className="mx-auto flex max-w-md items-center justify-start gap-1 overflow-x-auto relative">
            {/* 1. Ø§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª ÙˆØ§Ù„Ù…Ø¤Ø´Ø±Ø§Øª */}
            {canAccessAdminSection(user, "staff") && (
            <Link
              href="/admin/analytics"
              aria-current={isAnalyticsActive ? "page" : undefined}
              className={`flex w-14 shrink-0 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
                isAnalyticsActive
                  ? "text-cyan-400 font-black"
                  : "text-slate-400 font-bold"
              }`}
            >
              <BarChart2 className={`w-5 h-5 transition-transform ${isAnalyticsActive ? "scale-110 stroke-[2.5]" : "stroke-2"}`} />
              {isAnalyticsActive && (<span className="sr-only">نشط</span>)}
              <span className="text-[10px] tracking-tight mt-1 font-bold whitespace-nowrap">
                Ø§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª
              </span>
            </Link>
            )}

            {/* 2. Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ */}
            {canAccessAdminSection(user, "projects") && (
            <Link
              href="/admin?tab=projects"
              aria-current={isAdminHome && currentAdminTab === "projects" ? "page" : undefined}
              className={`flex w-14 shrink-0 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
                isAdminHome && currentAdminTab === "projects"
                  ? "text-amber-400 font-black"
                  : "text-slate-400 font-bold"
              }`}
            >
              <div className="relative">
                <Building2
                  className={`w-5 h-5 transition-transform ${
                    isAdminHome && currentAdminTab === "projects" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {isAdminHome && currentAdminTab === "projects" && (
                  <span className="sr-only">نشط</span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹
              </span>
            </Link>
            )}

            {/* 3. Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ */}
            {canAccessAdminSection(user, "messages") && (
            <Link
              href="/admin?tab=messages"
              aria-current={isAdminHome && currentAdminTab === "messages" ? "page" : undefined}
              className={`flex w-14 shrink-0 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
                isAdminHome && currentAdminTab === "messages"
                  ? "text-emerald-400 font-black"
                  : "text-slate-400 font-bold"
              }`}
            >
              <div className="relative">
                <MessageSquare
                  className={`w-5 h-5 transition-transform ${
                    isAdminHome && currentAdminTab === "messages" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {isAdminHome && currentAdminTab === "messages" && (
                  <span className="sr-only">نشط</span>
                )}
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse ring-2 ring-slate-900 shadow-xs">
                    {unreadMessagesCount > 99 ? "+99" : unreadMessagesCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                Ø§Ù„Ø±Ø³Ø§Ø¦Ù„
              </span>
            </Link>
            )}

            {/* 4. Ø§Ù„Ù‡ÙˆÙŠØ© ÙˆØ§Ù„Ù…Ø­ØªÙˆÙ‰ */}
            {canAccessAdminSection(user, "cms") && (
            <Link
              href="/admin?tab=cms"
              aria-current={isAdminHome && currentAdminTab === "cms" ? "page" : undefined}
              className={`flex w-14 shrink-0 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
                isAdminHome && currentAdminTab === "cms"
                  ? "text-purple-400 font-black"
                  : "text-slate-400 font-bold"
              }`}
            >
              <div className="relative">
                <Palette
                  className={`w-5 h-5 transition-transform ${
                    isAdminHome && currentAdminTab === "cms" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {isAdminHome && currentAdminTab === "cms" && (
                  <span className="sr-only">نشط</span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                Ø§Ù„Ù…Ø­ØªÙˆÙ‰
              </span>
            </Link>
            )}

            {/* 5. Ø§Ù„Ø¯Ø¹Ù… */}
            {canAccessAdminSection(user, "support") && (
            <Link
              href="/admin?tab=support"
              aria-current={isAdminHome && currentAdminTab === "support" ? "page" : undefined}
              className={`flex w-14 shrink-0 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
                isAdminHome && currentAdminTab === "support"
                  ? "text-sky-400 font-black"
                  : "text-slate-400 font-bold"
              }`}
            >
              <div className="relative">
                <HelpCircle
                  className={`w-5 h-5 transition-transform ${
                    isAdminHome && currentAdminTab === "support" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {isAdminHome && currentAdminTab === "support" && (
                  <span className="sr-only">نشط</span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                Ø§Ù„Ø¯Ø¹Ù…
              </span>
            </Link>
            )}

            {/* 6. Ø§Ù„ØªÙ‚ÙŠÙŠÙ…Ø§Øª ÙˆØ§Ù„Ù…Ù†Ø§ÙØ³Ø© */}
            {canAccessAdminSection(user, "ratings") && (
            <Link
              href="/admin?tab=ratings"
              aria-current={isAdminHome && currentAdminTab === "ratings" ? "page" : undefined}
              className={`flex w-14 shrink-0 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
                isAdminHome && currentAdminTab === "ratings"
                  ? "text-yellow-400 font-black"
                  : "text-slate-400 font-bold"
              }`}
            >
              <div className="relative">
                <Star
                  className={`w-5 h-5 transition-transform ${
                    isAdminHome && currentAdminTab === "ratings" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {isAdminHome && currentAdminTab === "ratings" && (
                  <span className="sr-only">نشط</span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                Ø§Ù„ØªÙ‚ÙŠÙŠÙ…Ø§Øª
              </span>
            </Link>
            )}

            {/* 7. Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† */}
            {canAccessAdminSection(user, "staff") && (
            <Link
              href="/admin?tab=staff"
              aria-current={isAdminHome && currentAdminTab === "staff" ? "page" : undefined}
              className={`flex w-14 shrink-0 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
                isAdminHome && currentAdminTab === "staff"
                  ? "text-indigo-400 font-black"
                  : "text-slate-400 font-bold"
              }`}
            >
              <div className="relative">
                <Users
                  className={`w-5 h-5 transition-transform ${
                    isAdminHome && currentAdminTab === "staff" ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
                {isAdminHome && currentAdminTab === "staff" && (
                  <span className="sr-only">نشط</span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-bold">
                Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†
              </span>
            </Link>
            )}
          </div>
        </nav>
      ) : (
        /* ========================================================
           STANDARD USER BOTTOM BAR (ÙˆØ¶Ø¹ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¹Ø§Ù…)
           ======================================================== */
        <nav
          aria-label="Ø§Ù„ØªÙ†Ù‚Ù„ Ø§Ù„Ø³Ø±ÙŠØ¹ Ù„Ù„Ù…ÙˆÙ‚Ø¹"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom,16px))]"
        >
          <div className="max-w-md mx-auto flex items-center justify-around relative">
            {/* 1. Ø­Ø³Ø§Ø¨ÙŠ (Ø£Ù‚ØµÙ‰ Ø§Ù„ÙŠÙ…ÙŠÙ†) */}
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
                  <span className="sr-only">Ù†Ø´Ø·</span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  isAccountActive ? "font-black text-emerald-700" : "font-semibold"
                }`}
              >
                Ø­Ø³Ø§Ø¨ÙŠ
              </span>
            </button>

            {/* 2. Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª */}
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
                  <span className="sr-only">Ù†Ø´Ø·</span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  pathname === "/" || pathname === "/explore" ? "font-black text-emerald-700" : "font-semibold"
                }`}
              >
                Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª
              </span>
            </Link>

            {/* 4. Ø¥Ø¶Ø§ÙØ© Ø¹Ù‚Ø§Ø± */}
            <Link
              href="/dashboard/properties/new"
              aria-label="Ø¥Ø¶Ø§ÙØ© Ø¹Ù‚Ø§Ø± Ø¬Ø¯ÙŠØ¯"
              className="relative -mt-5 flex flex-col items-center justify-center gap-1 px-2 active:scale-95 transition-transform"
            >
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200 transition-transform hover:scale-105">
                <Building2 className="h-6 w-6 stroke-[2.5] text-white fill-white" style={{ color: "white" }} />
                <Plus className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-full bg-white p-0.5" style={{ color: "white" }} />
              </span>
              <span className="whitespace-nowrap text-[10px] font-black tracking-tight text-slate-700">
                Ø¥Ø¶Ø§ÙØ© Ø¹Ù‚Ø§Ø±
              </span>
            </Link>

            {/* 4. Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª */}
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
                  <span className="sr-only">Ù†Ø´Ø·</span>
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
                Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª
              </span>
            </Link>

            {/* 5. Ø§Ù„Ø®Ø¯Ù…Ø§Øª (Ø£Ù‚ØµÙ‰ Ø§Ù„ÙŠØ³Ø§Ø±) */}
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
                  <span className="sr-only">Ù†Ø´Ø·</span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  pathname === "/services" ? "font-black text-emerald-700" : "font-semibold"
                }`}
              >
                Ø§Ù„Ø®Ø¯Ù…Ø§Øª
              </span>
            </Link>
          </div>
        </nav>
      )}

      {/* ========================================================
          UNIFIED ACCOUNT BOTTOM SHEET (Ù†Ø§ÙØ°Ø© Ø­Ø³Ø§Ø¨ÙŠ Ø§Ù„Ù…ÙˆØ­Ø¯Ø© Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¹Ù‚Ø§Ø±)
          ======================================================== */}
      {accountDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setAccountDrawerOpen(false)}
          />

          {/* Sliding Bottom Drawer Panel */}
          {/* Sliding Bottom Drawer Panel */}
          <div className="relative w-full max-w-lg bg-slate-50 rounded-t-3xl shadow-2xl border-t border-slate-200 p-4 pb-36 max-h-[90vh] overflow-y-auto z-10 transition-transform duration-300 ease-out animate-in slide-in-from-bottom" dir="rtl">
            {/* Grab Handle */}
            <div
              className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 cursor-pointer hover:bg-slate-400 transition-colors"
              onClick={() => setAccountDrawerOpen(false)}
            />

            {/* Top Bar (Title on the right, Close on the left - Credit/Balance completely removed) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3 bg-white -mx-4 -mt-1 px-5 pt-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Ø­Ø³Ø§Ø¨ÙŠ</h3>
              </div>

              <button
                type="button"
                onClick={() => setAccountDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Ø¥ØºÙ„Ø§Ù‚"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content for Logged-in User */}
            {user ? (
              <div className="space-y-3.5 text-right">
                {/* 1. Profile Summary Card (Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø­Ø³Ø§Ø¨ ÙˆØ§Ù„Ø¨Ø±ÙŠØ¯) */}
                <Link
                  href="/account/profile"
                  onClick={() => setAccountDrawerOpen(false)}
                  className="block bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-emerald-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between text-right w-full">
                    {/* Right side: Avatar on far right, info next to it */}
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-2xs">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-slate-900 block" dir="ltr">
                          {user.email || user.phone || user.name}
                        </span>
                        {user.name && user.email && (
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {user.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Left side: Navigation chevron */}
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </Link>

                {/* 2. Quick Action Row: Ø§Ù„Ù…ÙØ¶Ù„Ø© ÙˆØ§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª (Grid 2 cols) */}
                <div className="grid grid-cols-2 gap-2.5 text-right">
                  <Link
                    href="/account/favorites"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 font-bold text-xs shadow-2xs transition-all active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Ø§Ù„Ù…ÙØ¶Ù„Ø©</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountDrawerOpen(false);
                      setNotificationsModalOpen(true);
                    }}
                    className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 font-bold text-xs shadow-2xs transition-all active:scale-98 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </div>

                {/* 3. Promotional Value-Add Cards */}
                <div className="space-y-2">
                  {/* Ø¹Ù‚Ø§Ø±+ Card (Ù…ØºÙ„Ù‚ Ù…Ø¤Ù‚ØªØ§Ù‹) */}
                  <div className="w-full flex items-center justify-between p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs text-right opacity-80 cursor-not-allowed">
                    {/* Right side: Icon on far right, then title & subtitle */}
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="text-right">
                        <span className="font-black text-xs text-slate-700 block">+Ø¹Ù‚Ø§Ø±</span>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          Ø§Ø³ØªÙƒØ´Ù Ù…Ø²Ø§ÙŠØ§ Ø¹Ù‚Ø§Ø±+
                        </span>
                      </div>
                    </div>

                    {/* Left side: Status badge & Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        Ù…ØºÙ„Ù‚ Ù…Ø¤Ù‚ØªØ§Ù‹
                      </span>
                      <ChevronLeft className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>

                  {/* Ø®Ø¯Ù…Ø§Øª Ø§Ù„ØªØ±ÙˆÙŠØ¬ Card (Ù…ØºÙ„Ù‚ Ù…Ø¤Ù‚ØªØ§Ù‹) */}
                  <div className="w-full flex items-center justify-between p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs text-right opacity-80 cursor-not-allowed">
                    {/* Right side: Icon on far right, then title & subtitle */}
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                        <Flag className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="text-right">
                        <span className="font-black text-xs text-slate-700 block">
                          Ø®Ø¯Ù…Ø§Øª Ø§Ù„ØªØ±ÙˆÙŠØ¬
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          Ø®Ø¯Ù…Ø§Øª ØªØ³Ø§Ø¹Ø¯Ùƒ Ø¹Ù„Ù‰ ØªØ³Ø±ÙŠØ¹ Ø¨ÙŠØ¹ ÙˆØªØ£Ø¬ÙŠØ± Ø§Ù„Ø¹Ù‚Ø§Ø±
                        </span>
                      </div>
                    </div>

                    {/* Left side: Status badge & Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Ù…ØºÙ„Ù‚ Ù…Ø¤Ù‚ØªØ§Ù‹
                      </span>
                      <ChevronLeft className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                </div>

                {/* 4. Section: Ø§Ù„Ù†Ø´Ø§Ø· */}
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center gap-1.5 px-1 text-right">
                    <BarChart2 className="w-4 h-4 text-slate-600" />
                    <span className="font-black text-xs text-slate-800">Ø§Ù„Ù†Ø´Ø§Ø·</span>
                  </div>

                  {/* Big Green Add Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountDrawerOpen(false);
                      setAddAdvertiserStep("choice");
                      setAddChoiceModalOpen(true);
                    }}
                    className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-black text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Ø¥Ø¶Ø§ÙØ© +</span>
                  </button>

                  {/* Activity Items Group */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    {/* Ù…Ø´Ø§Ø±ÙŠØ¹ÙŠ */}
                    <Link
                      href="/dashboard/properties"
                      onClick={() => setAccountDrawerOpen(false)}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group text-right w-full"
                    >
                      {/* Right side: Icon, title "Ù…Ø´Ø§Ø±ÙŠØ¹ÙŠ" and subtitle starting from far right */}
                      <div className="flex items-center gap-3 text-right">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="text-right">
                          <span className="font-black text-xs text-slate-900 block">Ù…Ø´Ø§Ø±ÙŠØ¹ÙŠ</span>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            Ø¥Ø¯Ø§Ø±Ø© ÙˆÙ…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ ÙˆØ§Ù„Ø¹Ù‚Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø¶Ø§ÙØ©
                          </span>
                        </div>
                      </div>

                      {/* Left side: Navigation chevron */}
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                    </Link>
                  </div>
                </div>

                {/* 5. Section: Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø­Ø³Ø§Ø¨ */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-1.5 px-1 text-right">
                    <UserIcon className="w-4 h-4 text-slate-600" />
                    <span className="font-black text-xs text-slate-800">Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø­Ø³Ø§Ø¨</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                    {/* Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ */}
                    <Link
                      href="/account/profile"
                      onClick={() => setAccountDrawerOpen(false)}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group text-right w-full"
                    >
                      <div className="flex items-center gap-3 text-right">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="font-black text-xs text-slate-900 block">Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                    </Link>

                    {/* ØªØºÙŠÙŠØ± Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ (Ù…ØºÙ„Ù‚ Ù…Ø¤Ù‚ØªØ§Ù‹) */}
                    <div className="w-full flex items-center justify-between p-3.5 text-right opacity-70 cursor-not-allowed">
                      <div className="flex items-center gap-3 text-right">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="font-black text-xs text-slate-600 block">ØªØºÙŠÙŠØ± Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          Ù…ØºÙ„Ù‚ Ù…Ø¤Ù‚ØªØ§Ù‹
                        </span>
                        <ChevronLeft className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>

                    {/* Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ù„Ù„Ù…Ø¯ÙŠØ± */}
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setAccountDrawerOpen(false)}
                        className="flex items-center justify-between p-3.5 hover:bg-amber-50 text-amber-900 transition-colors group text-right w-full"
                      >
                        <div className="flex items-center gap-3 text-right">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Shield className="w-4 h-4 text-amber-600" />
                          </div>
                          <span className="font-black text-xs block">Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø±ÙƒØ²ÙŠØ© (Admin)</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-amber-600 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                      </Link>
                    )}

                    {/* ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬ */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-rose-50 text-rose-600 font-black text-xs transition-colors group text-right disabled:opacity-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-right">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          <LogOut className="w-4 h-4 text-rose-600" />
                        </div>
                        <span>{loggingOut ? "Ø¬Ø§Ø±ÙŠ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬..." : "ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬"}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-rose-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
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
                    Ø£Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ ÙÙŠ Ù…Ù†ØµØ© Ø¹Ù‚Ø§Ø±
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Ø³Ø¬Ù„ Ø¯Ø®ÙˆÙ„Ùƒ Ø¨Ø±Ù‚Ù… Ø¬ÙˆØ§Ù„Ùƒ Ø£Ùˆ Ø¨Ø±ÙŠØ¯Ùƒ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ù„Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…ØŒ ÙˆØ¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ù‚Ø§Ø±Ø§ØªØŒ ÙˆØ­ÙØ¸ Ù…ÙØ¶Ù„Ø§ØªÙƒ.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL 1: Ù…Ø§Ø°Ø§ ØªØ±ÙŠØ¯ Ø£Ù† ØªØ¶ÙŠÙØŸ ÙˆØªØ³Ù„Ø³Ù„ (Ù…Ø§Ù„Ùƒ Ø£Ù… ÙˆØ³ÙŠØ·)
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
                  <h3 className="text-base font-black text-slate-900">Ù…Ø§Ø°Ø§ ØªØ±ÙŠØ¯ Ø£Ù† ØªØ¶ÙŠÙØŸ</h3>
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
                  {/* Ø¥Ø¶Ø§ÙØ© Ø¥Ø¹Ù„Ø§Ù† */}
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
                        <span className="font-black text-sm text-slate-900 block">Ø¥Ø¶Ø§ÙØ© Ø¥Ø¹Ù„Ø§Ù†</span>
                        <span className="text-xs text-slate-400 font-medium block mt-0.5">
                          Ø§Ø¹Ø±Ø¶ Ø¹Ù‚Ø§Ø±Ùƒ Ø£Ùˆ ÙˆØ­Ø¯ØªÙƒ ÙÙŠ Ù…Ù†ØµØ© Ø¹Ù‚Ø§Ø±
                        </span>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-emerald-700" />
                      </div>
                    </div>
                  </button>

                  {/* Ø¥Ø¶Ø§ÙØ© Ø·Ù„Ø¨ Ø¨Ø­Ø« (Ù…ØºÙ„Ù‚ Ù…Ø¤Ù‚ØªØ§Ù‹) */}
                  <div
                    className="w-full flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-right opacity-70 cursor-not-allowed select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                        Ù…ØºÙ„Ù‚ Ù…Ø¤Ù‚ØªØ§Ù‹
                      </span>
                      <ChevronLeft className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-black text-sm text-slate-600 block">Ø¥Ø¶Ø§ÙØ© Ø·Ù„Ø¨ Ø¨Ø­Ø«</span>
                        <span className="text-xs text-slate-400 font-medium block mt-0.5">
                          Ø³Ø¬Ù„ Ø·Ù„Ø¨Ùƒ Ù„Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø¹Ù†Ø¯ ØªÙˆÙØ±Ù‡
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
              /* Step 2: Ù‡Ù„ Ø£Ù†Øª Ù…Ø§Ù„Ùƒ Ø£Ù… ÙˆØ³ÙŠØ· Ø¹Ù‚Ø§Ø±ÙŠØŸ */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                  <button
                    type="button"
                    onClick={() => setAddAdvertiserStep("choice")}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Ø±Ø¬ÙˆØ¹</span>
                  </button>
                  <h3 className="text-base font-black text-slate-900">Ù‡Ù„ Ø£Ù†Øª Ù…Ø§Ù„Ùƒ Ø£Ù… ÙˆØ³ÙŠØ· Ø¹Ù‚Ø§Ø±ÙŠØŸ</h3>
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
                  ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ ØµÙØªÙƒ Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ù‚Ø§Ø± Ø¨Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØµØ­ÙŠØ­Ø©:
                </p>

                <div className="space-y-3 pt-1">
                  {/* Option 1: Ù…Ø§Ù„Ùƒ */}
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
                          Ù…Ø§Ù„Ùƒ Ø§Ù„Ø¹Ù‚Ø§Ø±
                        </span>
                        <span className="text-xs text-slate-500 font-medium block mt-0.5">
                          Ø£Ù†Ø§ ØµØ§Ø­Ø¨ Ø§Ù„Ø¹Ù‚Ø§Ø± Ø£Ùˆ Ø§Ù„ÙˆÙƒÙŠÙ„ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ø¹Ù† Ø§Ù„Ù…Ø§Ù„Ùƒ
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 transition-transform">
                        <Home className="w-6 h-6 text-emerald-700" />
                      </div>
                    </div>
                  </button>

                  {/* Option 2: ÙˆØ³ÙŠØ· Ø¹Ù‚Ø§Ø±ÙŠ / Ù…Ø·ÙˆØ± */}
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
                          ÙˆØ³ÙŠØ· Ø¹Ù‚Ø§Ø±ÙŠ / Ù…Ø·ÙˆØ±
                        </span>
                        <span className="text-xs text-slate-500 font-medium block mt-0.5">
                          Ø£Ù†Ø§ ÙˆØ³ÙŠØ· Ø¹Ù‚Ø§Ø±ÙŠ Ø£Ùˆ Ù…Ø³ÙˆÙ‚ Ø£Ùˆ Ø´Ø±ÙƒØ© ØªØ·ÙˆÙŠØ± Ù…Ø¹ØªÙ…Ø¯Ø©
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
          NOTIFICATIONS MODAL: Ù„ÙˆØ­Ø© Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø±Ø³Ù…ÙŠØ© ÙˆØ§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª
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
                  <h3 className="text-base font-black text-slate-900">Ù„ÙˆØ­Ø© Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª ÙˆØ§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª</h3>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    ØªØ­Ø¯ÙŠØ«Ø§Øª Ø§Ù„Ø¹Ù‚Ø§Ø±Ø§Øª ÙˆØ§Ù„Ù…Ø±Ø§Ø³Ù„Ø§Øª Ø§Ù„Ø±Ø³Ù…ÙŠØ©
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
                  <span>Ø¹Ø±Ø¶ ÙƒØ§ÙØ© Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª ÙˆØ§Ù„Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL 2: Ø¹Ù‚Ø§Ø±+ (Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„ØµÙˆØ±Ø© img_0_6.jpg)
          ======================================================== */}
      {aqarPlusModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setAqarPlusModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8 max-h-[88vh] overflow-y-auto z-10 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs text-slate-400">Ø¨Ø§Ù‚Ø© Ø§Ù„ØªÙ…ÙŠØ²</span>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Ø¹Ù‚Ø§Ø±+</h3>
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
                Ù…Ø¬Ù…ÙˆØ¹Ø© Ù…Ù† Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ù…Ù…ÙŠØ²Ø© ØªÙ‚Ø¯Ù… Ø¶Ù…Ù† Ø¨Ø§Ù‚Ø© Ø®Ø§ØµØ© Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡ Ù„Ù„Ø§Ø³ØªÙØ§Ø¯Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ù…Ù† ØªØ·Ø¨ÙŠÙ‚ Ø¹Ù‚Ø§Ø±
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 my-4">
              {[
                { title: "ÙÙ„ØªØ±Ø© Ø¹Ù‚Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø§Ù„Ùƒ", icon: Home },
                { title: "Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø®Ø±ÙŠØ·Ø© Ø¹Ù‚Ø§Ø±", icon: Compass },
                { title: "Ø§Ù„Ø¨Ø­Ø« Ø¨Ø§Ù„Ø¹Ù‚Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø©", icon: Building2 },
                { title: "Ø§Ù„Ø¨Ø­Ø« Ø¨Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†", icon: FileText },
                { title: "Ø³Ø¬Ù„ Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†", icon: BarChart2 },
                { title: "Ø·Ù„Ø¨Ø§Øª Ø¹Ù‚Ø§Ø±ÙŠØ© Ø­ØªÙ‰ 20", icon: Plus },
                { title: "Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙØ¶Ù„Ø© Ø¨Ø§Ù„Ø®Ø±ÙŠØ·Ø©", icon: MapPin },
                { title: "Ø®Ø¯Ù…Ø§Øª Ø­ØµØ±ÙŠØ© Ø£Ø®Ø±Ù‰", icon: Sparkles },
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
              <span className="text-xs font-black text-slate-900">ÙŠÙØ¹Ù„Ù† Ø§Ù„Ø³Ø¹Ø± Ø¨Ø§Ù„Ø¬Ù†ÙŠÙ‡ Ø§Ù„Ù…ØµØ±ÙŠ Ø¹Ù†Ø¯ Ø§Ù„ØªÙØ¹ÙŠÙ„</span>
              <button
                type="button"
                onClick={() => {
                  alert("ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù‡ØªÙ…Ø§Ù…Ùƒ Ø¨Ø¨Ø§Ù‚Ø© Ø¹Ù‚Ø§Ø±+ Ø¨Ù†Ø¬Ø§Ø­ ÙˆØ³ÙŠØªÙ… Ø¥Ø´Ø¹Ø§Ø±Ùƒ ÙÙˆØ± ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±");
                  setAqarPlusModalOpen(false);
                }}
                className="py-3 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-sm transition-all"
              >
                Ø§Ø´ØªØ±Ùƒ ÙÙŠ Ø§Ù„Ø®Ø¯Ù…Ø©
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL 3: ØªØ±ÙˆÙŠØ¬ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† (Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„ØµÙˆØ±Ø© img_0_1.jpg)
          ======================================================== */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setPromoModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8 max-h-[88vh] overflow-y-auto z-10 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs text-slate-400">Ø®Ø¯Ù…Ø§Øª Ø§Ù„ØªØ³ÙˆÙŠÙ‚</span>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">ØªØ±ÙˆÙŠØ¬ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†</h3>
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
              Ù…Ø¬Ù…ÙˆØ¹Ø© Ù…Ù† Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ù…Ø®ØµØµØ© ØªØ³Ø§Ø¹Ø¯Ùƒ ÙÙŠ Ø¥ÙŠØµØ§Ù„ Ø¥Ø¹Ù„Ø§Ù†Ùƒ Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙÙŠÙ† Ù„ØªØ³Ø±ÙŠØ¹ Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø¨ÙŠØ¹ Ø£Ùˆ Ø§Ù„ØªØ£Ø¬ÙŠØ±. Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø®Ø¯Ù…Ø©:
            </p>

            <div className="space-y-2.5">
              {[
                {
                  title: "Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† Ø§Ù„Ù…Ù…ÙŠØ²",
                  subtitle: "Ù…ÙŠØ² Ø¥Ø¹Ù„Ø§Ù†Ùƒ Ø¹Ù„Ù‰ Ø¹Ù‚Ø§Ø± Ù„Ø¬Ø°Ø¨ Ø§Ù†ØªØ¨Ø§Ù‡ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡",
                  icon: Star,
                  bg: "bg-emerald-600 text-white",
                },
                {
                  title: "ØªÙ†Ø¨ÙŠÙ‡ Ø§Ù„Ù…Ù‡ØªÙ…ÙŠÙ†",
                  subtitle: "Ø£Ø±Ø³Ù„ Ø¥Ø¹Ù„Ø§Ù†Ùƒ Ù„Ù„Ø¨Ø§Ø­Ø«ÙŠÙ† Ø¹Ù† Ø¹Ù‚Ø§Ø±Ø§Øª Ù…Ø´Ø§Ø¨Ù‡Ø© Ù„Ø¹Ù‚Ø§Ø±Ùƒ",
                  icon: Bell,
                  bg: "bg-blue-600 text-white",
                },
                {
                  title: "Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† Ø§Ù„Ø°Ù‡Ø¨ÙŠ",
                  subtitle: "Ø£Ø¸Ù‡Ø± Ø¥Ø¹Ù„Ø§Ù†Ùƒ Ø¨Ø§Ù„Ù„ÙˆÙ† Ø§Ù„Ø°Ù‡Ø¨ÙŠ Ø¹Ù„Ù‰ Ù…Ù†ØµØ© Ø¹Ù‚Ø§Ø±",
                  icon: Crown,
                  bg: "bg-amber-500 text-white",
                },
                {
                  title: "Ø¥Ø¹Ù„Ø§Ù† Ù…Ù†ØµØ§Øª Ø§Ù„ØªÙˆØ§ØµÙ„ Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠ",
                  subtitle: "Ø§Ø¹Ù„Ù† Ø¹Ø¨Ø± Ø­Ø³Ø§Ø¨Ø§Øª Ø¹Ù‚Ø§Ø± ÙÙŠ Ù…Ù†ØµØ§Øª Ø§Ù„ØªÙˆØ§ØµÙ„",
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
          SUB-MODAL 5: ØªØºÙŠÙŠØ± Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ (Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„ØµÙˆØ±Ø© img_0_8.jpg)
          ======================================================== */}
      {changePhoneModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setChangePhoneModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8 z-10 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs text-slate-400">ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</span>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">ØªØºÙŠÙŠØ± Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„</h3>
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
                  Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ø¬Ø¯ÙŠØ¯
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
                {phoneUpdating ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Ø§Ø³ØªÙ…Ø±Ø§Ø±"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Bottom Sheet (Ù†Ø§ÙØ°Ø© Ø§Ù„ØªØ­ÙƒÙ… ÙˆØ§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø±ÙƒØ²ÙŠØ© Ø§Ù„Ø´Ø§Ù…Ù„Ø©) */}
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
                    Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ… ÙˆØ§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ù…Ø±ÙƒØ²ÙŠØ©
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    admin@aqarpulse.eg â€¢ Ù…Ø³Ø¤ÙˆÙ„ Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø¹ØªÙ…Ø¯
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
                <h4 className="text-sm font-black text-white">Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø´Ø±ÙƒØ© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  ØªÙ…Øª ØªÙ‡ÙŠØ¦Ø© ÙˆØªØµÙÙŠØ± Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ… Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ØŒ ÙˆØ§Ù„Ù„ÙˆØ­Ø© Ø¬Ø§Ù‡Ø²Ø© Ø§Ù„Ø¢Ù† Ù„Ø¨Ø¯Ø¡ Ø§Ù„ØªØ·ÙˆÙŠØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯.
                </p>
              </div>
              <Link
                href="/admin"
                onClick={() => setAdminDrawerOpen(false)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
              >
                <span>ÙØªØ­ Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø´Ø±ÙƒØ© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©</span>
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>

            {/* Quick Navigation to Public Site */}
            <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block px-1">
                Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù…Ù†ØµØ©:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/"
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Home className="w-3.5 h-3.5 text-brand-400" />
                  <span>Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ</span>
                </Link>
                <Link
                  href="/explore"
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Compass className="w-3.5 h-3.5 text-brand-400" />
                  <span>Ø§Ù„Ø®Ø±ÙŠØ·Ø© Ø§Ù„ØªÙØ§Ø¹Ù„ÙŠØ©</span>
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
                <span>ØªØ³Ø¬ÙŠÙ„ Ø®Ø±ÙˆØ¬ Ù…Ø³Ø¤ÙˆÙ„ Ø§Ù„Ù†Ø¸Ø§Ù…</span>
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
      return "Ù…Ø¯ÙŠØ± Ø§Ù„Ù†Ø¸Ø§Ù…";
    case "broker":
      return "ÙˆØ³ÙŠØ· Ø¹Ù‚Ø§Ø±ÙŠ";
    case "owner":
      return "Ù…Ø§Ù„Ùƒ Ø¹Ù‚Ø§Ø±";
    case "seeker":
    case "buyer":
      return "Ø¹Ù…ÙŠÙ„ / Ø¨Ø§Ø­Ø«";
    default:
      return "Ø²Ø§Ø¦Ø±";
  }
}
