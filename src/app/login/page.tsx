"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  LogIn,
  Shield,
  ShieldCheck,
  User,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const initialRole = searchParams.get("role") || (redirectUrl.startsWith("/admin") ? "admin" : "user");

  const [authMode, setAuthMode] = useState<"user" | "admin">(initialRole === "admin" ? "admin" : "user");
  const [identifier, setIdentifier] = useState(initialRole === "admin" ? "admin@aqarpulse.eg" : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authMode === "admin") {
      setIdentifier("admin@aqarpulse.eg");
    } else if (identifier === "admin@aqarpulse.eg") {
      setIdentifier("");
    }
    setError(null);
  }, [authMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("يرجى إدخال رقم الهاتف (أو البريد الإلكتروني) وكلمة المرور");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          redirect: authMode === "admin" ? "/admin" : redirectUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.dispatchEvent(new Event("auth-state-changed"));
        if (data.user?.role === "admin" || authMode === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = data.redirectTo || redirectUrl;
        }
      } else {
        setError(data.error || "بيانات الدخول غير صحيحة");
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xl space-y-6 transition-all duration-300">
      
      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setAuthMode("user")}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            authMode === "user"
              ? "bg-white text-slate-900 shadow-sm font-black"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className="w-4 h-4" />
          <span>دخول المستخدمين</span>
        </button>

        <button
          type="button"
          onClick={() => setAuthMode("admin")}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            authMode === "admin"
              ? "bg-slate-900 text-amber-400 shadow-sm font-black"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>بوابة الإدارة 🛡️</span>
        </button>
      </div>

      {/* Brand & Heading */}
      <div className="text-center space-y-2">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md transition-all ${
            authMode === "admin"
              ? "bg-slate-900 text-amber-400 border border-amber-400/30 shadow-amber-500/10"
              : "bg-gradient-to-tr from-brand-800 to-brand-500 text-white shadow-brand-700/25"
          }`}
        >
          {authMode === "admin" ? <ShieldCheck className="w-7 h-7" /> : <MapPin className="w-7 h-7" />}
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {authMode === "admin" ? "تسجيل دخول الإدارة المركزية" : "تسجيل الدخول"}
        </h1>

        <p className="text-xs text-slate-500 font-medium">
          {authMode === "admin"
            ? "نظام الرقابة والعمليات والتحكم المركزي لمنصة نبض العقار"
            : "مرحباً بك مجدداً في منصة نبض العقار (AqarPulse)"}
        </p>
      </div>

      {redirectUrl.includes("properties/new") && authMode === "user" && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-bold flex items-center gap-2">
          <span>يجب تسجيل الدخول لإضافة وإدارة عقارك على المنصة.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold leading-relaxed animate-in fade-in">
          {error}
        </div>
      )}

      {/* ADMIN CREDENTIALS NOTICE */}
      {authMode === "admin" && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs rounded-2xl font-bold flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>يتطلب دخول الإدارة المركزية إدخال كلمة المرور المعتمدة لمسؤول النظام.</span>
        </div>
      )}

      {/* STANDARD FORM */}
      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            {authMode === "admin" ? "البريد الإلكتروني للإدارة" : "رقم الهاتف المحمول أو البريد الإلكتروني"}
          </label>
          <input
            type="text"
            required
            placeholder={authMode === "admin" ? "admin@aqarpulse.eg" : "01012345678 أو name@example.com"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-right"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">كلمة المرور</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <Link
              href="/forgot-password"
              className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 ${
            authMode === "admin"
              ? "bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-400/20"
              : "bg-brand-600 hover:bg-brand-700 shadow-brand-600/20"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : authMode === "admin" ? (
            <Shield className="w-4 h-4" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          <span>{authMode === "admin" ? "تسجيل دخول كمسؤول" : "دخول الحساب"}</span>
        </button>
      </form>

      {/* Footer Switcher */}
      <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
        {authMode === "user" ? (
          <div>
            <span>ليس لديك حساب مسجل؟ </span>
            <Link href="/register" className="font-extrabold text-brand-700 hover:underline">
              إنشاء حساب جديد مجاناً
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAuthMode("user")}
            className="text-[11px] font-bold text-slate-600 hover:text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            <span>العودة لصفحة دخول المستخدمين العادية</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-xs text-slate-400">جاري التحميل...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
