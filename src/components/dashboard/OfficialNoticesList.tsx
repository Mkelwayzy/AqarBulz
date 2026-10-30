"use client";

import React, { useState, useEffect } from "react";
import { OfficialNotice } from "@/lib/db/types";
import {
  ShieldAlert,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  ExternalLink,
  Loader2,
  Building2,
  XCircle,
  PartyPopper,
  CheckCheck,
} from "lucide-react";

interface OfficialNoticesListProps {
  onOpenEditProperty?: (propertyId: string) => void;
  refreshTrigger?: number;
  /** Called after notices load so parent can update unread badge */
  onUnreadCountChange?: (count: number) => void;
}

/** Relative Arabic timestamp like social apps: "منذ 5 دقائق" */
function timeAgoAr(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG");
}

export default function OfficialNoticesList({
  onOpenEditProperty,
  refreshTrigger,
  onUnreadCountChange,
}: OfficialNoticesListProps) {
  const [notices, setNotices] = useState<OfficialNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/official-notices", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (res.ok && data.notices) {
        setNotices(data.notices);
        const unread = data.notices.filter((n: OfficialNotice) => n.status === "unread").length;
        onUnreadCountChange?.(unread);
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
        setNotices((prev) => {
          const next = prev.map((n) => (n.id === noticeId ? { ...n, status: "read" as const } : n));
          onUnreadCountChange?.(next.filter((n) => n.status === "unread").length);
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notices.filter((n) => n.status === "unread");
    if (unread.length === 0) return;
    setActionLoading("all");
    try {
      await Promise.all(
        unread.map((n) =>
          fetch("/api/official-notices", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noticeId: n.id, action: "read" }),
          })
        )
      );
      setNotices((prev) => {
        const next = prev.map((n) => ({ ...n, status: "read" as const }));
        onUnreadCountChange?.(0);
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-3/4" />
              <div className="h-2.5 bg-slate-50 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notices.length === 0) {
    return (
      <div className="text-center py-10 space-y-2" dir="rtl">
        <div className="w-14 h-14 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto">
          <Bell className="w-7 h-7" />
        </div>
        <p className="text-sm font-black text-slate-700">لا توجد إشعارات بعد</p>
        <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
          ستظهر هنا إشعارات الإدارة فور مراجعة مشاريعك — مثل الموافقة أو الرفض مع سببه التفصيلي
        </p>
      </div>
    );
  }

  const unreadCount = notices.filter((n) => n.status === "unread").length;

  return (
    <div dir="rtl" className="space-y-3">
      {/* Header bar with mark-all-read */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900">إشعارات الإدارة</h3>
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold text-rose-600">{unreadCount} إشعار جديد</span>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={actionLoading === "all"}
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-900 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition disabled:opacity-50 cursor-pointer"
          >
            {actionLoading === "all" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            <span>قراءة الكل</span>
          </button>
        )}
      </div>

      {/* Social-style feed */}
      <div className="space-y-2.5">
        {notices.map((notice) => {
          const isApproved = notice.type === "project_approved";
          const isRejected = notice.type === "project_rejected";
          const unread = notice.status === "unread";

          const typeBadge = isApproved ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              <PartyPopper className="w-3 h-3" />
              موافقة ✅
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
              <XCircle className="w-3 h-3" />
              رفض ❌
            </span>
          ) : notice.type === "edit_request" ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">طلب تعديل ✏️</span>
          ) : notice.type === "deletion_notice" ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold text-[10px]">حذف/تعليق ⚠️</span>
          ) : notice.type === "deletion_request" ? (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px]">طلب حذف 📨</span>
          ) : null;

          return (
            <div
              key={notice.id}
              className={`relative flex items-start gap-3 p-4 rounded-2xl border transition ${unread
                  ? "bg-white border-brand-200 shadow-sm"
                  : "bg-white/60 border-slate-100"
                }`}
            >
              {/* Unread dot (social style) */}
              {unread && (
                <span className="absolute top-4 left-2.5 w-2 h-2 rounded-full bg-brand-600 animate-pulse shrink-0" />
              )}

              {/* Avatar circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${isApproved
                    ? "bg-emerald-100 text-emerald-700"
                    : isRejected
                      ? "bg-rose-100 text-rose-700"
                      : "bg-indigo-50 text-indigo-700"
                  }`}
              >
                {isApproved ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isRejected ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Title + time (social layout) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-black ${unread ? "text-slate-900" : "text-slate-700"}`}>
                      {notice.title}
                    </span>
                    {typeBadge}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                    {timeAgoAr(notice.createdAt)}
                  </span>
                </div>

                {/* Related property */}
                {notice.propertyTitle && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">بشأن: <strong>{notice.propertyTitle}</strong></span>
                  </div>
                )}

                {/* Message */}
                <p className="text-xs text-slate-700 leading-relaxed">{notice.message}</p>

                {/* Detailed rejection reason box */}
                {isRejected && notice.rejectionReason && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-rose-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>سبب الرفض من الإدارة:</span>
                    </div>
                    <p className="text-xs text-rose-800 font-medium leading-relaxed">{notice.rejectionReason}</p>
                  </div>
                )}

                {/* Approval extra notes if any */}
                {isApproved && notice.rejectionReason && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[11px] text-emerald-900 font-medium leading-relaxed">
                      <strong>ملاحظات الإدارة:</strong> {notice.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    من: <strong className="text-slate-600">{notice.senderName}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {(isApproved || isRejected) && notice.actionUrl && (
                      <a
                        href={notice.actionUrl}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>عرض المشروع</span>
                      </a>
                    )}

                    {notice.type === "edit_request" && notice.propertyId && onOpenEditProperty && (
                      <button
                        type="button"
                        onClick={() => onOpenEditProperty(notice.propertyId!)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تعديل الإعلان ✏️</span>
                      </button>
                    )}

                    {unread && (
                      <button
                        type="button"
                        disabled={actionLoading === notice.id}
                        onClick={() => handleMarkAsRead(notice.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                      >
                        {actionLoading === notice.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-slate-500" />
                        )}
                        <span>تم القراءة</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
