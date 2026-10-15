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
  Phone,
  MessageCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Calendar,
  Tag,
  ExternalLink,
  MapPin,
  CheckCircle,
  ChevronDown,
  Lock,
} from "lucide-react";
import { ChatMessage, Inquiry, InquiryStatus, UserRole } from "@/lib/db/types";
import { App } from "@capacitor/app";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { playMessageChime } from "@/lib/utils/chatSound";

interface DisplayMessage extends ChatMessage {
  isPending?: boolean;
}

interface InquiryChatModalProps {
  inquiryId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: UserRole;
  currentUserId?: string;
  isSupervisor?: boolean;
}

const INQUIRY_STATUS_CONFIG: Record<string, { label: string; badgeClass: string; desc: string }> = {
  new: { label: "طلب جديد", badgeClass: "bg-blue-500/20 text-blue-300 border-blue-400/40", desc: "بانتظار رد المالك" },
  contacted: { label: "قيد التواصل 💬", badgeClass: "bg-amber-500/20 text-amber-300 border-amber-400/40", desc: "المحادثة جارية بين الطرفين" },
  viewing_scheduled: { label: "موعد معاينة محدد 📅", badgeClass: "bg-purple-500/20 text-purple-300 border-purple-400/40", desc: "تم الاتفاق على موعد معاينة ميداني" },
  negotiating: { label: "قيد التفاوض 🤝", badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-400/40", desc: "جاري التفاوض على السعر والشروط" },
  deal_closed: { label: "تم الاتفاق والصفقة 🎉", badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40", desc: "تمت الصفقة بنجاح" },
  closed: { label: "مكتمل / مغلق 🔒", badgeClass: "bg-slate-500/20 text-slate-300 border-slate-400/40", desc: "تم إغلاق هذا الطلب" },
  spam: { label: "ملغي / بلاغ ⚠️", badgeClass: "bg-rose-500/20 text-rose-300 border-rose-400/40", desc: "طلب غير جاد أو تم الإبلاغ عنه" },
};

/**
 * Robust message deduplication, pending replacement, and strict ascending timestamp sorting.
 * Eliminates synthetic initial placeholders completely from the stream.
 */
function mergeMessages(
  current: DisplayMessage[],
  incoming: (ChatMessage | DisplayMessage)[]
): DisplayMessage[] {
  const map = new Map<string, DisplayMessage>();

  current.forEach((msg) => {
    if (msg && msg.id && !msg.id.endsWith("-initial")) {
      map.set(msg.id, msg);
    }
  });

  incoming.forEach((msg) => {
    if (!msg || !msg.id || msg.id.endsWith("-initial")) return;

    let pendingKeyToDelete: string | null = null;
    map.forEach((val, key) => {
      if (
        !pendingKeyToDelete &&
        val.isPending &&
        val.content.trim() === msg.content.trim() &&
        Math.abs(new Date(val.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 20000
      ) {
        pendingKeyToDelete = key;
      }
    });

    if (pendingKeyToDelete) {
      map.delete(pendingKeyToDelete);
      map.set(msg.id, { ...msg, isPending: false });
    } else {
      const existing = map.get(msg.id);
      map.set(msg.id, { ...existing, ...msg, isPending: false });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.createdAt || (a as any).created_at || 0).getTime();
    const timeB = new Date(b.createdAt || (b as any).created_at || 0).getTime();
    return timeA - timeB;
  });
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
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminNoteMode, setAdminNoteMode] = useState(false);

  // Modals for Buyer & Owner specific actions
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [viewingDate, setViewingDate] = useState("غداً عصراً (4:00 - 6:00 مساءً)");
  const [customViewingDate, setCustomViewingDate] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pausePollingUntilRef = useRef<number>(0);
  const failedAttemptsRef = useRef<number>(0);
  const hasLoadedSuccessfullyRef = useRef<boolean>(false);

  const isOwner = Boolean(
    currentUserRole === "owner" ||
    currentUserRole === "broker" ||
    (inquiry && currentUserId && inquiry.advertiserId === currentUserId)
  );

  const isBuyer = Boolean(
    currentUserRole === "buyer" ||
    currentUserRole === "seeker" ||
    (!isSupervisor && !isOwner)
  );

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (silent && Date.now() < pausePollingUntilRef.current) {
        return;
      }

      // Only show full loading spinner on initial load when data hasn't been retrieved yet
      if (!silent && !hasLoadedSuccessfullyRef.current && !inquiry) {
        setLoading(true);
      }

      try {
        const res = await fetch(`/api/inquiries/${inquiryId}/messages`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();

        if (res.ok && data.success) {
          failedAttemptsRef.current = 0;
          hasLoadedSuccessfullyRef.current = true;
          if (data.inquiry) setInquiry(data.inquiry);
          setMessages((prev) => mergeMessages(prev, data.messages || []));
          setError(null);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("messages-read"));
          }
        } else {
          // STATE GUARD: If chat is already loaded and active, NEVER clear or show error on silent/polling failure!
          if (hasLoadedSuccessfullyRef.current || inquiry !== null) {
            console.warn("[ChatModal] Silent background polling failure ignored:", data?.error || res.status);
            return;
          }

          // Initial load failure tracking: only show error after at least 2 failed attempts
          failedAttemptsRef.current += 1;
          if (failedAttemptsRef.current >= 2) {
            setError(data?.error || "طلب التواصل والمعاينة غير موجود");
          }
        }
      } catch (err) {
        // STATE GUARD: Ignore transient network error if already loaded
        if (hasLoadedSuccessfullyRef.current || inquiry !== null) {
          console.warn("[ChatModal] Transient network glitch during polling ignored:", err);
          return;
        }

        failedAttemptsRef.current += 1;
        if (failedAttemptsRef.current >= 2) {
          setError("خطأ في الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت.");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [inquiryId, inquiry]
  );

  // Realtime subscription & Foreground recovery
  useEffect(() => {
    if (!isOpen || !inquiryId) {
      failedAttemptsRef.current = 0;
      return;
    }

    failedAttemptsRef.current = 0;
    fetchMessages(false);

    let channel: any = null;
    try {
      const supabase = createSupabaseClient();
      channel = supabase
        .channel(`inquiry_chat_${inquiryId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "inquiry_messages",
            filter: `inquiry_id=eq.${inquiryId}`,
          },
          (payload: any) => {
            if (payload?.new && payload.new.inquiry_id === inquiryId) {
              const incomingMsg: ChatMessage = {
                id: payload.new.id,
                inquiryId: payload.new.inquiry_id,
                senderId: payload.new.sender_id || "guest",
                senderName: payload.new.sender_name || "عضو",
                senderRole: payload.new.sender_role || "buyer",
                content: payload.new.content,
                createdAt: payload.new.created_at || new Date().toISOString(),
                isAdminNote: Boolean(payload.new.is_admin_note),
              };
              setMessages((prev) => mergeMessages(prev, [incomingMsg]));
              scrollToBottom(true);
              if (incomingMsg.senderId !== currentUserId) {
                playMessageChime();
              }
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Realtime subscription notice:", err);
    }

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 3000);

    const handleResume = () => {
      fetchMessages(true);
      if (channel) {
        try {
          channel.subscribe();
        } catch {}
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleResume);

    let appListenerHandle: { remove: () => void } | null = null;
    try {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          handleResume();
        }
      }).then((handle) => {
        appListenerHandle = handle;
      });
    } catch {}

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleResume);
      if (appListenerHandle) {
        try {
          appListenerHandle.remove();
        } catch {}
      }
      if (channel) {
        try {
          const supabase = createSupabaseClient();
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [isOpen, inquiryId, fetchMessages, scrollToBottom, currentUserId]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom(!loading);
    }
  }, [messages.length, isOpen, loading, scrollToBottom]);

  // Core send function supporting direct action triggers
  const sendMessageDirectly = async (text: string, asAdminNote = false) => {
    if (!text.trim() || sending) return;

    const contentToSend = text.trim();
    const tempId = `temp-${Date.now()}`;
    pausePollingUntilRef.current = Date.now() + 3500;
    setSending(true);

    let safeSenderRole: "buyer" | "seeker" | "owner" | "broker" | "admin" = "buyer";
    if (isSupervisor) {
      safeSenderRole = "admin";
    } else if (isOwner) {
      safeSenderRole = "owner";
    }

    const optimisticMsg: DisplayMessage = {
      id: tempId,
      inquiryId,
      senderId: currentUserId || "me",
      senderName: isSupervisor
        ? "إدارة منصة نبض العقار 🛡️"
        : isBuyer
        ? inquiry?.seekerName || "أنا (المشتري)"
        : "أنا (المالك / المعلن)",
      senderRole: safeSenderRole,
      content: contentToSend,
      createdAt: new Date().toISOString(),
      isAdminNote: isSupervisor && asAdminNote,
      isPending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentToSend,
          isAdminNote: isSupervisor && asAdminNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          return mergeMessages(filtered, [data.message]);
        });
        if (data.inquiry) setInquiry(data.inquiry);
        scrollToBottom(true);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(data.error || "فشل إرسال الرسالة");
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("حدث خطأ في الاتصال أثناء الإرسال");
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText("");
    await sendMessageDirectly(text, isSupervisor && adminNoteMode);
  };

  // Status Updater
  const handleUpdateStatus = async (newStatus: InquiryStatus) => {
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.inquiry) setInquiry(data.inquiry);
        fetchMessages(true);
      }
    } catch (err) {
      console.warn("Could not update status:", err);
    }
  };

  // Buyer Specific Action Handlers
  const handleSendViewingProposal = (dateStr: string) => {
    const text = `📅 طلب موعد معاينة ميدانية:\nأقترح زيارة ومعاينة العقار في موعد: [${dateStr}].\nيرجى تأكيد الموعد ومشاركة تفاصيل التنسيق.`;
    sendMessageDirectly(text);
  };

  const handleSendPriceOffer = (amountStr: string) => {
    const num = Number(amountStr);
    const formatted = !isNaN(num) ? `${num.toLocaleString("ar-EG")} ج.م` : `${amountStr} ج.م`;
    const text = `💰 تقديم سومة / عرض سعر:\nأود تقديم عرض سعر جاد بقيمة [${formatted}] لشراء/استئجار هذا العقار. هل السعر يناسبكم؟`;
    sendMessageDirectly(text);
  };

  // Owner Specific Action Handlers
  const handleConfirmViewing = async () => {
    const text = `✅ تم تأكيد موعد المعاينة!\nنرحب بكم في موقع العقار. يُرجى التواصل قبل الموعد بنصف ساعة للتنسيق الميداني المباشر.`;
    await sendMessageDirectly(text);
    await handleUpdateStatus("viewing_scheduled");
  };

  const handleShareLocation = () => {
    const text = `📍 تفاصيل الموقع والوصول:\nالعقار متاح بالحي المحدد في تفاصيل الإعلان، ويسعدنا استقبالكم في الموعد المحدد للتنسيق المباشر والمرافقة للمعاينة.`;
    sendMessageDirectly(text);
  };

  if (!isOpen) return null;

  const currentStatus = inquiry?.status || "new";
  const statusInfo = INQUIRY_STATUS_CONFIG[currentStatus] || INQUIRY_STATUS_CONFIG.new;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[92vh] max-h-[740px] animate-in zoom-in-95 duration-200">
        
        {/* ========================================================
            1. PRIMARY HEADER (Brand Gradient + Close)
            ======================================================== */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white flex items-center justify-between border-b border-brand-800/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-brand-600/30 border border-brand-400/40 flex items-center justify-center text-brand-300 shrink-0 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-white truncate">
                  شات التواصل والمعاينة المباشر
                </h3>
                {isSupervisor ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold text-[10px] flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>وضع إشراف الإدارة 🛡️</span>
                  </span>
                ) : isOwner ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 font-bold text-[10px]">
                    أنت صاحب الإعلان 👑
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-300 border border-sky-400/40 font-bold text-[10px]">
                    مشتري موثق 👤
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                تحت إشراف وتوثيق منصة نبض العقار الرسمية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================
            2. INTERACTIVE PROPERTY & STATUS CONTEXT BAR
            ======================================================== */}
        <div className="bg-slate-900/95 text-white px-3.5 py-2.5 flex items-center justify-between gap-3 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {inquiry?.propertyImage ? (
              <img
                src={inquiry.propertyImage}
                alt={inquiry.propertyTitle || "عقار"}
                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700 bg-slate-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                <Building2 className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-white text-xs truncate max-w-[180px] sm:max-w-xs">
                  {inquiry?.propertyTitle || "طلب العقار"}
                </h4>
                {inquiry?.propertyPrice ? (
                  <span className="text-emerald-400 font-extrabold text-[11px] shrink-0 font-mono">
                    {inquiry.propertyPrice.toLocaleString("ar-EG")} ج.م
                  </span>
                ) : null}
              </div>

              {/* Status Pill Indicator */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${statusInfo.badgeClass}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>{statusInfo.label}</span>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">• {statusInfo.desc}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Property Page in New Tab */}
            {(inquiry?.propertySlug || inquiry?.propertyId) && (
              <a
                href={`/properties/${inquiry.propertySlug || inquiry.propertyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                title="فتح صفحة العقار في نافذة جديدة"
              >
                <span>معاينة العقار</span>
                <ExternalLink className="w-3 h-3 text-emerald-400" />
              </a>
            )}

            {/* Status Update Trigger for Owner / Admin */}
            {(isOwner || isSupervisor) && (
              <button
                type="button"
                onClick={() => setShowStatusModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-black flex items-center gap-1 shadow-xs transition cursor-pointer"
                title="تحديث حالة ومرحلة الطلب"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">تحديث الحالة</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            3. SUPERVISORY ADVISORY & SECURITY BANNER
            ======================================================== */}
        <div className="bg-amber-50/90 border-b border-amber-200/90 px-3.5 py-2 text-[11px] font-bold text-amber-950 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="leading-snug">
              تشرف إدارة المنصة على المحادثة. <strong>تنبيه:</strong> لا تدفع أي عربون قبل المعاينة الفعلية وفحص سند الملكية.
            </span>
          </div>
          <button
            onClick={() => fetchMessages(false)}
            className="text-[10px] text-amber-900 hover:text-black font-black flex items-center gap-1 shrink-0 underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>تحديث</span>
          </button>
        </div>

        {/* ========================================================
            4. CLIENT LEAD INFORMATION BAR (For Owner & Admin)
            ======================================================== */}
        {inquiry && (isOwner || isSupervisor) && (
          <div className="bg-slate-100/90 border-b border-slate-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 font-black text-slate-900">
                <User className="w-3.5 h-3.5 text-brand-600" />
                <span>العميل: {inquiry.seekerName || "زائر مهتم"}</span>
              </span>

              {inquiry.seekerPhone && (
                <span className="flex items-center gap-1 font-bold text-slate-700 font-mono text-[11px]" dir="ltr">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{inquiry.seekerPhone}</span>
                </span>
              )}

              {inquiry.preferredContact && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                  المفضل: {inquiry.preferredContact === "whatsapp" ? "واتساب" : inquiry.preferredContact === "call" ? "اتصال" : "رسائل"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {inquiry.seekerPhone && (
                <>
                  <a
                    href={`tel:${inquiry.seekerPhone.replace(/[^0-9+]/g, "")}`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] shadow-2xs transition active:scale-95"
                    title="اتصال هاتفي مباشر بالعميل"
                  >
                    <Phone className="w-3 h-3 text-brand-300" />
                    <span>اتصال</span>
                  </a>
                  <a
                    href={`https://wa.me/${inquiry.seekerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `مرحباً ${inquiry.seekerName || ""}، بخصوص طلبك واستفسارك عن العقار "${inquiry.propertyTitle || ""}" على منصة نبض العقار.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] shadow-2xs transition active:scale-95"
                    title="محادثة واتساب مباشرة"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>واتساب</span>
                  </a>
                </>
              )}
            </div>
          </div>
        )}

        {/* Initial Inquiry Note Box */}
        {inquiry?.message && (
          <div className="bg-emerald-50/70 border-b border-emerald-200/80 px-3.5 py-2 text-xs text-slate-800 shrink-0">
            <div className="flex items-center gap-1.5 text-emerald-800 font-black text-[11px] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>طلب الاستفسار والمعاينة الأولي:</span>
              <span className="text-[10px] text-emerald-700/80 font-normal mr-auto">
                {inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString("ar-SA") : ""}
              </span>
            </div>
            <p className="text-slate-800 bg-white/90 p-2 rounded-xl border border-emerald-200/60 font-medium leading-relaxed text-[11px] shadow-2xs">
              "{inquiry.message}"
            </p>
          </div>
        )}

        {/* ========================================================
            5. MESSAGE TIMELINE STREAM
            ======================================================== */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-slate-50/70 text-xs">
          {loading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="font-medium text-xs">جاري تحميل رسائل المحادثة...</p>
            </div>
          ) : error && messages.length === 0 ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-center space-y-3 my-8">
              <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-bold text-sm">{error}</p>
              <button
                type="button"
                onClick={() => {
                  failedAttemptsRef.current = 0;
                  setError(null);
                  fetchMessages(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <MessageCircle className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600">لا توجد رسائل سابقة</p>
              <p className="text-[11px]">ابدأ بكتابة استفسارك أو طلب موعد للمعاينة الميدانية.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.senderRole === "admin" || msg.isAdminNote;
              const isBuyerMsg = msg.senderRole === "buyer" || msg.senderRole === "seeker";

              // Special Admin Supervisory Bubble
              if (isAdmin) {
                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-xs text-slate-900 my-2 max-w-lg mx-auto"
                  >
                    <div className="flex items-center gap-1.5 text-amber-800 font-black text-[11px] mb-1">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>{msg.senderName || "إشراف إدارة نبض العقار 🛡️"}</span>
                      <span className="text-[10px] text-amber-600/70 font-normal mr-auto">
                        {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed font-semibold text-amber-950 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBuyerMsg ? "items-start" : "items-end"} max-w-[85%] ${
                    isBuyerMsg ? "mr-auto" : "ml-auto"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isBuyerMsg
                          ? "bg-brand-100 text-brand-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isBuyerMsg ? "المشتري / الباحث" : "المالك / الوسيط"}
                    </span>
                    <span className="font-bold text-[11px] text-slate-700">{msg.senderName}</span>

                    {msg.isPending ? (
                      <span className="flex items-center gap-1 text-[10px] text-brand-600 font-medium animate-pulse">
                        <Clock className="w-2.5 h-2.5" />
                        <span>جاري الإرسال...</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl shadow-xs text-xs leading-relaxed transition-opacity ${
                      msg.isPending ? "opacity-80" : "opacity-100"
                    } ${
                      isBuyerMsg
                        ? "bg-brand-600 text-white rounded-br-none"
                        : "bg-white text-slate-900 border border-slate-200 rounded-bl-none"
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

        {/* ========================================================
            6. ROLE-TAILORED ACTION TOOLS & SMART CHIPS
            ======================================================== */}
        <div className="bg-white border-t border-slate-200 px-3.5 py-2 space-y-2">
          
          {/* A. Buyer Action Tools */}
          {isBuyer && !isSupervisor && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setShowViewingModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[11px] shadow-xs shrink-0 transition active:scale-95 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>طلب موعد معاينة 📅</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOfferModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] shadow-xs shrink-0 transition active:scale-95 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>تقديم سومة / عرض سعر 💰</span>
              </button>

              {[
                "هل العقار متاح للمعاينة اليوم؟",
                "هل الأوراق والتراخيص جاهزة ونظامية؟",
                "هل يمكن تزويدي بفيديو تفصيلي؟",
                "هل السعر نهائي أم قابل للتفاوض؟",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessageDirectly(chip)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium text-[11px] whitespace-nowrap shrink-0 transition cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* B. Owner Action Tools */}
          {isOwner && !isSupervisor && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={handleConfirmViewing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] shadow-xs shrink-0 transition active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>تأكيد موعد المعاينة ✅</span>
              </button>

              <button
                type="button"
                onClick={handleShareLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] shadow-xs shrink-0 transition active:scale-95 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>تفاصيل الموقع 📍</span>
              </button>

              {[
                "العقار متاح للمعاينة، متى يناسبك الحضور؟",
                "السعر قابل للتفاوض البسيط للجادين.",
                "الأوراق ورخصة البناء مستوفاة ومتاحة للاطلاع.",
                "الوحدة شاغرة وجاهزة للاستلام الفوري.",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessageDirectly(chip)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium text-[11px] whitespace-nowrap shrink-0 transition cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* C. Admin Supervisory Action Tools */}
          {isSupervisor && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="flex items-center gap-1.5 font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminNoteMode}
                    onChange={(e) => setAdminNoteMode(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span>إرسال كتنبيه إداري إشرافي رسمي (Official Supervisory Note)</span>
                </label>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {[
                  { label: "⚠️ تحذير عدم دفع عربون", text: "⚠️ تنبيه من إدارة المنصة: يرجى عدم تحويل أي مبالغ مالية أو دفع عربون إلا بعد إتمام المعاينة الميدانية وفحص سندات الملكية." },
                  { label: "🛡️ متابعة إشرافية", text: "🛡️ تنويه إداري: نرحب بالطرفين، إدارة منصة نبض العقار تشرف على هذا الطلب لضمان سرعة الاستجابة وحماية حقوق الطرفين." },
                  { label: "⚖️ توثيق العقود", text: "⚖️ توجيه نظامي: نحث الطرفين على توثيق كافة بنود الاتفاق المالي وكتابة العقد الرسمي عبر القنوات المعتمدة." },
                ].map((adv, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessageDirectly(adv.text, true)}
                    className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] whitespace-nowrap shrink-0 transition cursor-pointer"
                  >
                    {adv.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            7. INPUT BAR
            ======================================================== */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-3.5 bg-white border-t border-slate-200">
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
                  : isBuyer
                  ? "اكتب رسالتك للمالك بخصوص المعاينة والسعر..."
                  : "اكتب ردك للعميل بخصوص العقار والموعد..."
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

        {/* ========================================================
            8. MODALS (Viewing Proposal, Price Offer, Status Update)
            ======================================================== */}

        {/* Modal: Request Viewing (For Buyer) */}
        {showViewingModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h4 className="font-black text-sm text-slate-900">طلب موعد معاينة ميدانية</h4>
                </div>
                <button onClick={() => setShowViewingModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">اختر الموعد المقترح:</label>
                {[
                  "اليوم عصراً (4:00 - 6:00 مساءً)",
                  "غداً صباحاً (10:00 - 12:00 ظهراً)",
                  "غداً عصراً (4:00 - 6:00 مساءً)",
                  "نهاية الأسبوع (الجمعة 3:00 عصراً)",
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setViewingDate(opt)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold text-right border transition ${
                      viewingDate === opt
                        ? "bg-purple-50 text-purple-800 border-purple-500 shadow-2xs font-black"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {opt}
                  </button>
                ))}

                <div className="pt-1">
                  <input
                    type="text"
                    value={customViewingDate}
                    onChange={(e) => {
                      setCustomViewingDate(e.target.value);
                      setViewingDate(e.target.value);
                    }}
                    placeholder="أو اكتب موعداً مخصصاً (مثال: يوم الأحد الساعة 5 مساءً)..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSendViewingProposal(viewingDate || customViewingDate || "غداً عصراً");
                    setShowViewingModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-md shadow-purple-700/20 transition active:scale-95"
                >
                  إرسال طلب الموعد للمالك
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewingModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Make Price Offer (For Buyer) */}
        {showOfferModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Tag className="w-4 h-4" />
                  </div>
                  <h4 className="font-black text-sm text-slate-900">تقديم سومة / عرض سعر</h4>
                </div>
                <button onClick={() => setShowOfferModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">المبلغ المقترح (بالجنيه المصري):</label>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="مثال: 1200000"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
                />
                {inquiry?.propertyPrice ? (
                  <p className="text-[11px] text-slate-500">
                    السعر الأصلي المعروض بالإعلان: <strong className="text-slate-800">{inquiry.propertyPrice.toLocaleString("ar-EG")} ج.م</strong>
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={!offerAmount.trim()}
                  onClick={() => {
                    handleSendPriceOffer(offerAmount);
                    setShowOfferModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-600/20 transition active:scale-95 disabled:opacity-50"
                >
                  إرسال العرض للمالك
                </button>
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Update Status (For Owner & Admin) */}
        {showStatusModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-sm text-slate-900">تحديث مرحلة الطلب</h4>
                <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                {[
                  { key: "new", label: "طلب جديد", desc: "بانتظار رد المالك" },
                  { key: "contacted", label: "قيد التواصل 💬", desc: "المحادثة جارية" },
                  { key: "viewing_scheduled", label: "موعد معاينة محدد 📅", desc: "تم تأكيد موعد المعاينة" },
                  { key: "negotiating", label: "قيد التفاوض 🤝", desc: "تفاوض على السعر والشروط" },
                  { key: "deal_closed", label: "تم الاتفاق والصفقة 🎉", desc: "إتمام الصفقة بنجاح" },
                  { key: "closed", label: "مكتمل / مغلق 🔒", desc: "إنهاء هذا الطلب" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      handleUpdateStatus(item.key as InquiryStatus);
                      setShowStatusModal(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-right border transition flex items-center justify-between ${
                      inquiry?.status === item.key
                        ? "bg-emerald-50 text-emerald-800 border-emerald-500 font-black"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-bold"
                    }`}
                  >
                    <div>
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                    </div>
                    {inquiry?.status === item.key && <CheckCheck className="w-4 h-4 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
