"use client";

import React, { useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  Bot,
  X,
  Loader2,
  Sparkles,
  Link2,
  Image as ImageIcon,
  Save,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  MessageSquareText,
} from "lucide-react";

interface AnalyzeDraft {
  type: "client" | "broker";
  name: string;
  phone?: string;
  requestedProperty?: string;
  requestedCategory?: string;
  requestedArea?: number;
  requestedPriceRange?: string;
  requestedLocation?: string;
  availableListings?: string;
  listingsCount?: number;
  notes?: string;
  isVerified: boolean;
  createdBy: string;
}

interface AnalyzeResult {
  intent: string;
  confidence: number;
  reasoning?: string;
  missingFields?: string[];
  extraPhones?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function GeminiBotPanel({ open, onClose, onSaved }: Props) {
  const [postUrl, setPostUrl] = useState("");
  const [postText, setPostText] = useState("");
  const [commentsText, setCommentsText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [draft, setDraft] = useState<AnalyzeDraft | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setPostUrl("");
    setPostText("");
    setCommentsText("");
    setImagePreview(null);
    setResult(null);
    setDraft(null);
    setError(null);
  };

  const handleImagePick = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("حجم الصورة كبير — الحد الأقصى 4 ميجابايت");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    if (postText.trim().length < 15 && !imagePreview) {
      setError("الصق نص المنشور (15 حرفاً على الأقل) أو أرفق لقطة شاشة");
      return;
    }
    setError(null);
    setAnalyzing(true);
    setResult(null);
    setDraft(null);
    try {
      const res = await apiFetch("/api/admin/crm/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postUrl: postUrl.trim() || undefined,
          postText: postText.trim(),
          commentsText: commentsText.trim() || undefined,
          imageBase64: imagePreview || undefined,
          imageMimeType: imagePreview?.startsWith("data:image/png") ? "image/png" : "image/jpeg",
          autoSave: false, // دائماً معاينة أولاً — الإدارة تؤكد قبل الحفظ
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحليل");
      setResult(data.analysis);
      setDraft(data.draft || null);
      if (data.duplicateOf) {
        setError(`⚠️ رقم الهاتف موجود مسبقاً في السجل: ${data.duplicateOf}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحليل");
    } finally {
      setAnalyzing(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حفظ السجل");
      onSaved();
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    value: string | number | undefined,
    onChange: (v: string) => void,
    opts?: { type?: string; dir?: string }
  ) => (
    <label className="block">
      <span className="block text-[10px] font-black text-slate-600 mb-1">{label}</span>
      <input
        type={opts?.type || "text"}
        dir={opts?.dir}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4" dir="rtl">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 p-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                بوت Gemini لتحليل المنشورات
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                الصق منشور فيسبوك/إنستا — يحلله ويستخرج بيانات العقار تلقائياً كسجل غير مؤكد
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Step 1: Post URL */}
          <label className="block">
            <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 mb-1">
              <Link2 className="w-3.5 h-3.5 text-indigo-500" />
              رابط المنشور (اختياري — يُسجل كمصدر للمراجعة)
            </span>
            <input
              type="url"
              dir="ltr"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://facebook.com/share/p/..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </label>

          {/* Step 2: Post text */}
          <label className="block">
            <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 mb-1">
              <MessageSquareText className="w-3.5 h-3.5 text-indigo-500" />
              نص المنشور * <span className="text-slate-400 font-bold">(انسخه من فيسبوك والصقه هنا)</span>
            </span>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={5}
              placeholder={'مثال:\n🚨 لل sale شقة 120م بميت غمر\n3 غرف مطبخ مجدد تشطيب سوبر لوكس\nالسعر 850 ألف قابل للتفاوض\nللتواصل 01012345678'}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-y"
            />
          </label>

          {/* Step 3: Comments */}
          <label className="block">
            <span className="text-[11px] font-black text-slate-700 mb-1 block">
              التعليقات (اختياري — يبحث فيها عن أرقام هواتف إضافية)
            </span>
            <textarea
              value={commentsText}
              onChange={(e) => setCommentsText(e.target.value)}
              rows={3}
              placeholder="انسخ التعليقات المهمة هنا..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-y"
            />
          </label>

          {/* Step 4: Screenshot */}
          <div>
            <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 mb-1">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
              لقطة شاشة المنشور (اختيارية — تحسن دقة التحليل)
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleImagePick(e.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>اختر صورة</span>
              </button>
              {imagePreview && (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="معاينة" className="h-10 w-14 object-cover rounded-lg border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="إزالة الصورة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Analyze button */}
          <button
            type="button"
            onClick={runAnalysis}
            disabled={analyzing}
            className="w-full py-3 rounded-2xl bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تحليل المنشور بالذكاء الاصطناعي...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>تحليل بالذكاء الاصطناعي ✨</span>
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Analysis result */}
          {result && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-indigo-900">
                  <Bot className="w-4 h-4" />
                  نتيجة التحليل
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${result.confidence >= 0.75
                      ? "bg-emerald-100 text-emerald-800"
                      : result.confidence >= 0.45
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                >
                  ثقة {Math.round(result.confidence * 100)}%
                </span>
              </div>

              <p className="text-[11px] text-indigo-900 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                التصنيف: {result.intent} — {draft?.type === "client" ? "طلب بحث" : "عرض عقار"}
              </p>
              {result.reasoning && (
                <p className="text-[11px] text-indigo-800/80 leading-relaxed">💡 {result.reasoning}</p>
              )}
              {result.missingFields && result.missingFields.length > 0 && (
                <p className="text-[11px] text-amber-800 font-bold">
                  ⚠️ بيانات ناقصة يُفضل إكمالها: {result.missingFields.join("، ")}
                </p>
              )}
            </div>
          )}

          {/* Editable draft preview */}
          {draft && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-800">مراجعة السجل قبل الحفظ (قابل للتعديل)</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                  سيُحفظ "غير مؤكد" ⏳
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="block text-[10px] font-black text-slate-600 mb-1">النوع</span>
                  <select
                    value={draft.type}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as "client" | "broker" })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="client">طلب بحث (عميل)</option>
                    <option value="broker">عرض عقار (سمسار/معلن)</option>
                  </select>
                </label>
                {field("الاسم", draft.name, (v) => setDraft({ ...draft, name: v }))}
                {field("رقم الهاتف", draft.phone, (v) => setDraft({ ...draft, phone: v }), { dir: "ltr", type: "tel" })}
                {field("التصنيف", draft.requestedCategory, (v) => setDraft({ ...draft, requestedCategory: v }))}
                {field("المساحة (م²)", draft.requestedArea, (v) => setDraft({ ...draft, requestedArea: Number(v) || undefined }), { type: "number" })}
                {field("السعر", draft.requestedPriceRange, (v) => setDraft({ ...draft, requestedPriceRange: v }))}
                {field("الموقع", draft.requestedLocation, (v) => setDraft({ ...draft, requestedLocation: v }))}
              </div>

              <label className="block">
                <span className="block text-[10px] font-black text-slate-600 mb-1">
                  {draft.type === "client" ? "العقار المطلوب" : "وصف العرض المتاح"}
                </span>
                <textarea
                  rows={3}
                  value={draft.type === "client" ? draft.requestedProperty ?? "" : draft.availableListings ?? ""}
                  onChange={(e) =>
                    setDraft(
                      draft.type === "client"
                        ? { ...draft, requestedProperty: e.target.value }
                        : { ...draft, availableListings: e.target.value }
                    )
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y"
                />
              </label>

              <label className="block">
                <span className="block text-[10px] font-black text-slate-600 mb-1">ملاحظات البوت (تُحفظ تلقائياً)</span>
                <textarea
                  rows={2}
                  readOnly
                  value={draft.notes ?? ""}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-100 bg-slate-50 text-[11px] text-slate-600 leading-relaxed resize-none"
                />
              </label>

              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ كسجل غير مؤكد ⏳</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
