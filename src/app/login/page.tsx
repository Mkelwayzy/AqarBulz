"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, LogIn, Shield, User, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.user?.role === "admin") {
          router.push("/admin");
        } else {
          router.push(redirectUrl);
        }
        router.refresh();
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
    <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
      {/* Brand & Heading */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-800 to-brand-500 text-white items-center justify-center mx-auto shadow-md shadow-brand-700/25">
          <MapPin className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">تسجيل الدخول</h1>
        <p className="text-xs text-slate-500 font-medium">
          مرحباً بك مجدداً في منصة نبض العقار (AqarPulse)
        </p>
      </div>

      {redirectUrl.includes("properties/new") && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-bold flex items-center gap-2">
          <span>يجب تسجيل الدخول لإضافة وإدارة عقارك على المنصة.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">رقم الهاتف المحمول أو البريد الإلكتروني</label>
          <input
            type="text"
            required
            placeholder="01012345678 أو name@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900"
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
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          <span>دخول الحساب</span>
        </button>
      </form>

      <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
        ليس لديك حساب مسجل؟{" "}
        <Link href="/register" className="font-extrabold text-brand-700 hover:underline">
          إنشاء حساب جديد مجاناً
        </Link>
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
