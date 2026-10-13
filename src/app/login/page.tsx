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
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const initialRole = searchParams.get("role") || (redirectUrl.startsWith("/admin") ? "admin" : "user");
  const oauthError = searchParams.get("error");

  const [authMode, setAuthMode] = useState<"user" | "admin">(initialRole === "admin" ? "admin" : "user");
  const [identifier, setIdentifier] = useState(initialRole === "admin" ? "admin@aqarpulse.eg" : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (!oauthError) return null;
    if (oauthError === "oauth_failed")
      return "تعذر إتمام الدخول عبر Google أو Facebook، يرجى المحاولة ثانية أو استخدام الهاتف/البريد.";
    if (oauthError === "access_denied" || oauthError === "oauth_cancelled")
      return "تم إلغاء عملية تسجيل الدخول من جانب موفر الحساب.";
    return "حدث خطأ أثناء الاتصال بموفر الحساب، يرجى المحاولة مرة أخرى.";
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (authMode === "admin") {
      setIdentifier("admin@aqarpulse.eg");
    } else if (identifier === "admin@aqarpulse.eg") {
      setIdentifier("");
    }
    setError(null);
  }, [authMode]);

  // Live countdown timer for rate limiting
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Handle client-side hash tokens from OAuth Implicit redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      setGoogleLoading(true);
      setError(null);
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        fetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, redirect: redirectUrl, role: "seeker" }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.success) {
              window.dispatchEvent(new Event("auth-state-changed"));
              window.location.href = d.redirect || redirectUrl;
            } else {
              setError("فشل تأكيد جلسة الدخول عبر الحساب");
            }
          })
          .catch(() => setError("خطأ في الاتصال بالخادم"))
          .finally(() => setGoogleLoading(false));
      }
    }
  }, [redirectUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (countdown && countdown > 0) return;

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
          rememberMe,
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
        if (res.status === 429 && data.retryAfterSeconds) {
          setCountdown(data.retryAfterSeconds);
        }
        setError(data.error || "بيانات الدخول غير صحيحة");
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  const [showGoogleSetupGuide, setShowGoogleSetupGuide] = useState(false);
  const [showFacebookSetupGuide, setShowFacebookSetupGuide] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const supabase = createSupabaseClient();
      const currentOrigin = window.location.origin;
      const callbackUrl = `${currentOrigin}/api/auth/callback?redirect=${encodeURIComponent(redirectUrl)}&role=seeker`;

      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (oauthErr) {
        throw oauthErr;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("[GoogleLogin]", err);
      setError(err?.message || "تعذر بدء الاتصال بحساب Google، يرجى المحاولة مرة أخرى.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setFacebookLoading(true);
      setError(null);
      const supabase = createSupabaseClient();
      const currentOrigin = window.location.origin;
      const callbackUrl = `${currentOrigin}/api/auth/callback?redirect=${encodeURIComponent(redirectUrl)}&role=seeker`;

      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (oauthErr) {
        throw oauthErr;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("[FacebookLogin]", err);
      setError(err?.message || "تعذر بدء الاتصال بحساب Facebook، يرجى المحاولة مرة أخرى.");
    } finally {
      setFacebookLoading(false);
    }
  };

  const hasCustomRedirect = redirectUrl && redirectUrl !== "/dashboard" && redirectUrl !== "/";

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

      {/* Smart Contextual Redirect Notice */}
      {hasCustomRedirect && authMode === "user" && (
        <div className="p-3 bg-brand-50/80 border border-brand-200/80 text-brand-900 text-xs rounded-2xl font-bold flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span className="leading-relaxed">سيتم إرجاعك تلقائياً لنفس العقار أو الصفحة السابقة بعد تسجيل الدخول.</span>
        </div>
      )}

      {/* Rate Limit Countdown Visualizer */}
      {countdown !== null && countdown > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-2xl font-bold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>تم إيقاف المحاولات مؤقتاً لأسباب أمنية. انتظر:</span>
          </div>
          <span className="font-mono text-sm bg-amber-200/80 px-2.5 py-0.5 rounded-lg text-amber-950 font-black">
            {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Error Message */}
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
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-right transition-all"
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
              className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            {/* Remember Me Option */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 font-bold hover:text-slate-900">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer accent-brand-600"
              />
              <span>تذكرني على هذا الجهاز (30 يوماً)</span>
            </label>

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
          disabled={loading || (countdown !== null && countdown > 0)}
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
          <span>
            {countdown && countdown > 0
              ? `انتظر ${countdown} ثانية...`
              : authMode === "admin"
              ? "تسجيل دخول كمسؤول"
              : "دخول الحساب"}
          </span>
        </button>
      </form>

      {/* Social One-Click Sign In (For Standard Users) */}
      {authMode === "user" && (
        <div className="space-y-3 pt-1">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 absolute">أو الدخول السريع عبر</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || facebookLoading || loading}
              className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-slate-700 font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>حساب Google</span>
            </button>

            {/* Facebook Button */}
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={facebookLoading || googleLoading || loading}
              className="py-2.5 px-3 bg-white hover:bg-blue-50/50 border border-slate-200/90 hover:border-blue-300 rounded-xl text-slate-700 font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-60"
            >
              {facebookLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#1877F2]" />
              ) : (
                <svg className="w-4 h-4 flex-shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              <span>حساب Facebook</span>
            </button>
          </div>

          {/* Facebook Setup Guide Alert */}
          {showFacebookSetupGuide && (
            <div className="mt-3 p-3.5 bg-blue-50/90 rounded-2xl border border-blue-200 text-right text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-blue-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>تنبيه إعدادات Facebook Login</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowFacebookSetupGuide(false)}
                  className="text-[11px] text-blue-700 hover:text-blue-900 underline"
                >
                  إغلاق
                </button>
              </div>
              <p className="text-blue-900 leading-relaxed text-[11px]">
                الدخول عبر Facebook يتطلب إدخال مفاتيح <strong>Facebook App ID</strong> و <strong>App Secret</strong> في لوحة تحكم Supabase تحت (Authentication → Providers → Facebook).
              </p>
              <div className="bg-white/90 p-2.5 rounded-xl text-[10px] font-mono text-slate-800 border border-blue-200 select-all">
                <span className="block font-bold text-slate-500 mb-0.5">رابط الـ Valid OAuth Redirect URI لمطورين فيسبوك:</span>
                https://temfsayamnuusfcmrgnl.supabase.co/auth/v1/callback
              </div>
              <p className="text-[11px] font-bold text-blue-950 pt-1">
                💡 يمكنك تسجيل الدخول فوراً بالبريد الإلكتروني أو الهاتف وكلمة المرور دون الحاجة لفيسبوك.
              </p>
            </div>
          )}

          {/* Google Setup Guide Alert */}
          {showGoogleSetupGuide && (
            <div className="mt-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-right text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-amber-900 font-bold">
                <span>تنبيه إعدادات Google OAuth</span>
                <button
                  type="button"
                  onClick={() => setShowGoogleSetupGuide(false)}
                  className="text-[11px] text-amber-700 hover:text-amber-900 underline"
                >
                  إغلاق
                </button>
              </div>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                الدخول عبر Google يتطلب إدخال مفاتيح <strong>Google Client ID</strong> و <strong>Client Secret</strong> في لوحة تحكم Supabase تحت (Authentication → Providers → Google).
              </p>
              <div className="bg-white/80 p-2 rounded-xl text-[10px] font-mono text-slate-700 border border-amber-200 select-all">
                <span className="block font-bold text-slate-500 mb-0.5">رابط Callback في Google Cloud:</span>
                https://temfsayamnuusfcmrgnl.supabase.co/auth/v1/callback
              </div>
              <p className="text-[11px] font-bold text-amber-900 pt-1">
                💡 يمكنك تسجيل الدخول فوراً بالبريد الإلكتروني أو الهاتف وكلمة المرور دون الحاجة لحساب Google.
              </p>
            </div>
          )}
        </div>
      )}

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
