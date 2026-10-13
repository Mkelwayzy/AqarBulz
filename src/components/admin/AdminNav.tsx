"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  AlertTriangle,
  History,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  LogOut,
  ExternalLink,
  UserCog,
  KeyRound,
} from "lucide-react";

interface AdminNavProps {
  pendingCount?: number;
  reportsCount?: number;
  inquiriesCount?: number;
}

export default function AdminNav({ pendingCount, reportsCount, inquiriesCount }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.dispatchEvent(new Event("auth-state-changed"));
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const navItems = [
    {
      href: "/admin",
      label: "لوحة العمليات والإحصائيات",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/properties",
      label: "إشراف ومراجعة العقارات",
      icon: Building2,
      badge: pendingCount && pendingCount > 0 ? pendingCount : undefined,
      badgeColor: "bg-amber-500 text-slate-950 font-black",
    },
    {
      href: "/admin/inquiries",
      label: "طلبات واستفسارات العملاء",
      icon: MessageSquare,
      badge: inquiriesCount && inquiriesCount > 0 ? inquiriesCount : undefined,
      badgeColor: "bg-emerald-500 text-slate-950 font-black",
    },
    {
      href: "/admin/users",
      label: "إدارة المعلنين والحسابات",
      icon: Users,
    },
    {
      href: "/admin/staff",
      label: "فريق الإدارة والصلاحيات",
      icon: UserCog,
      badge: "التحكم",
      badgeColor: "bg-purple-500 text-white font-black",
    },
    {
      href: "/admin/reports",
      label: "بلاغات وشكاوى المحتوى",
      icon: AlertTriangle,
      badge: reportsCount && reportsCount > 0 ? reportsCount : undefined,
      badgeColor: "bg-rose-500 text-white font-black",
    },
    {
      href: "/admin/cms",
      label: "إدارة المحتوى (CMS)",
      icon: LayoutDashboard,
    },
    {
      href: "/admin/smart-features",
      label: "المنظومة الذكية (30 ميزة)",
      icon: ShieldCheck,
      badge: "30 فكرة",
      badgeColor: "bg-emerald-500 text-slate-950 font-black",
    },
  ];

  return (
    <header className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl mb-8 border border-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              لوحة الإدارة المركزية (AqarPulse Admin)
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
              admin@aqarpulse.eg
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">نظام الرقابة والامتثال وإدارة العمليات</h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            اعتماد العقارات المعروضة، متابعة طلبات واستفسارات المشترين، الرقابة الجغرافية، والتحقق من حسابات المعلنين.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <Link
            href="/admin/staff"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-bold border border-purple-500/40 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>تغيير كلمة المرور / الصلاحيات</span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors"
          >
            <span>الخريطة الحية</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors"
          >
            <span>الموقع الرئيسي</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {/* Tabs - Vertical-first grid, no horizontal scroll */}
      <nav className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-4">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate text-[11px]">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] shrink-0 ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
