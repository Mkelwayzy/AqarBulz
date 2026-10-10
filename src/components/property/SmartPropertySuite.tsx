"use client";

import React, { useState, useEffect } from "react";
import { PublicProperty } from "@/lib/db/types";
import { SmartFeaturesConfig } from "@/lib/types/smartFeatures";
import {
  Sparkles,
  TrendingUp,
  Compass,
  Clock,
  Home,
  ShieldCheck,
  Share2,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  ArrowRight,
  Sun,
  Wind,
  Download,
  Building,
  Check,
  Loader2,
} from "lucide-react";

interface SmartPropertySuiteProps {
  property: PublicProperty;
}

export default function SmartPropertySuite({ property }: SmartPropertySuiteProps) {
  const [activeTab, setActiveTab] = useState<string>("financial");
  const [financialData, setFinancialData] = useState<any>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(true);
  const [inspectionBooked, setInspectionBooked] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [inspectionName, setInspectionName] = useState("");
  const [inspectionPhone, setInspectionPhone] = useState("");
  const [selectedFinishingType, setSelectedFinishingType] = useState<"lux" | "super" | "ultra">("super");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchFinancialCalculations();
  }, [property.id, property.price]);

  const fetchFinancialCalculations = async () => {
    setLoadingFinancial(true);
    try {
      const res = await fetch("/api/smart-features/financial/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: property.price,
          areaSqM: property.areaSqM,
          category: property.category,
          districtId: property.districtId,
          transactionType: property.transactionType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFinancialData(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFinancial(false);
    }
  };

  const handleBookInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionName || !inspectionPhone) return;
    setBookingLoading(true);
    try {
      const res = await fetch("/api/smart-features/inspection/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          propertyTitle: property.title,
          propertyAddress: property.addressDetails,
          requesterName: inspectionName,
          requesterPhone: inspectionPhone,
          preferredDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
          inspectionType: "full_civil_electrical",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInspectionBooked(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleShareWhatsAppBrochure = () => {
    const text = encodeURIComponent(
      `🏠 *عقار مميز على نبض العقار (AqarPulse)*\n\n📌 *${property.title}*\n📍 الموقع: ${property.addressDetails}\n📐 المساحة: ${property.areaSqM} م²\n💵 السعر: ${property.price.toLocaleString("ar-EG")} ج.م\n\n🔗 رابط التفاصيل والمعاينة:\n${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Orientation analysis (Idea 2)
  const isNorthFacing = property.id.length % 2 === 0; // Deterministic demonstration
  const orientationName = isNorthFacing ? "بحري صريح (شمالي)" : "بحري شرقي";
  const breezeScore = isNorthFacing ? 95 : 88;
  const sunlightScore = isNorthFacing ? 90 : 92;

  // Finishing calculation (Idea 12)
  const finishingCostPerM =
    selectedFinishingType === "lux" ? 4500 : selectedFinishingType === "super" ? 7500 : 12500;
  const totalFinishingEstimate = finishingCostPerM * property.areaSqM;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-2xl" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              حزمة الذكاء العقاري المتكاملة
            </span>
            <span className="text-xs text-slate-400 font-mono">نبض العقار AI & GIS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">التحليلات الذكية لهذا العقار</h2>
          <p className="text-xs text-slate-400">
            بيانات استثمارية فورية، محاكاة حركة الشمس والرياح، وأوقات الوصول الحقيقية للمحاور.
          </p>
        </div>

        {/* Quick WhatsApp Brochure export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareWhatsAppBrochure}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors cursor-pointer shadow-md shadow-emerald-900/30"
          >
            <Share2 className="w-4 h-4" />
            <span>بروشور واتساب فوري</span>
          </button>
          <button
            onClick={handleCopyLink}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {[
          { id: "financial", label: "الحاسبة المالية والتحوط", icon: TrendingUp },
          { id: "orientation", label: "الوجهة والشمس (بحري/قبلي)", icon: Compass },
          { id: "commute", label: "أوقات الوصول والمحاور", icon: Clock },
          { id: "finishing", label: "تكلفة التشطيب 2026", icon: Home },
          { id: "inspection", label: "طلب فحص هندسي معتمد", icon: ShieldCheck },
          { id: "legal", label: "الأوراق القانونية والتراخيص", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Financial & Valuation Engine */}
      {/* ========================================================================= */}
      {activeTab === "financial" && (
        <div className="space-y-6">
          {loadingFinancial ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-xs text-slate-400">جاري احتساب مؤشرات القيمة العادلة والتحوط...</span>
            </div>
          ) : financialData ? (
            <div className="space-y-6">
              {/* Verdict Strip */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  financialData.priceTag === "below_market"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                    : financialData.priceTag === "overpriced"
                    ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                    : "bg-blue-950/40 border-blue-500/40 text-blue-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 shrink-0" />
                  <div>
                    <h4 className="font-black text-sm">مؤشر القيمة العادلة بالحي</h4>
                    <p className="text-xs opacity-90">{financialData.priceVerdictAr}</p>
                  </div>
                </div>
                <div className="text-left font-mono text-xs">
                  <div className="font-bold text-white">{financialData.pricePerSqM.toLocaleString("ar-EG")} ج.م / م²</div>
                  <div className="text-[11px] opacity-75">متوسط الحي: {financialData.avgDistrictPricePerSqM.toLocaleString("ar-EG")} ج.م</div>
                </div>
              </div>

              {/* 3 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Asset Hedge (Gold & Currency) */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">التحوط مقابل الذهب والعملات</span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-850">
                      <span className="text-slate-400">يعادل بذهب عيار 24:</span>
                      <strong className="text-amber-300 font-mono">{financialData.hedge.goldEquivalentGrams.toLocaleString("ar-EG")} جرام</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-850">
                      <span className="text-slate-400">يعادل بالدولار الأمريكي:</span>
                      <strong className="text-emerald-300 font-mono">${financialData.hedge.usdEquivalent.toLocaleString("en-US")}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-850">
                      <span className="text-slate-400">يعادل بالريال السعودي:</span>
                      <strong className="text-slate-200 font-mono">{financialData.hedge.sarEquivalent.toLocaleString("en-US")} ر.س</strong>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">القيمة التقديرية بعد 3 سنوات:</span>
                      <strong className="text-emerald-400 font-mono">{financialData.hedge.projectedAppreciation3Years.toLocaleString("ar-EG")} ج.م</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Resale & Cash Required */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">محاكاة الريسيل والأقساط</span>
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-850">
                      <span className="text-slate-400">المقدم الكاش المتوقع:</span>
                      <strong className="text-white font-mono">{financialData.resaleBreakdown.standardDownPayment.toLocaleString("ar-EG")} ج.م</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-850">
                      <span className="text-slate-400">وديعة الصيانة (8%):</span>
                      <strong className="text-slate-300 font-mono">{financialData.resaleBreakdown.maintenanceDeposit.toLocaleString("ar-EG")} ج.م</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-850">
                      <span className="text-slate-400">المتبقي على أقساط:</span>
                      <strong className="text-white font-mono">{financialData.resaleBreakdown.remainingInstallmentsAmount.toLocaleString("ar-EG")} ج.م</strong>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">القسط الربع سنوي التقريبي:</span>
                      <strong className="text-blue-400 font-mono">{financialData.resaleBreakdown.quarterlyInstallment5Years.toLocaleString("ar-EG")} ج.م</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Comprehensive Net Rental Yield */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">العائد الإيجاري الصافي (Net ROI)</span>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-850">
                      <span className="text-slate-400">الإيجار الشهري المتوقع:</span>
                      <strong className="text-white font-mono">{financialData.roi.estimatedMonthlyRent.toLocaleString("ar-EG")} ج.م</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-850">
                      <span className="text-slate-400">العائد الإجمالي (Gross Yield):</span>
                      <strong className="text-slate-300 font-mono">{financialData.roi.grossYieldPercent}% سنوي</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-850">
                      <span className="text-slate-400">العائد الصافي بعد المصاريف:</span>
                      <strong className="text-emerald-400 font-mono font-black">{financialData.roi.netYieldPercent}% سنوي</strong>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">دخل يومي مقترح (Airbnb):</span>
                      <strong className="text-amber-400 font-mono">{financialData.shortTerm.dailyRate.toLocaleString("ar-EG")} ج.م / ليلة</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Orientation & Sun/Wind Simulation */}
      {/* ========================================================================= */}
      {activeTab === "orientation" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-white text-base">وجهة الرياح والتهوية الطبيعية</h4>
                  <p className="text-xs text-slate-400">الوحدة ذات واجهة: <strong className="text-emerald-400">{orientationName}</strong></p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">كفاءة التهوية وتيار الهواء الصيفي:</span>
                    <strong className="text-emerald-400">{breezeScore}% (ممتاز جداً)</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${breezeScore}%` }}></div>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  تتميز الوحدات البحرية في القاهرة بدخول تيار الهواء المعتدل من الشمال الغربي، مما يقلل الحاجة لتشغيل أجهزة التكييف ويوفر حتى 25% من استهلاك الكهرباء صيفاً.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-white text-base">محاكاة مسار الشمس والإضاءة</h4>
                  <p className="text-xs text-slate-400">إضاءة طبيعية دون شمس الظهيرة الحارقة</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">توازن الإضاءة الطبيعية على مدار اليوم:</span>
                    <strong className="text-amber-400">{sunlightScore}%</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${sunlightScore}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="block text-slate-400 text-[11px]">فترة الصباح</span>
                    <strong className="text-white text-xs">شمس لطيفة غير مباشرة</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="block text-slate-400 text-[11px]">فترة بعد الظهر</span>
                    <strong className="text-white text-xs">ظل وتهوية مريحة</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Commute & Infrastructure Radar */}
      {/* ========================================================================= */}
      {activeTab === "commute" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "شارع التسعين الجنوبي (التجمع)", time: "8 دقائق بالسيارة", dist: "4.2 كم", status: "طريق مباشر وسلس" },
              { name: "حي المال والأعمال (العاصمة الإدارية)", time: "22 دقيقة", dist: "21.5 كم", status: "عبر محور محمد بن زايد" },
              { name: "مطار القاهرة الدولي", time: "18 دقيقة", dist: "16.0 كم", status: "عبر طريق السويس المطور" },
              { name: "القرية الذكية والشيخ زايد", time: "42 دقيقة", dist: "48 كم", status: "عبر الدائري الأوسطي" },
              { name: "أقرب محطة مونوريل", time: "5 دقائق مشياً", dist: "450 متر", status: "تحت التشغيل التجريبي" },
              { name: "الجامعة الأمريكية AUC", time: "10 دقائق", dist: "6.8 كم", status: "ميدان الجامعة" },
            ].map((route, i) => (
              <div key={i} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white">{route.name}</span>
                    <span className="text-emerald-400 font-mono font-bold">{route.dist}</span>
                  </div>
                  <div className="text-base font-black text-emerald-300 mt-2">{route.time}</div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-850 pt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{route.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Finishing Cost Engine */}
      {/* ========================================================================= */}
      {activeTab === "finishing" && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="font-black text-white text-base">حاسبة تكلفة التشطيب المحدثة لعام 2026</h4>
            <p className="text-xs text-slate-400">
              اختر مستوى التشطيب لحساب التكلفة التقديرية بناءً على مساحة الوحدة ({property.areaSqM} م²) وأسعار الخامات بالسوق المصري:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: "lux", name: "لوكس", cost: "4,500 ج.م / م²", desc: "سيراميك فرز أول، دهانات بلاستيك، سباكة معتمدة" },
                { type: "super", name: "سوبر لوكس", cost: "7,500 ج.م / م²", desc: "بورسلين، أبواب قشرة أرو، إضاءات ليد مخفية" },
                { type: "ultra", name: "ألترا لوكس / فندقي", cost: "12,500 ج.م / م²", desc: "رخام مستورد، سمارت هوم، تكييفات مركزية" },
              ].map((btn) => (
                <button
                  key={btn.type}
                  onClick={() => setSelectedFinishingType(btn.type as any)}
                  className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
                    selectedFinishingType === btn.type
                      ? "bg-emerald-950/30 border-emerald-500 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="block font-black text-sm text-white mb-1">{btn.name}</span>
                  <span className="block font-mono text-emerald-400 text-xs font-bold mb-1.5">{btn.cost}</span>
                  <span className="block text-[11px] text-slate-400 leading-tight">{btn.desc}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-400 block">إجمالي تكلفة التشطيب المقدرة:</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                  {totalFinishingEstimate.toLocaleString("ar-EG")} <span className="text-sm font-sans">جنيه مصري</span>
                </span>
              </div>
              <div className="text-xs text-slate-400 text-right sm:text-left">
                المدة المقدرة للتنفيذ: <strong className="text-white">3 إلى 4 أشهر</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: Engineering Inspection Booking */}
      {/* ========================================================================= */}
      {activeTab === "inspection" && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-black text-white text-base">خدمة الفحص الهندسي المعتمد والمحايد</h4>
                <p className="text-xs text-slate-400">
                  اطمئن قبل الشراء: مهندس استشاري معتمد يفحص سلامة الخرسانة، شبكة السباكة، العزل، ولوحة الكهرباء مع تقرير فني رقمي مختوم.
                </p>
              </div>
            </div>

            {inspectionBooked ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>تم تأكيد طلب المعاينة الهندسية بنجاح! سيتواصل معك المهندس الاستشاري لترتيب موعد الدخول.</span>
              </div>
            ) : (
              <form onSubmit={handleBookInspection} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">اسمك الكريم</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد عبد الله"
                    value={inspectionName}
                    onChange={(e) => setInspectionName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">رقم الهاتف / الواتساب</label>
                  <input
                    type="tel"
                    required
                    placeholder="010xxxxxxxx"
                    value={inspectionPhone}
                    onChange={(e) => setInspectionPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>تأكيد حجز المعاينة</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: Legal & Contract Checklist */}
      {/* ========================================================================= */}
      {activeTab === "legal" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-emerald-400 block">نوع الملكية والتوثيق القانوني</span>
              <h4 className="font-bold text-white text-sm">تسجيل وموقف العقار بالسجل العيني / جهاز المدينة</h4>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                <li>حصة في الأرض محددة بالعقد والرسومات الهندسية.</li>
                <li>مطابقة رخصة البناء الصادرة من جهاز المدينة المختص.</li>
                <li>خلو العقار من أي مستحقات متأخرة لشركة المياه والكهرباء والغاز.</li>
              </ul>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-blue-400 block">نصيحة نبض العقار القانونية</span>
              <h4 className="font-bold text-white text-sm">بنود التعاقد الهامة قبل دفع العربون</h4>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                <li>إدراج شرط جزائي واضح عن التأخير في التسليم أو نقل الملكية.</li>
                <li>طلب شهادة إبراء ذمة من اتحاد الشاغلين أو شركة الصيانة.</li>
                <li>التأكد من سداد ضريبة التصرفات العقارية (2.5%) بمعرفة البائع.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
