"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

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
          seekerName,
          seekerPhone,
          seekerEmail,
          message,
          preferredContact,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "تعذر إرسال الطلب، يرجى المحاولة لاحقاً.");
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <h5 className="font-bold text-emerald-900 text-xs">تم إرسال طلبك بنجاح!</h5>
        <p className="text-[11px] text-emerald-700">
          تم إشعار المعلن بطلبك، وسيتواصل معك عبر وسيلة الاتصال المفضلة.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block font-bold text-slate-700 mb-1">الاسم بالكامل *</label>
        <input
          type="text"
          required
          placeholder="مثال: أحمد عبد الله"
          value={seekerName}
          onChange={(e) => setSeekerName(e.target.value)}
          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">رقم الهاتف *</label>
        <input
          type="tel"
          required
          placeholder="+201xxxxxxxxx"
          value={seekerPhone}
          onChange={(e) => setSeekerPhone(e.target.value)}
          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
        <input
          type="email"
          placeholder="yourname@example.com"
          value={seekerEmail}
          onChange={(e) => setSeekerEmail(e.target.value)}
          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
        />
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">وسيلة الاتصال المفضلة</label>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="preferredContact"
              value="call"
              checked={preferredContact === "call"}
              onChange={() => setPreferredContact("call")}
              className="text-brand-600 focus:ring-brand-500"
            />
            <span className="font-semibold text-slate-700">مكالمة هاتفية</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="preferredContact"
              value="whatsapp"
              checked={preferredContact === "whatsapp"}
              onChange={() => setPreferredContact("whatsapp")}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-semibold text-slate-700">واتساب</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">الرسالة</label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جاري الإرسال...</span>
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>إرسال طلب التواصل</span>
          </>
        )}
      </button>
    </form>
  );
}
