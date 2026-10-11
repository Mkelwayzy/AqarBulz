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
  X,
  ChevronLeft,
  Loader2,
  ArrowRight,
  UserCheck,
  Briefcase,
} from "lucide-react";
import { User, UserRole } from "@/lib/db/types";
import MobileSearchDrawer from "./MobileSearchDrawer";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [upgradingRole, setUpgradingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  // Sync user status on pathname change and via auth-state-changed event
  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
    setAccountDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleAuthChange = () => {
      fetchUser();
    };
    window.addEventListener("auth-state-changed", handleAuthChange);
    return () => window.removeEventListener("auth-state-changed", handleAuthChange);
  }, []);

  // Don't show bottom nav on admin panel to avoid obstructing admin controls
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setAccountDrawerOpen(false);
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

  const handleQuickRoleUpgrade = async (targetRole: "owner" | "broker") => {
    setUpgradingRole(true);
    setRoleMessage(null);
    try {
      const res = await fetch("/api/auth/upgrade-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setRoleMessage(data.message || "تم تحويل نوع الحساب بنجاح!");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth-state-changed"));
        }
        setTimeout(() => setRoleMessage(null), 3500);
      } else {
        setRoleMessage(data.error || "تعذر تحويل نوع الحساب حالياً");
      }
    } catch {
      setRoleMessage("حدث خطأ أثناء ترقية الحساب");
    } finally {
      setUpgradingRole(false);
    }
  };

  // Check if current user is strictly buyer or seeker
  const isBuyer = user?.role === "buyer" || user?.role === "seeker";

  const isAccountActive =
    accountDrawerOpen ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/account");

  return (
    <>
      {/* Sticky Bottom Navigation Bar for Mobile (hidden on lg screens) */}
      <nav
        aria-label="التنقل السريع للهاتف"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-md mx-auto flex items-center justify-around relative">
          {/* 1. الرئيسية */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 relative active:scale-95 ${
              pathname === "/"
                ? "text-brand-700 font-black"
                : "text-slate-500 hover:text-slate-800 font-bold"
            }`}
          >
            <div className="relative">
              <Home
                className={`w-5 h-5 transition-transform ${
                  pathname === "/" ? "scale-110 stroke-[2.5]" : "stroke-2"
                }`}
              />
              {pathname === "/" && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-600 shadow-sm shadow-brand-500/50" />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-1 ${
                pathname === "/" ? "font-black text-brand-700" : "font-semibold"
              }`}
            >
              الرئيسية
            </span>
          </Link>

          {/* 2. الخريطة */}
          <Link
            href="/explore"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 relative active:scale-95 ${
              pathname === "/explore"
                ? "text-brand-700 font-black"
                : "text-slate-500 hover:text-slate-800 font-bold"
            }`}
          >
            <div className="relative">
              <Compass
                className={`w-5 h-5 transition-transform ${
                  pathname === "/explore" ? "scale-110 stroke-[2.5]" : "stroke-2"
                }`}
              />
              {pathname === "/explore" && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-600 shadow-sm shadow-brand-500/50" />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-1 ${
                pathname === "/explore" ? "font-black text-brand-700" : "font-semibold"
              }`}
            >
              الخريطة
            </span>
          </Link>

          {/* 3. بحث فوري (Primary Center Action) */}
          <button
            type="button"
            onClick={() => setSearchDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl relative transition-transform active:scale-90 group"
          >
            <div className="w-11 h-11 -mt-4 rounded-2xl bg-gradient-to-tr from-brand-800 to-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 ring-4 ring-white group-hover:scale-105 transition-all">
              <Search className="w-5 h-5 text-brand-50 animate-pulse" />
            </div>
            <span className="text-[10px] font-black mt-1 text-brand-700">
              بحث فوري
            </span>
          </button>

          {/* 4. الشرط الذكي عالي الدقة:
              المفضلة فقط لحساب المشتري، وتتحول لإضافة مشروع لحساب المالك والوسيط بنسيابية فائقة */}
          {isBuyer ? (
            <Link
              key="nav-favorites"
              href="/account/favorites"
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-300 relative active:scale-95 animate-in fade-in zoom-in-95 ${
                pathname === "/account/favorites"
                  ? "text-rose-600 font-black"
                  : "text-slate-500 hover:text-rose-600 font-bold"
              }`}
            >
              <div className="relative">
                <Heart
                  className={`w-5 h-5 transition-transform duration-300 ${
                    pathname === "/account/favorites"
                      ? "scale-110 stroke-[2.5] fill-rose-50 text-rose-600"
                      : "stroke-2"
                  }`}
                />
                {pathname === "/account/favorites" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-600 shadow-sm shadow-rose-500/50" />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors ${
                  pathname === "/account/favorites"
                    ? "font-black text-rose-600"
                    : "font-semibold"
                }`}
              >
                المفضلة
              </span>
            </Link>
          ) : (
            <Link
              key="nav-add-project"
              href={user ? "/dashboard/properties/new" : "/login?redirect=/dashboard/properties/new"}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-300 relative active:scale-95 animate-in fade-in zoom-in-95 ${
                pathname === "/dashboard/properties/new"
                  ? "text-brand-700 font-black"
                  : "text-slate-500 hover:text-brand-700 font-bold"
              }`}
            >
              <div className="relative">
                <PlusCircle
                  className={`w-5 h-5 transition-transform duration-300 ${
                    pathname === "/dashboard/properties/new"
                      ? "scale-110 stroke-[2.5]"
                      : "stroke-2"
                  }`}
                />
                {pathname === "/dashboard/properties/new" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-600 shadow-sm shadow-brand-500/50" />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors ${
                  pathname === "/dashboard/properties/new"
                    ? "font-black text-brand-700"
                    : "font-semibold"
                }`}
              >
                إضافة مشروع
              </span>
            </Link>
          )}

          {/* 5. حسابي: يفتح نافذة الحساب السفلية المخصصة بكل ما يخص الحساب */}
          <button
            type="button"
            onClick={() => setAccountDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 relative active:scale-95 ${
              isAccountActive
                ? "text-brand-700 font-black"
                : "text-slate-500 hover:text-slate-800 font-bold"
            }`}
          >
            <div className="relative">
              {user ? (
                <div className="w-5 h-5 rounded-full bg-brand-700 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                  {user.name.charAt(0)}
                </div>
              ) : (
                <UserIcon
                  className={`w-5 h-5 transition-transform ${
                    isAccountActive ? "scale-110 stroke-[2.5]" : "stroke-2"
                  }`}
                />
              )}
              {isAccountActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-600 shadow-sm shadow-brand-500/50" />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-1 ${
                isAccountActive ? "font-black text-brand-700" : "font-semibold"
              }`}
            >
              حسابي
            </span>
          </button>
        </div>
      </nav>

      {/* Account Bottom Sheet (نافذة حسابي السفلية الشاملة بكل ما يخص الحساب) */}
      {accountDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setAccountDrawerOpen(false)}
          />

          {/* Sliding Bottom Drawer Panel */}
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8 max-h-[88vh] overflow-y-auto z-10 transition-transform duration-300 ease-out animate-in slide-in-from-bottom">
            {/* Grab Handle */}
            <div
              className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 cursor-pointer hover:bg-slate-400 transition-colors"
              onClick={() => setAccountDrawerOpen(false)}
            />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 font-black">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    {user ? "حسابي الشخصي" : "مرحباً بك في نبض العقار"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {user ? "التحكم الكامل والإعدادات" : "تسجيل الدخول والوصول للميزات"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Switch Feedback Toast */}
            {roleMessage && (
              <div className="mt-3 p-3 bg-brand-50 border border-brand-200 rounded-2xl text-xs font-bold text-brand-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                <span>{roleMessage}</span>
              </div>
            )}

            {/* Content for Logged-in User */}
            {user ? (
              <div className="space-y-4 pt-3">
                {/* User Identity Banner */}
                <div className="p-3.5 bg-gradient-to-r from-slate-50 to-brand-50/40 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-800 to-brand-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-brand-700/20">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-slate-900">{user.name}</span>
                        {user.isVerified && (
                          <span title="موثق" className="text-brand-600">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        {user.phone || user.email}
                      </span>
                      <div className="mt-1">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-brand-100/80 text-brand-800 text-[10px] font-extrabold">
                          {getRoleNameAr(user.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instant Role Upgrade / Switch Box for Buyers */}
                {isBuyer && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-black text-amber-950">
                        ترقية الحساب لإضافة العقارات والمشاريع:
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      يمكنك تحويل حسابك فوراً إلى مالك أو وسيط معتمد لإضافة العقارات وعرضها لآلاف المشترين:
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        disabled={upgradingRole}
                        onClick={() => handleQuickRoleUpgrade("owner")}
                        className="py-2 px-2.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-black text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                      >
                        {upgradingRole ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>تحويل لـ مالك عقار</span>
                      </button>
                      <button
                        type="button"
                        disabled={upgradingRole}
                        onClick={() => handleQuickRoleUpgrade("broker")}
                        className="py-2 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        {upgradingRole ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        <span>تحويل لـ وسيط عقاري</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin Direct Access */}
                {user?.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 text-white border border-amber-400/30 shadow-md group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-amber-400 block">
                          لوحة الإدارة المركزية (Admin)
                        </span>
                        <span className="text-[10px] text-slate-300 font-medium">
                          إشراف العقارات، طلبات العملاء، والمعلنين
                        </span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                )}

                {/* Core Account Action Links */}
                <div className="space-y-1.5">
                  {/* 1. لوحة التحكم */}
                  <Link
                    href="/dashboard"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-brand-50/70 border border-slate-100 hover:border-brand-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          {isBuyer ? "لوحة طلباتي واستفساراتي" : "لوحة التحكم الرئيسية"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {isBuyer
                            ? "متابعة الطلبات، العروض والتواصل"
                            : "الإحصائيات، المشاهدات والعقارات"}
                        </span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
                  </Link>

                  {/* 2. الملف الشخصي والإعدادات */}
                  <Link
                    href="/account/profile"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-brand-50/70 border border-slate-100 hover:border-brand-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          الملف الشخصي والإعدادات
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          البيانات الشخصية، الأمان والتوثيق
                        </span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </Link>

                  {/* 3. إدارة عقاراتي وإضافة عقار (للمالك والوسيط والمدير) */}
                  {!isBuyer && (
                    <>
                      <Link
                        href="/dashboard/properties"
                        onClick={() => setAccountDrawerOpen(false)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-brand-50/70 border border-slate-100 hover:border-brand-200 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block">
                              إدارة عقاراتي وإعلاناتي
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              تعديل وحذف ونشر العقارات
                            </span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </Link>

                      <Link
                        href="/dashboard/properties/new"
                        onClick={() => setAccountDrawerOpen(false)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-brand-50/60 hover:bg-brand-100/70 border border-brand-200 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                            <PlusCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-brand-900 block">
                              إضافة مشروع / عقار جديد
                            </span>
                            <span className="text-[10px] text-brand-700 font-medium">
                              نشر عقار فوري للبيع أو الإيجار
                            </span>
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-brand-600 transition-colors" />
                      </Link>
                    </>
                  )}

                  {/* 4. محفظتي العقارية والأصول الذكية */}
                  <Link
                    href="/dashboard/portfolio"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          محفظتي العقارية الذكية
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          حاسبة العوائد وتقديرات الأصول
                        </span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </Link>

                  {/* 5. العقارات المفضلة */}
                  <Link
                    href="/account/favorites"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          العقارات المفضلة
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          العقارات التي قمت بحفظها للمراجعة
                        </span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                  </Link>

                  {/* 6. لوحة الرقابة المركزية (للمدير فقط) */}
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setAccountDrawerOpen(false)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-amber-950 block">
                            لوحة الرقابة المركزية (Admin)
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium">
                            إدارة المستخدمين، العقارات والإعدادات
                          </span>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-amber-700 transition-colors" />
                    </Link>
                  )}
                </div>

                {/* تسجيل الخروج الفوري */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs transition-colors active:scale-98 disabled:opacity-50"
                  >
                    {loggingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري تسجيل الخروج...</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج من الحساب</span>
                      </>
                    )}
                  </button>
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
                    أهلاً بك في منصة نبض العقار
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    سجل دخولك أو أنشئ حساباً جديداً للوصول إلى لوحة التحكم، وإضافة العقارات، وحفظ مفضلاتك.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 active:scale-98 transition-all"
                  >
                    <span>تسجيل الدخول</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/register"
                    onClick={() => setAccountDrawerOpen(false)}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center transition-all active:scale-98"
                  >
                    إنشاء حساب جديد
                  </Link>
                </div>
              </div>
            )}
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
