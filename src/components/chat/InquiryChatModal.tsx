"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Send,
  Shield,
  ShieldCheck,
  Building2,
  User,
  Clock,
  CheckCheck,
  Loader2,
  Sparkles,
  Phone,
  MessageCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { ChatMessage, Inquiry, UserRole } from "@/lib/db/types";

interface InquiryChatModalProps {
  inquiryId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: UserRole;
  currentUserId?: string;
  isSupervisor?: boolean;
}

export default function InquiryChatModal({
  inquiryId,
  isOpen,
  onClose,
  currentUserRole,
  currentUserId,
  isSupervisor = false,
}: InquiryChatModalProps) {
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminNoteMode, setAdminNoteMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/messages`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setInquiry(data.inquiry);
        setMessages(data.messages || []);
        setError(null);
      } else {
        setError(data.error || "تعذر جلب تفاصيل المحادثة");
      }
    } catch {
      if (!silent) setError("خطأ في الاتصال بالخادم");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    if (isOpen && inquiryId) {
      fetchMessages();
      // Polling every 3 seconds for live chat feel
      const interval = setInterval(() => {
        fetchMessages(true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, inquiryId, fetchMessages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    const contentToSend = inputText.trim();
    setInputText("");

    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentToSend,
          isAdminNote: isSupervisor && adminNoteMode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => [...prev, data.message]);
        if (data.inquiry) setInquiry(data.inquiry);
      } else {
        alert(data.error || "فشل إرسال الرسالة");
      }
    } catch {
      alert("حدث خطأ في الاتصال أثناء الإرسال");
    } finally {
      setSending(false);
    }
  };

  const handleQuickSend = (text: string) => {
    setInputText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[90vh] max-h-[720px] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white flex items-center justify-between border-b border-brand-800/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand-600/30 border border-brand-400/40 flex items-center justify-center text-brand-300 shrink-0 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-white truncate">
                  شات التواصل والمعاينة المباشر
                </h3>
                {isSupervisor ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold text-[10px] flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>وضع إشراف الإدارة 🛡️</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 font-bold text-[10px]">
                    محادثة مشفرة وآمنة
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                عقار: <strong className="text-brand-300 font-semibold">{inquiry?.propertyTitle || "طلب العقار"}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supervision Banner */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 text-[11px] font-bold text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              تشرف إدارة منصة نبض العقار على هذه المحادثة لحماية الطرفين وضمان دقة المعاينة والجدية.
            </span>
          </div>
          <button
            onClick={() => fetchMessages(false)}
            className="text-[10px] text-amber-800 hover:text-amber-950 flex items-center gap-1 shrink-0 underline"
          >
            <RefreshCw className="w-3 h-3" />
            <span>تحديث</span>
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/70 text-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="font-medium text-xs">جاري تحميل رسائل المحادثة...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 mx-auto text-rose-500" />
              <p className="font-bold">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <MessageCircle className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600">لا توجد رسائل سابقة</p>
              <p className="text-[11px]">ابدأ بكتابة استفسارك أو اقتراح موعد المعاينة المناسب لك.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.senderRole === "admin" || msg.isAdminNote;
              const isBuyer = msg.senderRole === "buyer" || msg.senderRole === "seeker";
              const isAdvertiser = msg.senderRole === "owner" || msg.senderRole === "broker";

              // Special Admin Supervisory Bubble
              if (isAdmin) {
                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-sm text-slate-900 my-2 max-w-lg mx-auto"
                  >
                    <div className="flex items-center gap-1.5 text-amber-800 font-black text-[11px] mb-1">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>{msg.senderName || "إشراف إدارة نبض العقار 🛡️"}</span>
                      <span className="text-[10px] text-amber-600/70 font-normal mr-auto">
                        {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed font-semibold text-amber-950">{msg.content}</p>
                  </div>
                );
              }

              // Normal Chat Bubble
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBuyer ? "items-start" : "items-end"} max-w-[85%] ${
                    isBuyer ? "mr-auto" : "ml-auto"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isBuyer
                          ? "bg-brand-100 text-brand-800"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {isBuyer ? "المشتري / الباحث" : "المالك / الوسيط"}
                    </span>
                    <span className="font-bold text-[11px] text-slate-700">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed ${
                      isBuyer
                        ? "bg-brand-600 text-white rounded-br-none"
                        : "bg-white text-slate-900 border border-slate-200/90 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold shrink-0">اقتراحات سريعة:</span>
          {[
            "أود تحديد موعد للمعاينة غداً عصراً",
            "هل العقار متاح للمعاينة اليوم؟",
            "أرجو تزويدي بفيديو تفصيلي للوحدة",
            "هل السعر نهائي أم قابل للتفاوض؟",
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickSend(chip)}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 border border-slate-200 text-slate-600 font-medium shrink-0 transition-all cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-slate-200">
          {isSupervisor && (
            <div className="mb-2 flex items-center justify-between text-[11px] px-1">
              <label className="flex items-center gap-1.5 font-bold text-amber-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminNoteMode}
                  onChange={(e) => setAdminNoteMode(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span>إرسال كتنبيه إداري إشرافي رسمي (Official Supervisory Note)</span>
              </label>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isSupervisor
                  ? adminNoteMode
                    ? "اكتب التنبيه الإداري الإشرافي للطرفين..."
                    : "اكتب رسالتك كمشرف على المحادثة..."
                  : "اكتب رسالتك للمعلن بخصوص المعاينة والاستفسار..."
              }
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/20 transition-all disabled:opacity-40 cursor-pointer shrink-0 active:scale-95"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">إرسال</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
