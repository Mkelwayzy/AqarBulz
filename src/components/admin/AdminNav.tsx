"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  AlertTriangle,
  History,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

interface AdminNavProps {
  pendingCount?: number;
  reportsCount?: number;
}

export default function AdminNav({ pendingCount, reportsCount }: AdminNavProps) {
  const pathname = usePathname();

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
      badgeColor: "bg-amber-500 text-white",
    },
    {
      href: "/admin/users",
      label: "إدارة المعلنين والحسابات",
      icon: Users,
    },
    {
      href: "/admin/reports",
      label: "بلاغات وشكاوى المحتوى",
      icon: AlertTriangle,
      badge: reportsCount && reportsCount > 0 ? reportsCount : undefined,
      badgeColor: "bg-rose-500 text-white",
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
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              لوحة الإدارة المركزية (AqarPulse Admin)
            </span>
            <span className="text-xs text-slate-400 font-mono">Server-Enforced RBAC</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">نظام الرقابة والامتثال والعمليات</h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            إدارة العقارات المعروضة، تدقيق خصوصية المواقع الجغرافية، التحقق من المعلنين، ومتابعة سجلات التدقيق الأمني.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
          >
            <span>استعراض الخريطة الحية</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
          >
            <span>الواجهة العامة</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-2 pt-4 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${item.badgeColor}`}
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
