"use client";

import React, { useState, useEffect } from "react";
import { OfficialNotice } from "@/lib/db/types";
import {
  ShieldAlert,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Edit3,
  X,
  ExternalLink,
  Loader2,
  Building2,
} from "lucide-react";

interface OfficialNoticesListProps {
  onOpenEditProperty?: (propertyId: string) => void;
  refreshTrigger?: number;
}

export default function OfficialNoticesList({
  onOpenEditProperty,
  refreshTrigger,
}: OfficialNoticesListProps) {
  const [notices, setNotices] = useState<OfficialNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchNotices();
  }, [refreshTrigger]);

  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/official-notices");
      const data = await res.json();
      if (res.ok && data.notices) {
        setNotices(data.notices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (noticeId: string) => {
    setActionLoading(noticeId);
    try {
      const res = await fetch("/api/official-notices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeId, action: "read" }),
      });
      if (res.ok) {
        setNotices((prev) =>
          prev.map((n) => (n.id === noticeId ? { ...n, status: "read" } : n))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
        <span>جاري تحميل المراسلات الرسمية...</span>
      </div>
    );
  }

  if (notices.length === 0) {
    return null; // Don't clutter if no official notices exist
  }

  const unreadCount = notices.filter((n) => n.status === "unread").length;

  return (
    <div className="bg-white border border-indigo-200/80 rounded-2xl p-5 shadow-xs space-y-4" dir="rtl">
      <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <span>قناة التواصل الرسمية مع الإدارة</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold animate-pulse">
                  {unreadCount} رسالة جديدة
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              التوجيهات والقرارات وطلبات التعديل الرسمية الصادرة من إدارة المنصة لحسابك
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className={`p-4 rounded-xl border text-xs space-y-2 transition ${
              notice.status === "unread"
                ? "bg-indigo-50/40 border-indigo-300"
                : "bg-slate-50/70 border-slate-200 text-slate-700"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-black text-xs ${
                      notice.status === "unread" ? "text-indigo-950 font-black" : "text-slate-800"
                    }`}
                  >
                    {notice.title}
                  </span>
                  {notice.type === "edit_request" && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">
                      طلب تعديل رسمي ✏️
                    </span>
                  )}
                  {notice.type === "deletion_notice" && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-bold text-[10px]">
                      إشعار حذف / تعليق ⚠️
                    </span>
                  )}
                  {notice.type === "deletion_request" && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-[10px]">
                      طلبك لحذف العقار 📨
                    </span>
                  )}
                </div>

                {notice.propertyTitle && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>بشأن العقار: <strong>{notice.propertyTitle}</strong></span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 font-mono shrink-0">
                {new Date(notice.createdAt).toLocaleDateString("ar-EG")}
              </div>
            </div>

            <p className="text-slate-700 leading-relaxed font-medium bg-white/80 p-3 rounded-lg border border-slate-100">
              {notice.message}
            </p>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">
                مرسلة من: <strong className="text-slate-600">{notice.senderName}</strong>
              </span>

              <div className="flex items-center gap-2">
                {/* Direct action button if edit request */}
                {notice.type === "edit_request" && notice.propertyId && onOpenEditProperty && (
                  <button
                    type="button"
                    onClick={() => onOpenEditProperty(notice.propertyId!)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل الإعلان المطلوب ✏️</span>
                  </button>
                )}

                {notice.status === "unread" && (
                  <button
                    type="button"
                    disabled={actionLoading === notice.id}
                    onClick={() => handleMarkAsRead(notice.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3 text-slate-500" />
                    <span>تحديد كمقروء</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
