"use client";

import React, { useState, useEffect, useRef } from "react";
import { User } from "@/lib/db/types";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { compressImageClientSide } from "@/lib/utils/imageCompression";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        setEmail(data.user.email || "");
        setBio(data.user.bio || "");
        setAvatarUrl(data.user.avatarUrl || "");
      }
    } catch {
      setMessage({ text: "فشل تحميل بيانات الملف الشخصي", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      // Client-side compression optimized for mobile avatar (~512px WebP)
      const compressed = await compressImageClientSide(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        mimeType: "image/webp",
      });

      const formData = new FormData();
      formData.append("file", compressed.file);
      formData.append("propertyId", "avatar");

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setAvatarUrl(data.url);
        setMessage({ text: "تم ضغط ورفع الصورة بنجاح. اضغط حفظ لتأكيد التغيير.", type: "success" });
      } else {
        throw new Error(data.error || "فشل رفع الصورة");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل رفع الصورة";
      setMessage({ text: msg, type: "error" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
          bio,
          avatarUrl,
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
      setMessage({ text: "تم حفظ التعديلات بنجاح", type: "success" });
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setMessage({ text: errText, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
        <span className="text-xs font-bold">جاري تحميل الملف الشخصي...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-4 border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-base font-black text-slate-900">يجب تسجيل الدخول أولاً</h2>
          <Link
            href="/login?redirect=/account/profile"
            className="inline-flex w-full justify-center px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] pb-24 text-slate-900" dir="rtl">
      {/* Top Header matching reference screen */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
          aria-label="الرجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black text-slate-900">الملف الشخصي</h1>
        <div className="w-9" /> {/* Spacer */}
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Upload Card */}
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative w-24 h-24 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center hover:bg-slate-50 transition active:scale-95 overflow-hidden group"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={name || "الصورة الشخصية"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-700 transition">
                  <Camera className="w-8 h-8 stroke-[1.5]" />
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
                </div>
              )}
            </button>
            <span className="text-xs font-medium text-slate-500">
              اضغط لإضافة صورة شخصية
            </span>
          </div>

          {/* Form Inputs matching reference screen img_0_0 */}
          <div className="space-y-4">
            {/* 1. Name */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-slate-800 block">الاسم</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:outline-none shadow-2xs"
              />
            </div>

            {/* 2. Email */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-slate-800 block">البريد الإلكتروني</label>
              <input
                type="email"
                disabled
                value={email || user.email || ""}
                placeholder="البريد الإلكتروني"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-medium select-none shadow-2xs cursor-not-allowed"
              />
            </div>

            {/* 3. Bio / نبذة شخصية */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-slate-800 block">نبذه شخصية</label>
              <textarea
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="...أدخل هنا"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:outline-none shadow-2xs resize-none"
              />
            </div>
          </div>

          {/* Status message */}
          {message && (
            <div
              className={`p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-center border ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-rose-50 text-rose-800 border-rose-300"
              }`}
            >
              {message.type === "success" ? (
                <Info className="w-4 h-4 shrink-0 text-emerald-700" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Bottom Save Button matching img_0_0 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 px-6 rounded-xl bg-[#00875a] hover:bg-[#00734c] text-white text-sm font-extrabold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>حفظ</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
