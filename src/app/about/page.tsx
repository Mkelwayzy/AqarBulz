"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  MapPin,
  ShieldCheck,
  Building2,
  Users,
  Target,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Lock,
  EyeOff,
  AlertTriangle,
  Scale,
  Phone,
  HelpCircle,
} from "lucide-react";
import type { CmsHomepageSettings, CmsStaticPage } from "@/lib/db/types";

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState<"overview" | "terms" | "privacy">("overview");
  const [cmsPage, setCmsPage] = useState<CmsStaticPage | null>(null);
  const [pageUnavailable, setPageUnavailable] = useState(false);
  const [siteName, setSiteName] = useState("دار العقار");

  useEffect(() => {
    Promise.all([
      fetch("/api/cms/pages/about", { cache: "no-store" }).then((response) => {
        if (response.status === 404) {
          setPageUnavailable(true);
          return null;
        }
        return response.ok ? response.json() : null;
      }),
      fetch("/api/cms/homepage", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
    ])
      .then(([pageData, settingsData]) => {
        if (pageData?.page) setCmsPage(pageData.page);
        const settings = settingsData?.settings as CmsHomepageSettings | undefined;
        if (settings?.visualIdentity?.siteName) setSiteName(settings.visualIdentity.siteName);
      })
      .catch((error: unknown) => console.error("[AboutPage] CMS content load failed:", error));
  }, []);

  // Read URL hash on mount if user arrived via #terms or #privacy
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash === "terms" || hash === "privacy") {
        setActiveSection(hash as "terms" | "privacy");
      }
    }
  }, []);

  if (pageUnavailable) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center font-bold text-slate-600">هذه الصفحة غير منشورة حالياً.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Hero Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-xs font-black">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span>بوابة منصة {siteName}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {cmsPage?.titleAr || <>عن منصة <span className="text-brand-600">{siteName}</span></>}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            {cmsPage?.contentAr || `منصة ${siteName} تربط الباحثين بالملاك والوسطاء العقاريين المعتمدين باستخدام الخرائط المكانية والتحقق الموثوق وحماية خصوصية المواقع.`}
          </p>

          {/* Quick Section Switcher Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveSection("overview")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-xs ${
                activeSection === "overview"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>نبذة ورؤية المنصة</span>
            </button>

            <button
              onClick={() => setActiveSection("terms")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-xs ${
                activeSection === "terms"
                  ? "bg-purple-600 text-white"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>الشروط والأحكام التنظيمية</span>
            </button>

            <button
              onClick={() => setActiveSection("privacy")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-xs ${
                activeSection === "privacy"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>سياسة الخصوصية وأمن البيانات</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: Overview & Pillars */}
        {(activeSection === "overview" || activeSection === "terms" || activeSection === "privacy") && (
          <div className="space-y-8">
            {/* Show Pillars on overview */}
            {activeSection === "overview" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900">دقة مكانية وجغرافية</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      نعتمد على خرائط تفاعلية متطورة وتحليلات مكانية دقيقة للمناطق والأحياء والقرى في مركز ومدينة ميت غمر ومحافظة الدقهلية.
                    </p>
                  </div>

                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900">أمان وحماية الخصوصية</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      حماية تامة لعناوين العقارات عبر خوارزمية التشويش الذكي للمواقع التقريبية، ومراجعة صارمة للإعلانات ضد التكرار والتضليل.
                    </p>
                  </div>

                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Target className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900">محرك البحث الجغرافي</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      محرك بحث تفاعلي يتيح استكشاف العقارات جغرافياً وتصفيتها بدقة عالية للوصول إلى العقار المناسب بكل سهولة.
                    </p>
                  </div>
                </div>

                {/* Mission Details */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xs space-y-6">
                  <div className="space-y-2 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-black text-slate-900">رسالتنا في السوق العقاري المصري</h2>
                    <p className="text-xs text-slate-500">تمكين أطراف المعادلة العقارية بأدوات تقنية تليق بتطور السوق</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed font-medium">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                        <p>
                          القضاء على الإعلانات العشوائية والوهمية من خلال الفحص المستمر والتدقيق الإداري لكل عقار قبل اعتماده على الخريطة.
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                        <p>
                          إتاحة قناة تواصل مباشرة وموثوقة بين الباحثين والملاك والوسطاء العقاريين المرخصين دون تعقيدات أو رسوم خفية.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                        <p>
                          توفير بيانات شفافة حول الأسعار ومتوسط سعر المتر في أحياء وقرى مركز ميت غمر.
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                        <p>
                          تطوير مستمر للمنصة بإشراف نخبة من المطورين والخبراء العقاريين لتلبية متطلبات السوق العصري في مصر.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* SECTION 2: TERMS AND CONDITIONS (Integrated) */}
            <div
              id="terms"
              className={`bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xs space-y-6 transition-all ${
                activeSection === "terms" ? "ring-2 ring-purple-500/20 border-purple-200" : ""
              }`}
            >
              <div className="space-y-2 border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
                    <FileText className="w-4 h-4" />
                    <span>الشروط والأحكام التنظيمية</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">شروط الاستخدام والإعلان العقاري</h2>
                  <p className="text-xs text-slate-500">الضوابط الحاكمة لكافة المعاملات ونشر الإعلانات على المنصة في مصر</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                  سارية لعام 2026
                </span>
              </div>

              <div className="space-y-6 text-xs text-slate-700 leading-relaxed font-medium">
                {/* Rule 1 */}
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    <span>1. معايير نشر الإعلانات العقارية ومكافحة التضليل</span>
                  </h3>
                  <p>
                    يلتزم المعلن (مالك أو وسيط عقاري) بتقديم بيانات دقيقة ومستندات داعمة عند الحاجة. تحتفظ المنصة بالحق الكامل في تعليق أو حذف أي إعلان يتضمن:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pr-4 text-slate-600">
                    <li>أسعار وهمية أو ترويجية لا تعكس قيمة المعاملة الفعلية بالجنيه المصري.</li>
                    <li>إحداثيات جغرافية غير صحيحة أو تكرار الإعلان بصور مضللة في أكثر من موقع.</li>
                    <li>عدم وجود صفة قانونية واضحة للمعلن أو غياب رخصة الوساطة العقارية عند الطلب.</li>
                    <li>أي محتوى يخل بآداب التعامل أو يخالف القوانين المنظمة للقطاع العقاري في جمهورية مصر العربية.</li>
                  </ul>
                </div>

                {/* Rule 2 */}
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>2. مسؤولية التعاقدات المالية والتوثيق الرسمي</span>
                  </h3>
                  <p>
                    تعد منصة <strong>دار العقار</strong> بيئة تقنية متقدمة للاستكشاف الجغرافي والربط المباشر، ولا تعتبر طرفاً في التعاقد المالي أو استلام مقدمات حجز نقدية:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pr-4 text-slate-600">
                    <li>يتعين على أطراف المعاملة إجراء الفحص النافي للجهالة القانوني والتأكد من أوراق الملكية قبل سداد أي مبالغ.</li>
                    <li>يتم إتمام وتوثيق كافة المعاملات النهائية بمأموريات الشهر العقاري والتوثيق المعنية وفق القانون المصري.</li>
                  </ul>
                </div>

                {/* Rule 3 */}
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-600" />
                    <span>3. حسابات الوسطاء والملاك والتزامات الاعتماد</span>
                  </h3>
                  <p>
                    تخضع إعلانات الملاك والوسطاء لسياسة المراجعة الإدارية المسبقة (Pending Review) قبل اعتماد ظهورها على الخريطة العامة لضمان أعلى مستويات الثقة والمصداقية لكافة الزوار.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3: PRIVACY & DATA SECURITY (Integrated) */}
            <div
              id="privacy"
              className={`bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xs space-y-6 transition-all ${
                activeSection === "privacy" ? "ring-2 ring-blue-500/20 border-blue-200" : ""
              }`}
            >
              <div className="space-y-2 border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>حماية البيانات والخصوصية الجغرافية</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">سياسة الخصوصية وأمن البيانات</h2>
                  <p className="text-xs text-slate-500">معايير حماية سرية المستخدمين وعناوين العقارات على الخريطة التفاعلية</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                  امتثال قانون 151/2020
                </span>
              </div>

              <div className="space-y-6 text-xs text-slate-700 leading-relaxed font-medium">
                {/* Privacy Pillar 1 */}
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-blue-600" />
                    <span>1. خصوصية الموقع الجغرافي للعقارات (Geospatial Privacy)</span>
                  </h3>
                  <p>
                    تطبق منصة دار العقار نظام تشويش مكاني ذكي لحماية خصوصية مساكن الملاك:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pr-4 text-slate-600">
                    <li>عند اختيار "الموقع التقريبي"، يتم إخفاء الإحداثيات الفعلية تماماً عن الاستجابات البرمجية العامة (API Redaction).</li>
                    <li>يتم إظهار دائرة تقريبية بنطاق 50 مترًا على الخريطة دون كشف رقم المبنى أو العنوان الدقيق.</li>
                    <li>لا يُكشف العنوان الدقيق إلا بعد تواصل مباشر وموافقة معلنة لترتيب المعاينة الفعلية.</li>
                  </ul>
                </div>

                {/* Privacy Pillar 2 */}
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span>2. جمع وحفظ البيانات الشخصية بأمان</span>
                  </h3>
                  <p>
                    نجمع فقط البيانات الأساسية اللازمة للتحقق والتواصل العقاري (الاسم، رقم الهاتف، والبريد الإلكتروني):
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pr-4 text-slate-600">
                    <li>تُشفّر بيانات الاعتماد وكلمات المرور ولا يمكن لأي موظف الاطلاع عليها.</li>
                    <li>لا نبيع أو نشارك بيانات المستخدمين مع أي شركات تسويق خارجية.</li>
                    <li>يحق لأي مستخدم تعديل بياناته أو طلب حذف حسابه من خلال لوحة حسابه الشخصي في أي وقت.</li>
                  </ul>
                </div>

                {/* Privacy Pillar 3 */}
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>3. الامتثال لقانون حماية البيانات الشخصية المصري</span>
                  </h3>
                  <p>
                    تخضع كافة معالجات البيانات لأحكام قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020، وقواعد الجهاز القومي لتنظيم الاتصالات والمعايير الدولية للأمن السيبراني.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA / Quick Contact */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-right">
            <h3 className="text-lg font-black">هل لديك استفسار إضافي أو ترغب في التواصل معنا؟</h3>
            <p className="text-xs text-slate-300 max-w-lg">
              فريق دعم منصة دار العقار جاهز للإجابة على تساؤلات الملاك والمستثمرين والوسطاء في جميع أنحاء مصر.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
            >
              <Phone className="w-4 h-4" />
              <span>تواصل مع الدعم الفني</span>
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>استكشف الخريطة</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
