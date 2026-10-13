"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/lib/db/types";
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  KeyRound,
  Home,
  Sparkles,
  Building2,
  ArrowLeft,
  PlusCircle,
  Check,
  BadgeCheck,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Profile Form State
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Role Upgrade State
  const [targetRole, setTargetRole] = useState<"owner" | "broker">("owner");
  const [upgradeNationalId, setUpgradeNationalId] = useState("");
  const [upgradeCompanyName, setUpgradeCompanyName] = useState("");
  const [upgradeLicenseNumber, setUpgradeLicenseNumber] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<{
    success: boolean;
    message: string;
    newRole?: string;
  } | null>(null);

  useEffect(() => {
    fetchProfile();

    const handleAuthChange = () => {
      fetchProfile();
    };
    window.addEventListener("auth-state-changed", handleAuthChange);
    return () => window.removeEventListener("auth-state-changed", handleAuthChange);
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/profile", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setName(data.user.name || "");
        setAvatarUrl(data.user.avatarUrl || "");
        setPhone(data.user.phone || "");
        setWhatsappEnabled(data.user.whatsappEnabled !== false);
        setLicenseNumber(data.user.licenseNumber || "");
        setCompanyName(data.user.companyName || "");

        // If user is already owner, default upgrade option to broker
        if (data.user.role === "owner") {
          setTargetRole("broker");
        }
      }
    } catch {
      setMessage({ text: "فشل تحميل بيانات الملف الشخصي", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          avatarUrl,
          whatsappEnabled,
          licenseNumber: user?.role === "broker" ? licenseNumber : undefined,
          companyName: user?.role === "broker" ? companyName : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء حفظ التعديلات");
      }

      setUser(data.user);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-state-changed"));
      }
      setMessage({ text: "تم تحديث بيانات الملف الشخصي بنجاح", type: "success" });
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setMessage({ text: errText, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgrading(true);
    setUpgradeResult(null);

    try {
      const res = await fetch("/api/auth/upgrade-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          companyName: targetRole === "broker" ? (upgradeCompanyName || companyName) : undefined,
          licenseNumber: targetRole === "broker" ? (upgradeLicenseNumber || licenseNumber) : undefined,
          nationalId: targetRole === "owner" ? upgradeNationalId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تحويل نوع الحساب");
      }

      setUser(data.user);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-state-changed"));
      }
      if (data.user?.companyName) setCompanyName(data.user.companyName);
      if (data.user?.licenseNumber) setLicenseNumber(data.user.licenseNumber);

      setUpgradeResult({
        success: true,
        message: data.message || "تم تحويل نوع حسابك بنجاح! تم تفعيل صلاحيات إضافة وإدارة العقارات.",
        newRole: data.user.role,
      });
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "حدث خطأ أثناء ترقية الحساب";
      setUpgradeResult({
        success: false,
        message: errText,
      });
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <span className="text-xs font-bold">جاري تحميل الملف الشخصي...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">يجب تسجيل الدخول أولاً</h2>
        <Link
          href="/login?redirect=/account/profile"
          className="inline-flex px-6 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const roleLabels: Record<string, { label: string; badgeClass: string }> = {
    seeker: { label: "مشتري / باحث عقاري", badgeClass: "bg-blue-50 text-blue-800 border-blue-200" },
    buyer: { label: "مشتري / باحث عقاري", badgeClass: "bg-blue-50 text-blue-800 border-blue-200" },
    owner: { label: "مالك عقار معتمد", badgeClass: "bg-amber-50 text-amber-800 border-amber-200" },
    broker: { label: "وسيط عقاري معتمد", badgeClass: "bg-teal-50 text-teal-800 border-teal-200" },
    admin: { label: "مدير النظام", badgeClass: "bg-purple-50 text-purple-800 border-purple-200" },
  };

  const currentRole = roleLabels[user.role] || { label: user.role, badgeClass: "bg-slate-100 text-slate-700" };
  const isBuyerOrSeeker = user.role === "buyer" || user.role === "seeker";
  const isOwner = user.role === "owner";
  const isBroker = user.role === "broker";
  const canUpgrade = isBuyerOrSeeker || isOwner;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">الملف الشخصي وإعدادات الحساب</h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة بيانات الاتصال، معلومات الحساب، والهوية العقارية على منصة نبض العقار.
          </p>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${currentRole.badgeClass}`}>
          <Shield className="w-3.5 h-3.5" />
          <span>{currentRole.label}</span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. ROLE UPGRADE & CONVERSION SYSTEM */}
      {canUpgrade && (
        <section
          id="upgrade-role"
          className="bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-black border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ترقية نوع الحساب والنشاط العقاري</span>
                </div>
                <h2 className="text-xl font-black text-white">
                  {isBuyerOrSeeker
                    ? "تحويل الحساب من مشتري إلى مالك عقار أو وسيط معتمد"
                    : "ترقية حساب المالك إلى وسيط عقاري معتمد"}
                </h2>
                <p className="text-xs text-slate-300">
                  {isBuyerOrSeeker
                    ? "حسابك الحالي مخصص للشراء والبحث. حوّل حسابك الآن مجاناً لتفعيل صلاحية إضافة ونشر العقارات وإدارتها."
                    : "يمكنك توسيع نشاطك العقاري وتوثيق شركتك أو مكتبك برقم ترخيص مهني معتمد."}
                </p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <span className="text-[11px] text-slate-400 block">الحساب الحالي</span>
                <span className="text-xs font-extrabold text-amber-300">{currentRole.label}</span>
              </div>
            </div>

            {/* Upgrade Success Notification */}
            {upgradeResult && upgradeResult.success && (
              <div className="bg-emerald-500/20 border border-emerald-400/40 p-5 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-200">🎉 مبروك! تم تحويل حسابك بنجاح</h3>
                    <p className="text-xs text-emerald-100/90 mt-0.5 leading-relaxed">
                      {upgradeResult.message}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-400/20">
                  <Link
                    href="/dashboard/properties/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-transform active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة أول عقار الآن</span>
                    <ArrowLeft className="w-3.5 h-3.5 mr-0.5" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
                  >
                    <span>لوحة التحكم العقارية</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Upgrade Error Notification */}
            {upgradeResult && !upgradeResult.success && (
              <div className="bg-rose-500/20 border border-rose-400/40 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold text-rose-200">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                <span>{upgradeResult.message}</span>
              </div>
            )}

            {/* Role Selection Cards */}
            <form onSubmit={handleUpgradeRole} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. MALEK / OWNER CARD */}
                {isBuyerOrSeeker && (
                  <button
                    type="button"
                    onClick={() => setTargetRole("owner")}
                    className={`relative p-5 rounded-2xl text-right transition-all border-2 flex flex-col justify-between ${
                      targetRole === "owner"
                        ? "bg-white/10 border-amber-400 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/30"
                        : "bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                          <Home className="w-5 h-5" />
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            targetRole === "owner" ? "border-amber-400 bg-amber-400 text-slate-950" : "border-white/30"
                          }`}
                        >
                          {targetRole === "owner" && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white">مالك عقار مباشر (Owner)</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                            للأفراد
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          للأفراد وملاك العقارات الراغبين في بيع أو تأجير عقاراتهم وأراضيهم مباشرة دون عمولة وسيط.
                        </p>
                      </div>

                      <ul className="text-[11px] text-slate-300 space-y-1.5 pt-2 border-t border-white/10">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>إضافة وإدارة عقارات للبيع أو الإيجار</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>التواصل المباشر مع المشترين والمستأجرين</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>تفعيل زر (إضافة مشروع) في الموقع والتطبيق فوراً</span>
                        </li>
                      </ul>
                    </div>
                  </button>
                )}

                {/* 2. BROKER / WASSEET CARD */}
                <button
                  type="button"
                  onClick={() => setTargetRole("broker")}
                  className={`relative p-5 rounded-2xl text-right transition-all border-2 flex flex-col justify-between ${
                    targetRole === "broker"
                      ? "bg-white/10 border-teal-400 shadow-lg shadow-teal-500/10 ring-2 ring-teal-400/30"
                      : "bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10"
                  } ${isOwner ? "md:col-span-2" : ""}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          targetRole === "broker" ? "border-teal-400 bg-teal-400 text-slate-950" : "border-white/30"
                        }`}
                      >
                        {targetRole === "broker" && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white">وسيط عقاري معتمد (Broker)</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300">
                          للوسطاء والمكاتب
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        للوسطاء المرخصين، المسوقين العقاريين، المكاتب وشركات التطوير لإدارة وتسويق محفظة عقارية.
                      </p>
                    </div>

                    <ul className="text-[11px] text-slate-300 space-y-1.5 pt-2 border-t border-white/10">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>إضافة محفظة عقارية ومشاريع متعددة غير محدودة</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>شارة وسيط معتمد واسم المكتب العقاري في الإعلانات</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>الوصول لسوق عقار مطلوب وطلبات المشترين المباشرة</span>
                      </li>
                    </ul>
                  </div>
                </button>
              </div>

              {/* Dynamic Role Fields */}
              {targetRole === "owner" && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white block">
                      رقم الهوية الوطنية / السجل المدني للمالك (اختياري للتوثيق المباشر)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={upgradeNationalId}
                      onChange={(e) => setUpgradeNationalId(e.target.value)}
                      placeholder="مثال: 1087654321"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none text-right"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      تساعد في سرعة توثيق ملكية عقاراتك مستقبلاً لدى المنصة.
                    </span>
                  </div>
                </div>
              )}

              {targetRole === "broker" && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white">
                        اسم المكتب العقاري أو الشركة <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={upgradeCompanyName}
                        onChange={(e) => setUpgradeCompanyName(e.target.value)}
                        placeholder="مثال: شركة الرائد للتسويق العقاري"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs font-medium focus:ring-2 focus:ring-teal-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white">
                        رقم ترخيص الوساطة العقارية (رخصة فال) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        dir="ltr"
                        value={upgradeLicenseNumber}
                        onChange={(e) => setUpgradeLicenseNumber(e.target.value)}
                        placeholder="مثال: 1200012345"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs font-mono focus:ring-2 focus:ring-teal-400 focus:outline-none text-right"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    يتم إبراز رقم الترخيص واسم المكتب في جميع إعلاناتك لتعزيز ثقة المشترين والمستثمرين.
                  </span>
                </div>
              )}

              {/* Confirm Upgrade Submit Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-slate-400">
                  ⚡ التحويل فوري، وسيتم تحديث صلاحياتك وشريط الموقع والتطبيق تلقائياً دون الحاجة لتسجيل خروج.
                </p>

                <button
                  type="submit"
                  disabled={upgrading}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
                    targetRole === "owner"
                      ? "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20"
                      : "bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-teal-400/20"
                  }`}
                >
                  {upgrading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {targetRole === "owner"
                      ? "تأكيد التحويل إلى (مالك عقار) الآن"
                      : "تأكيد التحويل إلى (وسيط عقاري معتمد) الآن"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* 2. CERTIFIED BROKER STATUS BADGE (If Already Broker) */}
      {isBroker && (
        <section className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
                <BadgeCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-teal-950">حساب وسيط عقاري معتمد</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                    نشط ومفعل
                  </span>
                </div>
                <p className="text-xs text-teal-800 font-medium">
                  {companyName ? `المكتب: ${companyName}` : "مكتب عقاري معتمد"}
                  {licenseNumber ? ` • ترخيص رقم: ${licenseNumber}` : ""}
                </p>
                <p className="text-[11px] text-slate-500">
                  تتمتع بكامل صلاحيات إضافة العقارات والمشاريع، وسوق عقار مطلوب، والتواصل المباشر مع العملاء.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-teal-200 hover:bg-teal-50 text-teal-900 font-bold text-xs transition"
              >
                <span>لوحة التحكم</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Main Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900">البيانات الشخصية ومعلومات الاتصال</h3>
          <p className="text-xs text-slate-400 mt-0.5">تحديث الاسم، الهاتف المعتمد للتواصل مع العملاء، وتفعيل الواتساب.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>الاسم الكامل</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>البريد الإلكتروني (غير قابل للتعديل)</span>
            </label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs font-mono select-none"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>رقم الهاتف (للتواصل مع العملاء)</span>
            </label>
            <input
              type="tel"
              required
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none text-right"
            />
          </div>

          {/* WhatsApp toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">تفعيل التواصل عبر واتساب</span>
              <span className="text-[11px] text-slate-400">إظهار زر واتساب للعملاء الراغبين بالتواصل</span>
            </div>
            <input
              type="checkbox"
              checked={whatsappEnabled}
              onChange={(e) => setWhatsappEnabled(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded-md focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Broker Specific Fields */}
        {user.role === "broker" && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-extrabold text-teal-800 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              <span>بيانات الوساطة العقارية والترخيص المهني</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">رقم ترخيص الوساطة العقارية</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="مثال: EG-RE-2026-987"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">اسم شركة التطوير / المكتب العقاري</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="مثال: شركة النيل للتسويق العقاري"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>تغيير كلمة المرور &larr;</span>
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ التعديلات</span>
          </button>
        </div>
      </form>
    </div>
  );
}
