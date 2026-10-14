"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import {
  ShieldCheck,
  Building2,
  Sparkles,
  Loader2,
  PlusCircle,
  LayoutGrid,
  Settings,
  Layers,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user || data.user.role !== "admin") {
          router.push("/admin/login?redirect=/admin");
        } else {
          setCurrentUser(data.user);
        }
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-xs font-bold text-slate-400">جاري التحقق من صلاحيات إدارة المنصة...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-36 font-sans" dir="rtl">
      {/* 1. Header Navigation */}
      <AdminNav />

      {/* 2. Main Executive Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & Status Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>لوحة تحكم شركة الإدارة • البداية من الصفر</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              لوحة التحكم المركزية لشركة الإدارة
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              تم حذف وتصفير جميع العناصر السابقة بنجاح. اللوحة مهيأة وجاهزة بالكامل لبدء بناء هيكل الإدارة الجديد، التحكم في المشاريع والعمليات، وإعادة التنفيذ بأعلى المعايير الاحترافية.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                الحساب الإداري نشط: {currentUser?.email || currentUser?.name || "المسؤول العام"}
              </span>
              <span>•</span>
              <span className="text-slate-400">الحالة: جاهزة للبناء والتنفيذ</span>
            </div>
          </div>

          {/* Decorative background glow */}
          <div className="absolute -left-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Clean Slate Ready Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-700">
            <LayoutGrid className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">
              مرحباً بك، اللوحة خالية تماماً وجاهزة لمتطلباتك
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              أخبرنا الآن بالهيكل والمكونات التي ترغب في تضمينها داخل لوحة تحكم شركة الإدارة، وسنقوم ببنائها وتنظيمها لك بأعلى دقة وكفاءة.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
