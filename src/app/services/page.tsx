"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  Crown,
  TrendingUp,
  FileText,
  Calculator,
  Sparkles,
  Home,
  CheckCircle2,
  ChevronLeft,
  Clock,
  PhoneCall,
  Search,
  Building2,
  Layers,
} from "lucide-react";

export default function ServicesPage() {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [interestSuccess, setInterestSuccess] = useState(false);

  const services = [
    {
      id: "aqar-plus",
      title: "عقار+",
      category: "باقة التميز",
      desc: "مجموعة من الأدوات والخدمات الحصرية للمعلنين والباحثين للاستفادة الكاملة من التطبيق.",
      icon: Crown,
      badge: "اشتراك مميز",
      color: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200",
      features: [
        "فلترة عقارات المالك المباشر",
        "سجل إحصائيات ونشاط الإعلان",
        "ظهور متقدم على خريطة عقار",
        "تنبيهات فورية لطلبات المشترين",
      ],
      price: "يُعلن السعر بالجنيه المصري عند التفعيل",
    },
    {
      id: "promo",
      title: "خدمات الترويج والتسويق",
      category: "تسويق وإعلانات",
      desc: "إبراز إعلانك أو مشروعك في صدارة نتائج البحث لتسريع وتيرة البيع أو التأجير.",
      icon: TrendingUp,
      badge: "تسريع البيع",
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200",
      features: [
        "إعلان مميز في صدارة نتائج البحث",
        "شارة الإعلان المميز باللون الأخضر",
        "إشعار المشترين المهتمين في المنطقة",
        "مشاركة إعلانية على منصات التواصل",
      ],
      price: "يُحدد السعر بالجنيه المصري لكل إعلان",
    },
    {
      id: "inspection",
      title: "فحص وتقييم المباني",
      category: "معاينة هندسية",
      desc: "فحص فني شامل للعقار عبر مهندسين معتمدين للتأكد من السلامة الإنشائية والتشطيبات.",
      icon: ShieldCheck,
      badge: "فحص معتمد",
      color: "from-blue-500/10 to-indigo-500/10 text-blue-700 border-blue-200",
      features: [
        "فحص التمديدات الكهربائية والسباكة",
        "فحص العزل الحراري والرطوبة والتسريبات",
        "فحص الهيكل الخرساني والتشطيبات",
        "تقرير فني رسمي معتمد بنقاط القوة والملاحظات",
      ],
      price: "تقرير فني متكامل معتمد",
    },
    {
      id: "contracts",
      title: "عقود الإيجار والتوثيق الإلكتروني",
      category: "خدمات قانونية وتوثيق",
      desc: "إبرام وتوثيق عقود الإيجار والوساطة إلكترونياً لحفظ حقوق المالك والمستأجر.",
      icon: FileText,
      badge: "توثيق رسمي",
      color: "from-purple-500/10 to-violet-500/10 text-purple-700 border-purple-200",
      features: [
        "عقد إيجار إلكتروني موثق",
        "ربط نظامي لحفظ مستحقات الأطراف",
        "جدولة الدفعات وسندات القبض",
        "تنبيهات تلقائية بمواعيد التجديد",
      ],
      price: "خدمة فورية معتمدة",
    },
    {
      id: "mortgage-calc",
      title: "حاسبة التمويل العقاري",
      category: "استشارات بنكية",
      desc: "محاكاة فورية للأقساط الشهرية، القدرة الشرائية، وأفضل عروض جهات التمويل.",
      icon: Calculator,
      badge: "حاسبة فورية",
      color: "from-cyan-500/10 to-sky-500/10 text-cyan-700 border-cyan-200",
      features: [
        "حساب القسط الشهري بدقة",
        "مقارنة نسب الفائدة التنافسية",
        "احتساب أقصى مبلغ تمويل متاح لراتبك",
        "تنسيق مباشر مع ممثلي التمويل",
      ],
      price: "خدمة استرشادية مجانية",
    },

  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-36 font-sans" dir="rtl">
      {/* 1. Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black text-slate-900 tracking-tight">الخدمات العقارية</h1>
        <div className="w-8" />
      </div>

      {/* 2. Hero Notice */}
      <div className="bg-white border-b border-slate-200 px-4 py-5 shadow-2xs">
        <div className="max-w-lg mx-auto text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-base font-black text-slate-900">منظومة الخدمات والحلول العقارية</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
            تصفح باقات التميز، خدمات التوثيق والفحص المعتمد، وحلول الترويج العقاري المصممة لتسهيل صفقاتك العقارية.
          </p>
        </div>
      </div>

      {/* 3. Services Grid */}
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {interestSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تم استلام طلبك للخدمة بنجاح! سيتواصل معك فريق الدعم قريباً.</span>
          </div>
        )}

        <div className="space-y-3">
          {services.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all space-y-3"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${srv.color} flex items-center justify-center shrink-0 border`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">{srv.title}</h3>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {srv.badge}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">{srv.category}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {srv.desc}
                </p>

                {/* Features list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-700">
                  {srv.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom Action Row */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs font-black text-emerald-700">{srv.price}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedService(srv.title);
                      setInterestSuccess(true);
                      setTimeout(() => setInterestSuccess(false), 5000);
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-black text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    <span>طلب الخدمة</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
