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
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/profile", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setName(data.user.name || "");
        setPhone(data.user.phone || "");
        setWhatsappEnabled(data.user.whatsappEnabled !== false);
        setLicenseNumber(data.user.licenseNumber || "");
        setCompanyName(data.user.companyName || "");
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
      setMessage({ text: "تم تحديث بيانات الملف الشخصي بنجاح", type: "success" });
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setMessage({ text: errText, type: "error" });
    } finally {
      setSaving(false);
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
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
