"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  UserPlus,
  Loader2,
  CheckCircle2,
  Shield,
  User,
  Building2,
  Briefcase,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Check,
  Send,
} from "lucide-react";
import { UserRole } from "@/lib/db/types";

// Gmail Brand SVG Icon
function GmailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4ZM19.6 8.25L12 13L4.4 8.25V6.5L12 11.25L19.6 6.5V8.25Z" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  // Step state: 1 = Form Details, 2 = Gmail SMTP OTP Verification
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [role, setRole] = useState<UserRole>("seeker");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Broker & Owner specific fields
  const [licenseNumber, setLicenseNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [nationalId, setNationalId] = useState("");

  // Anti-Bot & Fraud Protection
  const [hpField, setHpField] = useState("");
  const [formLoadedAt, setFormLoadedAt] = useState<number>(0);

  // OTP State
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Record form load timestamp to detect instant automated bot submissions
  useEffect(() => {
    setFormLoadedAt(Date.now());
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timerSeconds]);

  // Step 1: Submit Form & Request Gmail SMTP OTP
  const handleInitiateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);

    // Validation
    if (!name.trim()) {
      setError("يرجى إدخال الاسم الكامل");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح لاستلام رمز التأكيد عبر Gmail SMTP");
      return;
    }
    if (!phone.trim()) {
      setError("يرجى إدخال رقم الهاتف للتواصل وحساب المستخدم");
      return;
    }
    if (!password || password.length < 6) {
      setError("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }

    setLoading(true);

    try {
      // 1. Request Gmail SMTP OTP from server
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          name: name.trim(),
          purpose: "register",
          hp_field: hpField,
          formLoadedAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل إرسال كود التحقق عبر Gmail SMTP");
      }

      // Success: move to Step 2
      setStep(2);
      setTimerSeconds(60);
      setCanResend(false);
      setSuccessInfo(data.message || "تم إرسال كود التحقق بنجاح إلى بريدك الإلكتروني (Gmail) ✉️");

      // Focus first OTP input
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
        setError("تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة لاحقاً");
      } else {
        const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend Gmail SMTP OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          name: name.trim(),
          purpose: "register",
          hp_field: hpField,
          formLoadedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إعادة الإرسال");

      setTimerSeconds(60);
      setCanResend(false);
      setSuccessInfo("تمت إعادة إرسال كود جديد إلى بريدك الإلكتروني عبر Gmail ✉️");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر إعادة الإرسال";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Input Changes (6 digits)
  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean && value !== "") return;

    const newCode = [...otpCode];

    // Support pasting 6-digit code
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newCode[i] = pasted[i] || "";
      }
      setOtpCode(newCode);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    newCode[index] = clean.slice(-1);
    setOtpCode(newCode);

    // Auto-advance to next input
    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP & Finalize Registration
  const handleVerifyAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpCode.join("");
    if (fullCode.length !== 6) {
      setError("يرجى إدخال كود التحقق المكون من 6 أرقام كاملاً");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verify OTP code with email
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          code: fullCode,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "رمز التحقق غير صحيح");
      }

      const verificationToken = verifyData.verificationToken;

      const cleanHp =
        hpField === name.trim() ||
        hpField === email.trim() ||
        hpField === phone.trim()
          ? ""
          : hpField;

      // 2. Complete User Registration
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          role,
          licenseNumber: role === "broker" ? licenseNumber.trim() : undefined,
          companyName: role === "broker" ? companyName.trim() : undefined,
          nationalId: role === "owner" ? nationalId.trim() : undefined,
          verificationToken,
          hp_field: cleanHp,
          formLoadedAt,
        }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || "فشل إتمام التسجيل");
      }

      // Success: Hard navigation ensures fresh cookie transmission and eliminates stale router caches
      window.location.href = regData.redirectTo || "/dashboard";
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
        setError("تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة لاحقاً");
      } else {
        const msg = err instanceof Error ? err.message : "حدث خطأ أثناء تأكيد الحساب";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center px-4 py-10 bg-gradient-to-b from-slate-50 via-white to-slate-100/50">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/90 shadow-xl shadow-slate-200/40 space-y-6 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2 relative">
          <Link
            href="/"
            className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white items-center justify-center mx-auto shadow-md shadow-red-500/30 hover:scale-105 transition-transform"
          >
            <GmailIcon className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {step === 1 ? "إنشاء حساب موثق جديد" : "تأكيد الحساب عبر Gmail"}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {step === 1
              ? "انضم لمنصة نبض العقار بحساب رسمي موثق عبر Gmail لضمان مصداقية العروض والطلبات"
              : `أدخل رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني: ${email}`}
          </p>

          {/* Stepper indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 1 ? "w-10 bg-red-600" : "w-6 bg-red-400"
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 2 ? "w-10 bg-red-600" : "w-6 bg-slate-200"
              }`}
            />
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold leading-relaxed flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successInfo && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-bold leading-relaxed flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: Registration Details & Role Selection */}
        {/* ========================================================================= */}
        {step === 1 && (
          <form onSubmit={handleInitiateRegistration} className="space-y-4 text-xs">
            {/* Hidden Honeypot Field (Anti-Bot Trap - Isolated from browser autofill) */}
            <div style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true">
              <input
                type="text"
                name="b_extra_catch_input"
                tabIndex={-1}
                autoComplete="off"
                inputMode="none"
                value={hpField}
                onChange={(e) => setHpField(e.target.value)}
                data-lpignore="true"
                data-form-type="other"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                اختر صفتك في المنصة (نوع الحساب) *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("seeker")}
                  className={`p-3 rounded-2xl font-bold border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                    role === "seeker" || role === "buyer"
                      ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-[11px]">مشتري / باحث</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("owner")}
                  className={`p-3 rounded-2xl font-bold border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                    role === "owner"
                      ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="text-[11px]">مالك عقار</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("broker")}
                  className={`p-3 rounded-2xl font-bold border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                    role === "broker"
                      ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span className="text-[11px]">وسيط عقاري</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                {role === "seeker"
                  ? "للبحث عن عقارات، حفظ المفضلة، والتواصل مع الملاك والوسطاء بسهولة."
                  : role === "owner"
                  ? "لأصحاب العقارات لعرض وحداتهم مباشرة ومتابعة استفسارات المشترين."
                  : "للوسطاء والمكاتب العقارية المعتمدة لإدارة المحافظ والحصول على شارة موثق."}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">الاسم الكامل *</label>
              <input
                type="text"
                required
                placeholder="مثال: م. أحمد عبد العزيز"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900"
              />
            </div>

            {/* Email (Official Confirmation Channel via Gmail SMTP) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <GmailIcon className="w-4 h-4 text-red-600" />
                  <span>البريد الإلكتروني (Gmail) لاستلام كود التأكيد *</span>
                </label>
                <span className="text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  تأكيد عبر Gmail SMTP
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  dir="ltr"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-left text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                سيصلك رمز التحقق المكون من 6 أرقام مباشرة في صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها).
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                رقم الهاتف (مصر) للتواصل في المنصة *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  dir="ltr"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-left text-slate-900 tracking-wider"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                يقبل الأرقام المصرية (010, 011, 012, 015) أو الصيغة الدولية (+20).
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">كلمة المرور *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="6 أحرف أو أرقام على الأقل"
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
            </div>

            {/* Owner Extra Field: National ID */}
            {role === "owner" && (
              <div className="p-3.5 bg-brand-50/40 rounded-2xl border border-brand-100 space-y-2">
                <div className="flex items-center gap-1.5 text-brand-900 font-bold">
                  <Shield className="w-4 h-4 text-brand-600" />
                  <span>توثيق ملكية العقار (لحماية المشترين من الإعلانات الوهمية):</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                    الرقم القومي (اختياري لطلب شارة المالك الموثق)
                  </label>
                  <input
                    type="text"
                    placeholder="14 رقماً للتحقق من ملكية العقار"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Broker Extra Fields */}
            {role === "broker" && (
              <div className="space-y-3 p-3.5 bg-brand-50/50 rounded-2xl border border-brand-100">
                <div className="flex items-center gap-1.5 text-brand-900 font-bold">
                  <Shield className="w-4 h-4 text-brand-600" />
                  <span>بيانات الوساطة العقارية المعتمدة:</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    اسم المكتب أو الشركة العقارية *
                  </label>
                  <input
                    type="text"
                    required={role === "broker"}
                    placeholder="مثال: شركة إعمار المستقبل للاستثمار العقاري"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    رقم الترخيص المهني أو السجل التجاري
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: EGY-BROKER-84920"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Gmail Verification Notice */}
            <div className="p-3 bg-red-50/80 rounded-xl border border-red-200/80 text-[11px] text-red-900 font-medium leading-relaxed flex items-center gap-2.5">
              <GmailIcon className="w-5 h-5 text-red-600 shrink-0" />
              <span>
                سيتم إرسال كود تأكيد رسمي مكون من 6 أرقام إلى بريدك الإلكتروني عبر خادم <strong>Gmail SMTP</strong>.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>إرسال رمز التحقق عبر بريد Gmail</span>
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Email Gmail OTP Verification */}
        {/* ========================================================================= */}
        {step === 2 && (
          <form onSubmit={handleVerifyAndComplete} className="space-y-6 text-xs">
            {/* Email Info & Edit Option */}
            <div className="p-4 bg-red-50/60 rounded-2xl border border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <GmailIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-red-800 block font-bold">
                    الرمز أُرسل إلى البريد الإلكتروني:
                  </span>
                  <span className="font-black text-slate-900 text-sm tracking-wider" dir="ltr">
                    {email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-red-700 hover:text-red-900 flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-red-200 shadow-xs"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح Gmail</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline px-2 py-1 bg-white rounded-lg border border-slate-200"
                >
                  تعديل
                </button>
              </div>
            </div>

            {/* 6-Digit OTP Inputs */}
            <div>
              <label className="block font-bold text-slate-700 mb-2 text-center text-xs">
                أدخل رمز التحقق المستلم في بريدك الإلكتروني (6 أرقام)
              </label>
              <div className="flex items-center justify-center gap-2 sm:gap-3" dir="ltr">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/15 outline-none transition-all text-slate-900 shadow-sm"
                  />
                ))}
              </div>
            </div>

            {/* Resend & Timer */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 font-medium">
                لم تجد الرسالة في صندوق الوارد؟
              </span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="font-extrabold text-red-700 hover:text-red-800 flex items-center gap-1.5 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة الإرسال عبر Gmail</span>
                </button>
              ) : (
                <span className="font-bold text-slate-400">
                  إعادة الإرسال بعد ({timerSeconds} ثانية)
                </span>
              )}
            </div>

            {/* Submit Verification */}
            <button
              type="submit"
              disabled={loading || otpCode.join("").length !== 6}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>تأكيد الرمز وبدء الاستخدام</span>
            </button>
          </form>
        )}

        {/* Existing User Login Link */}
        <div className="text-center text-xs text-slate-500 pt-3 border-t border-slate-100">
          لديك حساب مسجل بالفعل؟{" "}
          <Link href="/login" className="font-extrabold text-brand-700 hover:underline">
            تسجيل الدخول الآن
          </Link>
        </div>
      </div>
    </div>
  );
}
