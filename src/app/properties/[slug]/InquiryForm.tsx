"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2, Phone, MessageCircle, Mail } from "lucide-react";

import InquiryChatModal from "@/components/chat/InquiryChatModal";

interface InquiryFormProps {
  propertyId: string;
  propertyTitle: string;
}

export default function InquiryForm({ propertyId, propertyTitle }: InquiryFormProps) {
  const [seekerName, setSeekerName] = useState("");
  const [seekerPhone, setSeekerPhone] = useState("");
  const [seekerEmail, setSeekerEmail] = useState("");
  const [message, setMessage] = useState("مرحباً، أنا مهتم بهذا العقار وأود تحديد موعد للمعاينة والاستفسار عن تفاصيل إضافية.");
  const [preferredContact, setPreferredContact] = useState<"call" | "whatsapp" | "email">("call");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInquiryId, setCreatedInquiryId] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          propertyTitle,
          seekerName: seekerName.trim(),
          seekerPhone: seekerPhone.trim(),
          seekerEmail: seekerEmail.trim(),
          message: message.trim(),
          preferredContact,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        if (data.inquiry?.id) {
          setCreatedInquiryId(data.inquiry.id);
        }
      } else {
        setError(data.error || "تعذر إرسال الطلب، يرجى المحاولة لاحقاً.");
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-center space-y-3.5 animate-in fade-in zoom-in-95">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h5 className="font-black text-slate-900 text-sm">تم إرسال طلب التواصل والمعاينة بنجاح!</h5>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            تم فتح شات خاص مباشر بينك وبين المعلن لترتيب موعد المعاينة والاستفسار، تحت إشراف ومتابعة كاملة من إدارة منصة نبض العقار لضمان الأمان والجدية.
          </p>
        </div>

        {createdInquiryId && (
          <button
            type="button"
            onClick={() => setShowChatModal(true)}
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>فتح الشات الخاص للمعاينة الآن 💬</span>
          </button>
        )}

        <div className="pt-1">
          <button
            onClick={() => {
              setSuccess(false);
              setMessage("مرحباً، أود استفساراً إضافياً بخصوص العقار.");
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline transition-colors"
          >
            إرسال طلب أو استفسار آخر
          </button>
        </div>

        {createdInquiryId && (
          <InquiryChatModal
            inquiryId={createdInquiryId}
            isOpen={showChatModal}
            onClose={() => setShowChatModal(false)}
            currentUserRole="buyer"
          />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block font-bold text-slate-700 mb-1">الاسم بالكامل *</label>
        <input
          type="text"
          required
          placeholder="مثال: مصطفى محمود"
          value={seekerName}
          onChange={(e) => setSeekerName(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">رقم الهاتف أو الواتساب *</label>
        <input
          type="tel"
          required
          placeholder="010xxxxxxxx"
          value={seekerPhone}
          onChange={(e) => setSeekerPhone(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني (اختياري)</label>
        <input
          type="email"
          placeholder="yourname@gmail.com"
          value={seekerEmail}
          onChange={(e) => setSeekerEmail(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1.5">وسيلة التواصل المفضلة</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: "call", label: "مكالمة هاتفية", icon: Phone },
            { id: "whatsapp", label: "واتساب", icon: MessageCircle },
            { id: "email", label: "إيميل", icon: Mail },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = preferredContact === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreferredContact(item.id as any)}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-brand-50 text-brand-700 border-brand-300 font-black shadow-xs ring-1 ring-brand-500/30"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-brand-600" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">الرسالة أو الاستفسار</label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all leading-relaxed"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-600/25 transition-all cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جاري إرسال طلبك...</span>
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>إرسال طلب التواصل والمعاينة</span>
          </>
        )}
      </button>
    </form>
  );
}
