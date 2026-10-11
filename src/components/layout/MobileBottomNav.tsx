"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Search,
  Heart,
  User as UserIcon,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import MobileSearchDrawer from "./MobileSearchDrawer";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.user) setUserLoggedIn(true);
      })
      .catch(() => setUserLoggedIn(false));
  }, [pathname]);

  // Don't show bottom nav on admin panel to avoid obstructing admin controls
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    {
      id: "home",
      label: "الرئيسية",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      id: "explore",
      label: "الخريطة",
      href: "/explore",
      icon: Compass,
      isActive: pathname === "/explore",
    },
    {
      id: "search",
      label: "بحث فوري",
      onClick: () => setSearchDrawerOpen(true),
      icon: Search,
      isPrimaryAction: true,
      isActive: searchDrawerOpen,
    },
    {
      id: "favorites",
      label: "المفضلة",
      href: "/account/favorites",
      icon: Heart,
      isActive: pathname === "/account/favorites",
    },
    {
      id: "account",
      label: userLoggedIn ? "حسابي" : "دخول",
      href: userLoggedIn ? "/dashboard" : "/login",
      icon: UserIcon,
      isActive:
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/account") ||
        pathname === "/login",
    },
  ];

  return (
    <>
      {/* Sticky Bottom Navigation Bar for Mobile (hidden on lg screens) */}
      <nav
        aria-label="التنقل السريع للهاتف"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-md mx-auto flex items-center justify-around relative">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl relative transition-transform active:scale-90 group"
                >
                  <div className="w-11 h-11 -mt-4 rounded-2xl bg-gradient-to-tr from-brand-800 to-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 ring-4 ring-white group-hover:scale-105 transition-all">
                    <Icon className="w-5 h-5 text-brand-50 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-black mt-1 text-brand-700">
                    {item.label}
                  </span>
                </button>
              );
            }

            const active = item.isActive;

            return (
              <Link
                key={item.id}
                href={item.href || "#"}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 relative active:scale-95 ${
                  active
                    ? "text-brand-700 font-black"
                    : "text-slate-500 hover:text-slate-800 font-bold"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      active ? "scale-110 stroke-[2.5]" : "stroke-2"
                    }`}
                  />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-600 shadow-sm shadow-brand-500/50" />
                  )}
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-1 ${
                    active ? "font-black text-brand-700" : "font-semibold"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Instant Mobile Search & Filter Drawer */}
      <MobileSearchDrawer
        isOpen={searchDrawerOpen}
        onClose={() => setSearchDrawerOpen(false)}
      />
    </>
  );
}
