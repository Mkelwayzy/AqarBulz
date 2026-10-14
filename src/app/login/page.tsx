"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, CheckCircle2, ShieldCheck, MapPin, KeyRound, Sparkles } from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [ticket, setTicket] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/email-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.ticket) {
          setTicket(data.ticket);
        }
        setStep("otp");
        setResendCooldown(60);
      } else {
        setError(data.error || "تعذر إرسال الرمز، يرجى المحاولة لاحقاً");
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Login / Auto-Register
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setError("يرجى إدخال رمز التحقق المكون من 6 أرقام");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: cleanCode,
          ticket: ticket,
          redirect: redirectUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.dispatchEvent(new Event("auth-state-changed"));
        window.location.href = data.redirectTo || redirectUrl;
      } else {
        setError(data.error || "رمز التحقق غير صحيح أو انتهت صلاحيته");
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
      {/* Brand Icon & Heading */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/20 mb-2 hover:scale-105 transition-transform">
          <MapPin className="w-7 h-7" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {step === "email" ? "تسجيل الدخول السريع" : "أدخل رمز التأكيد"}
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          {step === "email"
            ? "أدخل بريدك الإلكتروني وسيتم تسجيل دخولك أو إنشاء حسابك فوراً"
            : `تم إرسال كود من 6 أرقام إلى: ${email}`}
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold leading-relaxed text-center">
          {error}
        </div>
      )}

      {/* Step 1: Input Email */}
      {step === "email" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                dir="ltr"
                className="w-full text-right sm:text-left px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all pl-10"
              />
              <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-teal-700/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري إرسال الرمز...</span>
              </>
            ) : (
              <>
                <span>متابعة</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>

          <div className="pt-2 text-center text-xs text-slate-400 font-medium">
            🔒 لا حاجة لكلمة مرور، سنرسل رمز تحقق سريع لبريدك
          </div>
        </form>
      ) : (
        /* Step 2: Input OTP */
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-xs font-bold text-slate-700 mb-1.5">
              رمز التحقق (6 أرقام)
            </label>
            <div className="relative">
              <input
                id="otp"
                type="text"
                autoFocus
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="• • • • • •"
                dir="ltr"
                className="w-full text-center tracking-widest text-2xl font-mono py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-teal-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.trim().length !== 6}
            className="w-full py-3.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-teal-700/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التأكيد والدخول...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>تأكيد والدخول</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs font-bold pt-2">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← تعديل البريد
            </button>

            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={handleSendOtp}
              className="text-teal-700 hover:text-teal-800 disabled:text-slate-400 transition-colors"
            >
              {resendCooldown > 0 ? `إعادة الإرسال بعد (${resendCooldown} ث)` : "إعادة إرسال الرمز"}
            </button>
          </div>
        </form>
      )}

      {/* Back to Map Link */}
      <div className="pt-4 border-t border-slate-100 text-center">
        <Link href="/" className="text-xs text-slate-500 hover:text-teal-700 font-bold transition-colors">
          العودة إلى الخريطة الرئيسية
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 bg-slate-50">
      <Suspense fallback={<div className="p-8 text-center text-slate-500">جاري التحميل...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
