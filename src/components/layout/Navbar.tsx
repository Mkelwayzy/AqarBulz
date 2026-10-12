"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, UserRole, CmsNavLabels } from "@/lib/db/types";
import {
  Compass,
  Building2,
  Home,
  PlusCircle,
  Sparkles,
  Heart,
  User as UserIcon,
  LogOut,
  Shield,
  Layers,
  ChevronDown,
  Menu,
  X,
  MapPin,
  LogIn,
  UserPlus,
  CheckCircle2,
  FileText,
  Phone,
  Info,
  ShieldCheck,
} from "lucide-react";

interface NavbarProps {
  onOpenAddProperty?: () => void;
}

export default function Navbar({ onOpenAddProperty }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [propertiesMenuOpen, setPropertiesMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Dynamic Navbar labels from CMS
  const [navLabels, setNavLabels] = useState<CmsNavLabels>({
    brandTitle: "نبض العقار",
    brandSubtitle: "AqarPulse Egypt",
    home: "الرئيسية",
    propertiesDropdown: "العقارات",
    sale: "بيع",
    rent: "إيجار",
    explore: "الخريطة الذكية",
    smartMatch: "التوافق الذكي",
    about: "عن منصة نبض العقار",
    contact: "اتصل بنا",
    terms: "الشروط والأحكام",
    privacy: "سياسة الخصوصية وأمن البيانات",
    addProperty: "أضف عقارك",
  });

  const userMenuRef = useRef<HTMLDivElement>(null);
  const propertiesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchNavLabels();
    setPropertiesMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleAuthChange = () => {
      fetchCurrentUser();
    };
    window.addEventListener("auth-state-changed", handleAuthChange);
    return () => window.removeEventListener("auth-state-changed", handleAuthChange);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (propertiesMenuRef.current && !propertiesMenuRef.current.contains(e.target as Node)) {
        setPropertiesMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      setUser(data.user);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setUser(null);
    }
  };

  const fetchNavLabels = async () => {
    try {
      const res = await fetch("/api/cms/homepage");
      if (res.ok) {
        const data = await res.json();
        if (data.settings?.navLabels) {
          setNavLabels((prev) => ({ ...prev, ...data.settings.navLabels }));
        }
      }
    } catch {
      // Keep existing
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setUserMenuOpen(false);
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

  const handleAddPropertyClick = () => {
    if (onOpenAddProperty) {
      onOpenAddProperty();
      return;
    }

    if (!user) {
      router.push("/login?redirect=/dashboard/properties/new");
    } else {
      router.push("/dashboard/properties/new");
    }
  };

  const isPropertiesActive =
    pathname.startsWith("/properties") ||
    pathname === "/explore" ||
    pathname === "/smart-match";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Navigation */}
          <div className="flex items-center gap-4 lg:gap-6 xl:gap-8">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-800 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-700/20 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5 text-brand-100" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-brand-700 transition-colors">
                  {navLabels.brandTitle || "نبض العقار"}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-brand-600 -mt-1 uppercase">
                  {navLabels.brandSubtitle || "AqarPulse Egypt"}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
              {/* الرئيسية */}
              <Link
                href="/"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  pathname === "/"
                    ? "bg-brand-50 text-brand-700 font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Home className="w-4 h-4" />
                <span>{navLabels.home || "الرئيسية"}</span>
              </Link>

              {/* قائمة العقارات المنسدلة: بيع، إيجار، الخريطة الذكية، التوافق الذكي */}
              <div className="relative" ref={propertiesMenuRef}>
                <button
                  type="button"
                  onClick={() => setPropertiesMenuOpen(!propertiesMenuOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isPropertiesActive || propertiesMenuOpen
                      ? "bg-brand-50 text-brand-700 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className="w-4 h-4 text-brand-600" />
                  <span>{navLabels.propertiesDropdown || "العقارات"}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      propertiesMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {propertiesMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs space-y-1 animate-in fade-in slide-in-from-top-1">
                    <Link
                      href="/properties?transactionType=sale"
                      onClick={() => setPropertiesMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-slate-900 font-bold">{navLabels.sale || "بيع"}</span>
                        <span className="text-[10px] text-slate-400 font-medium">عقارات وفيلات للبيع</span>
                      </div>
                    </Link>

                    <Link
                      href="/properties?transactionType=rent"
                      onClick={() => setPropertiesMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-slate-900 font-bold">{navLabels.rent || "إيجار"}</span>
                        <span className="text-[10px] text-slate-400 font-medium">شقق ووحدات للإيجار</span>
                      </div>
                    </Link>

                    <Link
                      href="/explore"
                      onClick={() => setPropertiesMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-slate-900 font-bold">{navLabels.explore || "الخريطة الذكية"}</span>
                        <span className="text-[10px] text-slate-400 font-medium">استكشاف جغرافي مباشر</span>
                      </div>
                    </Link>

                    <Link
                      href="/smart-match"
                      onClick={() => setPropertiesMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-slate-900 font-bold">{navLabels.smartMatch || "التوافق الذكي"}</span>
                        <span className="text-[10px] text-slate-400 font-medium">مطابقة المواصفات والميزانية</span>
                      </div>
                    </Link>

                    <div className="border-t border-slate-150 my-1 pt-1">
                      <Link
                        href="/reels"
                        onClick={() => setPropertiesMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-rose-50 hover:text-rose-700 font-bold transition-colors text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                        <span>نبض ريلز (فيديو سريع)</span>
                      </Link>

                      <Link
                        href="/compounds"
                        onClick={() => setPropertiesMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-colors text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                        <span>الكمبوندات والمطورين</span>
                      </Link>

                      <Link
                        href="/requests"
                        onClick={() => setPropertiesMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-bold transition-colors text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>سوق عقار مطلوب</span>
                      </Link>

                      <Link
                        href="/compare"
                        onClick={() => setPropertiesMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-brand-50 hover:text-brand-700 font-bold transition-colors text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0"></span>
                        <span>مقارنة العقارات</span>
                      </Link>

                      <Link
                        href="/market-index"
                        onClick={() => setPropertiesMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-bold transition-colors text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                        <span>مؤشر السوق العقاري 2026</span>
                      </Link>

                      <Link
                        href="/neighborhoods"
                        onClick={() => setPropertiesMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-teal-50 hover:text-teal-700 font-bold transition-colors text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
                        <span>دليل الأحياء وجودة الحياة</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* صفحة عن منصة نبض العقار */}
              <Link
                href="/about"
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  pathname === "/about"
                    ? "bg-brand-50 text-brand-700 font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Info className="w-4 h-4 text-brand-600" />
                <span className="hidden xl:inline">{navLabels.about || "عن منصة نبض العقار"}</span>
                <span className="xl:hidden">عن المنصة</span>
              </Link>

              {/* صفحة اتصل بنا */}
              <Link
                href="/contact"
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  pathname === "/contact"
                    ? "bg-brand-50 text-brand-700 font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>{navLabels.contact || "اتصل بنا"}</span>
              </Link>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3" ref={userMenuRef}>
            {/* Favorites Icon (Desktop only) */}
            <Link
              href="/account/favorites"
              className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-50 transition-colors relative"
              title="العقارات المفضلة"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* If Authenticated: User Account Menu (Desktop only - mobile uses dedicated bottom nav account sheet) */}
            {user ? (
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="w-7 h-7 rounded-lg bg-brand-700 text-white font-black text-xs flex items-center justify-center">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-right">
                    <span className="text-xs font-bold text-slate-900 block leading-tight max-w-[120px] truncate">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      {getRoleNameAr(user.role)}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs space-y-1">
                    {/* User Summary Header */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 text-sm truncate">{user.name}</span>
                        {user.isVerified && (
                          <span title="موثق" className="text-brand-600">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono block truncate">
                        {user.email}
                      </span>
                      <div className="pt-1">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-brand-100 text-brand-800 text-[10px] font-bold">
                          {getRoleNameAr(user.role)}
                        </span>
                      </div>
                    </div>

                    {/* Role-Specific Links */}
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold transition-colors"
                      >
                        <Shield className="w-4 h-4 text-amber-700" />
                        <span>لوحة الإدارة والرقابة المركزية</span>
                      </Link>
                    )}

                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-brand-600" />
                      <span>
                        {user.role === "seeker" || user.role === "buyer"
                          ? "لوحة طلباتي واستفساراتي"
                          : "لوحة التحكم الرئيسية"}
                      </span>
                    </Link>

                    {(user.role === "owner" || user.role === "broker" || user.role === "admin") && (
                      <>
                        <Link
                          href="/dashboard/properties"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                        >
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span>إدارة عقاراتي وإعلاناتي</span>
                        </Link>
                        <Link
                          href="/dashboard/properties/new"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-xl text-brand-700 hover:bg-brand-50 font-bold transition-colors"
                        >
                          <PlusCircle className="w-4 h-4 text-brand-600" />
                          <span>إضافة عقار جديد</span>
                        </Link>
                      </>
                    )}

                    <Link
                      href="/dashboard/portfolio"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-xl text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 font-bold transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>محفظتي العقارية والأصول</span>
                    </Link>

                    <Link
                      href="/account/favorites"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                    >
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>العقارات المفضلة</span>
                    </Link>

                    <Link
                      href="/account/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-brand-600" />
                      <span>الملف الشخصي والإعدادات</span>
                    </Link>

                    {/* Divider & Logout */}
                    <div className="pt-1 mt-1 border-t border-slate-100">
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors text-right"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-brand-700 hover:bg-slate-50 transition-colors"
                >
                  <LogIn className="w-4 h-4 text-slate-500" />
                  <span>تسجيل الدخول</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-brand-600" />
                  <span>إنشاء حساب</span>
                </Link>
              </div>
            )}

            {/* Add Property Button: Hidden on mobile (available in bottom nav) and hidden for Buyer/Seeker */}
            {(!user || (user.role !== "buyer" && user.role !== "seeker")) && (
              <button
                type="button"
                onClick={handleAddPropertyClick}
                className="hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow-md shadow-brand-600/20 active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{navLabels.addProperty || "أضف عقارك"}</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Strictly contains only the 5 platform navigation links) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5 py-1">
            {/* 1. الرئيسية */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all ${
                pathname === "/"
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Home className="w-4 h-4 text-brand-600 shrink-0" />
              <span>{navLabels.home || "الرئيسية"}</span>
            </Link>

            {/* 2. بيع */}
            <Link
              href="/properties?transactionType=sale"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-700 transition-all"
            >
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{navLabels.sale || "بيع"}</span>
            </Link>

            {/* 3. إيجار */}
            <Link
              href="/properties?transactionType=rent"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 transition-all"
            >
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{navLabels.rent || "إيجار"}</span>
            </Link>

            {/* 4. عن منصة نبض العقار */}
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all ${
                pathname === "/about"
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-700 hover:bg-brand-50/50 hover:text-brand-700"
              }`}
            >
              <Info className="w-4 h-4 text-brand-600 shrink-0" />
              <span>{navLabels.about || "عن منصة نبض العقار"}</span>
            </Link>

            {/* 5. اتصل بنا */}
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all ${
                pathname === "/contact"
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{navLabels.contact || "اتصل بنا"}</span>
            </Link>

            {/* Mobile Auth Actions for Guests */}
            {!user && (
              <div className="pt-3 border-t border-slate-150 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-600" />
                  <span>تسجيل الدخول</span>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-center font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>إنشاء حساب</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function getRoleNameAr(role: UserRole): string {
  switch (role) {
    case "admin":
      return "مدير النظام";
    case "broker":
      return "وسيط عقاري";
    case "owner":
      return "مالك عقار";
    case "seeker":
    case "buyer":
      return "عميل / باحث";
    default:
      return "زائر";
  }
}
