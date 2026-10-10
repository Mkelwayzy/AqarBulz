"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { SmartFeaturesConfig } from "@/lib/types/smartFeatures";
import {
  Sparkles,
  TrendingUp,
  Compass,
  LayoutGrid,
  ShieldCheck,
  Cpu,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Clock,
  Home,
  Check,
  RefreshCw,
} from "lucide-react";

export default function SmartFeaturesAdminPage() {
  const [config, setConfig] = useState<SmartFeaturesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/smart-features/config");
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("فشل جلب إعدادات المنظومة الذكية");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof SmartFeaturesConfig["features"]) => {
    if (!config) return;
    setConfig({
      ...config,
      features: {
        ...config.features,
        [key]: !config.features[key],
      },
    });
  };

  const handleFinancialChange = (key: keyof SmartFeaturesConfig["financialParams"], val: number) => {
    if (!config) return;
    setConfig({
      ...config,
      financialParams: {
        ...config.financialParams,
        [key]: val,
      },
    });
  };

  const handleFinishingChange = (key: keyof SmartFeaturesConfig["finishingParams"], val: number) => {
    if (!config) return;
    setConfig({
      ...config,
      finishingParams: {
        ...config.finishingParams,
        [key]: val,
      },
    });
  };

  const handleInspectionChange = (key: keyof SmartFeaturesConfig["inspectionParams"], val: number) => {
    if (!config) return;
    setConfig({
      ...config,
      inspectionParams: {
        ...config.inspectionParams,
        [key]: val,
      },
    });
  };

  const handleMortgageChange = (key: keyof SmartFeaturesConfig["mortgageParams"], val: number) => {
    if (!config) return;
    setConfig({
      ...config,
      mortgageParams: {
        ...config.mortgageParams,
        [key]: val,
      },
    });
  };

  const saveChanges = async () => {
    if (!config) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/smart-features/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("تم حفظ كافة تعديلات المنظومة الذكية وتطبيقها بنجاح!");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || "حدث خطأ أثناء الحفظ");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "فشل الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdminNav />
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-slate-400 font-bold">جاري تحميل إعدادات المنظومة الذكية...</p>
        </div>
      </div>
    );
  }

  const stages = [
    { id: 1, name: "المرحلة 1: المحرك المالي والاستثماري", icon: TrendingUp },
    { id: 2, name: "المرحلة 2: الذكاء المكاني والبيئي", icon: Compass },
    { id: 3, name: "المرحلة 3: تجربة المستخدم والمقارنات", icon: LayoutGrid },
    { id: 4, name: "المرحلة 4: منظومة الثقة والأمان", icon: ShieldCheck },
    { id: 5, name: "المرحلة 5: الذكاء الاصطناعي وجولات الفيديو", icon: Cpu },
    { id: 6, name: "المرحلة 6: بوابات الشركاء والبيانات الضخمة", icon: Layers },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8" dir="rtl">
      <AdminNav />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                مركز القيادة والتحكم الشامل
              </span>
              <span className="text-xs text-slate-400 font-mono">30 ميزة ذكية نشطة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">إدارة المنظومة الذكية (Smart Features Hub)</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              تحكم كامل في تفعيل أو إيقاف أي فكرة من الأفكار الـ 30 بضغطة زر، مع إمكانية تعديل الأسعار، ومعدلات التضخم، ومؤشرات السوق فورياً.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveChanges}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ جميع التعديلات</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Sprints Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {stages.map((st) => {
          const Icon = st.icon;
          const isActive = activeTab === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setActiveTab(st.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                  : "bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{st.name}</span>
            </button>
          );
        })}
      </div>

      {/* Sprint Content Body */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8">
        {/* ========================================================================= */}
        {/* STAGE 1: Financial & Valuation Engine */}
        {/* ========================================================================= */}
        {activeTab === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black text-white">المرحلة 1: المحرك المالي والاستثماري (الأفكار 6 - 10)</h2>
              <p className="text-xs text-slate-400 mt-1">
                أدوات التحوط من التضخم، حاسبات الأوفر برايس، تقدير القيمة العادلة، وحسابات العائد الصافي.
              </p>
            </div>

            {/* Feature Toggles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "inflationHedgeCalculator", title: "مؤشر التحوط ضد التضخم ومقارنة الذهب", desc: "يقارن الاستثمار بالعقار مقابل الذهب وشهادات الادخار" },
                { key: "resaleOverpriceSimulator", title: "محاكي أقساط الريسيل والأوفر برايس", desc: "يحسب الكاش المطلوب مع الأوفر برايس وأقساط المطور" },
                { key: "fairPriceIndexTracker", title: "مؤشر القيمة العادلة وتاريخ الأسعار", desc: "يقيّم هل السعر أقل من السوق أم عادل أم مبالغ فيه" },
                { key: "comprehensiveRoiYield", title: "حاسبة صافي العائد الاستثماري (Cap Rate)", desc: "تخصم مصاريف الصيانة والضريبة ونسب الإشغال" },
                { key: "shortTermRentalEstimator", title: "محلل إيرادات الإيجار السياحي/المفروش", desc: "يقدر إيرادات الإيجار اليومي وموسمية الطلب" },
              ].map((feat) => {
                const isEnabled = config.features[feat.key as keyof SmartFeaturesConfig["features"]];
                return (
                  <div
                    key={feat.key}
                    onClick={() => handleToggle(feat.key as keyof SmartFeaturesConfig["features"])}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isEnabled
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-100"
                        : "bg-slate-950/40 border-slate-800 text-slate-500 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-sm text-white">{feat.title}</span>
                      <span
                        className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 ${
                          isEnabled ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{feat.desc}</p>
                    <span className="mt-3 text-[11px] font-bold text-emerald-400">
                      {isEnabled ? "✓ الميزة نشطة على المنصة" : "✕ معطلة"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Configurable Parameters Form */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 mt-6 space-y-4">
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                معايير ومؤشرات السوق المالي المستخدمة بالحسابات
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">سعر جرام الذهب عيار 24 (ج.م)</label>
                  <input
                    type="number"
                    value={config.financialParams.goldGram24PriceEgp}
                    onChange={(e) => handleFinancialChange("goldGram24PriceEgp", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">سعر الدولار مقابل الجنيه</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.financialParams.usdToEgpRate}
                    onChange={(e) => handleFinancialChange("usdToEgpRate", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">سعر الريال السعودي مقابل الجنيه</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.financialParams.sarToEgpRate}
                    onChange={(e) => handleFinancialChange("sarToEgpRate", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">سعر الدرهم الإماراتي مقابل الجنيه</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.financialParams.aedToEgpRate}
                    onChange={(e) => handleFinancialChange("aedToEgpRate", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">معدل التضخم السنوي المتوقع (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.financialParams.annualInflationRatePercent}
                    onChange={(e) => handleFinancialChange("annualInflationRatePercent", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">عائد الشهادات البنكية السنوية (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.financialParams.bankCertificateAnnualYieldPercent}
                    onChange={(e) => handleFinancialChange("bankCertificateAnnualYieldPercent", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">ضريبة التصرفات العقارية (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.financialParams.realEstateDispositionTaxPercent}
                    onChange={(e) => handleFinancialChange("realEstateDispositionTaxPercent", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">معدل نمو سعر العقار السنوي (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.financialParams.averageAnnualAppreciationRatePercent}
                    onChange={(e) => handleFinancialChange("averageAnnualAppreciationRatePercent", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: Geospatial & Environmental Intelligence */}
        {/* ========================================================================= */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black text-white">المرحلة 2: الذكاء المكاني والبيئي (الأفكار 1 - 5)</h2>
              <p className="text-xs text-slate-400 mt-1">
                محاكاة زاوية الشمس والرياح (بحري/قبلي)، زمن الوصول الحقيقي، طبقات الخدمات ورادار المحاور الجديدة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "commuteTimeIsochrone", title: "البحث بزمن الوصول الحقيقي للمحاور الحيوية", desc: "يحسب زمن القيادة الفعلي بالدقائق لتفادي زحام القاهرة" },
                { key: "sunWindOrientationSimulator", title: "محاكي زوايا الشمس والوجهة (بحري/قبلي)", desc: "يحلل الإضاءة والتهوية الطبيعية للوحدة" },
                { key: "neighborhoodPoiHeatmaps", title: "طبقات الخدمات الحيوية (POIs)", desc: "إظهار المدارس والمستشفيات ومحطات المترو على الخريطة" },
                { key: "infrastructureRadar", title: "رادار المحاور والمشاريع القومية", desc: "يقيس المسافة للمحاور الجديدة ونسبة زيادة السعر المتوقعة" },
                { key: "neighborhoodComparisonRadar", title: "مقارنة الأحياء التفاعلية", desc: "مقارنة حيين في متوسط سعر المتر ونسب المساحات الخضراء" },
              ].map((feat) => {
                const isEnabled = config.features[feat.key as keyof SmartFeaturesConfig["features"]];
                return (
                  <div
                    key={feat.key}
                    onClick={() => handleToggle(feat.key as keyof SmartFeaturesConfig["features"])}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isEnabled
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-100"
                        : "bg-slate-950/40 border-slate-800 text-slate-500 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-sm text-white">{feat.title}</span>
                      <span
                        className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 ${
                          isEnabled ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{feat.desc}</p>
                    <span className="mt-3 text-[11px] font-bold text-emerald-400">
                      {isEnabled ? "✓ الميزة نشطة على المنصة" : "✕ معطلة"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Commute Hubs Table */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                المحاور ومراكز الأعمال المعتمدة لحساب أوقات القيادة
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold">
                      <th className="pb-3">اسم المحور / المركز</th>
                      <th className="pb-3">النوع</th>
                      <th className="pb-3">الإحداثيات الجغرافية</th>
                      <th className="pb-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {config.geospatialParams.commuteHubs.map((hub) => (
                      <tr key={hub.id} className="text-slate-300">
                        <td className="py-2.5 font-bold text-white">{hub.nameAr}</td>
                        <td className="py-2.5 font-mono text-emerald-400">{hub.category}</td>
                        <td className="py-2.5 font-mono text-slate-400">{hub.lat.toFixed(4)}, {hub.lng.toFixed(4)}</td>
                        <td className="py-2.5"><span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">مفعل</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: Interactive UX & Engagement */}
        {/* ========================================================================= */}
        {activeTab === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black text-white">المرحلة 3: تجربة المستخدم والمقارنات (الأفكار 21 - 25)</h2>
              <p className="text-xs text-slate-400 mt-1">
                مقارنة العقارات جنباً إلى جنب، بروشور واتساب فوري، بوابة المستثمر المغترب، وسوق «عقار مطلوب».
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "multiPropertyComparator", title: "مقارنة العقارات متعددة الأبعاد (3 عقارات معاً)", desc: "مصفوفة مقارنة بصرية للمواصفات والأقساط وعائد الاستثمار" },
                { key: "oneClickBrochureWhatsApp", title: "تصدير بروشور واتساب / PDF فوري", desc: "توليد كارت دعائي تسويقي بضغطة زر مع كود QR" },
                { key: "expatDiasporaHub", title: "بوابة المستثمر المغترب والعربي", desc: "تحويل مباشر بالعملات مع دليل التوكيلات والشراء عن بُعد" },
                { key: "reversePropertyRequests", title: "سوق «عقار مطلوب» العكسي", desc: "المشتري ينشر متطلباته ويتلقى عروض الوسطاء مباشرة" },
                { key: "silentPriceDropAlerts", title: "رادار انخفاض الأسعار والمراقبة الصامتة", desc: "تنبيه تلقائي عند خفض المالك للسعر أو طرح بديل أرخص" },
              ].map((feat) => {
                const isEnabled = config.features[feat.key as keyof SmartFeaturesConfig["features"]];
                return (
                  <div
                    key={feat.key}
                    onClick={() => handleToggle(feat.key as keyof SmartFeaturesConfig["features"])}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isEnabled
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-100"
                        : "bg-slate-950/40 border-slate-800 text-slate-500 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-sm text-white">{feat.title}</span>
                      <span
                        className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 ${
                          isEnabled ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{feat.desc}</p>
                    <span className="mt-3 text-[11px] font-bold text-emerald-400">
                      {isEnabled ? "✓ الميزة نشطة على المنصة" : "✕ معطلة"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: Trust, Verification & Inspection */}
        {/* ========================================================================= */}
        {activeTab === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black text-white">المرحلة 4: منظومة الثقة والأمان (الأفكار 16 - 20)</h2>
              <p className="text-xs text-slate-400 mt-1">
                توثيق الهوية والرقم القومي، خدمة الفحص الهندسي، درع مكافحة حرق الأسعار، وتقييم الوسطاء.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "verifiedOwnerBrokerBadges", title: "شارة المالك / الوسيط الموثق رسمياً", desc: "التحقق بالرقم القومي والسجل التجاري" },
                { key: "priceUndercuttingShield", title: "درع مكافحة حرق الأسعار والتكرار الوهمي", desc: "يكتشف تضارب الأسعار لنفس الوحدة ويخطر الإدارة" },
                { key: "engineeringInspectionBooking", title: "حجز الفحص الهندسي المعتمد", desc: "تقرير فحص حيادي لحالة السباكة والكهرباء والإنشاءات" },
                { key: "brokerReputationReviews", title: "نظام تقييم ومراجعات الوسطاء الموثقة", desc: "تقييم الوسيط بعد المعاينة الفعلية لحماية المشترين" },
                { key: "maskedContactAntiSpam", title: "تأمين أرقام التواصل والتأكيد الآلي", desc: "حماية خصوصية الملاك من برامج الزحف وسارقي الإعلانات" },
              ].map((feat) => {
                const isEnabled = config.features[feat.key as keyof SmartFeaturesConfig["features"]];
                return (
                  <div
                    key={feat.key}
                    onClick={() => handleToggle(feat.key as keyof SmartFeaturesConfig["features"])}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isEnabled
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-100"
                        : "bg-slate-950/40 border-slate-800 text-slate-500 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-sm text-white">{feat.title}</span>
                      <span
                        className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 ${
                          isEnabled ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{feat.desc}</p>
                    <span className="mt-3 text-[11px] font-bold text-emerald-400">
                      {isEnabled ? "✓ الميزة نشطة على المنصة" : "✕ معطلة"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Inspection Fee Parameters */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                إعدادات خدمة الفحص الهندسي المعتمد
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">رسوم الفحص الهندسي الأساسي (ج.م)</label>
                  <input
                    type="number"
                    value={config.inspectionParams.baseInspectionFeeEgp}
                    onChange={(e) => handleInspectionChange("baseInspectionFeeEgp", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">رسوم المعاينة المستعجلة (خلال 24 ساعة)</label>
                  <input
                    type="number"
                    value={config.inspectionParams.expressDeliveryFeeEgp}
                    onChange={(e) => handleInspectionChange("expressDeliveryFeeEgp", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">عدد المهندسين الاستشاريين المعتمدين</label>
                  <input
                    type="number"
                    value={config.inspectionParams.certifiedEngineersCount}
                    onChange={(e) => handleInspectionChange("certifiedEngineersCount", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 5: AI & Immersive Experiences */}
        {/* ========================================================================= */}
        {activeTab === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black text-white">المرحلة 5: الذكاء الاصطناعي وجولات الفيديو (الأفكار 11 - 15)</h2>
              <p className="text-xs text-slate-400 mt-1">
                الفرش الافتراضي للوحدات نصف التشطيب، حاسبة خامات التشطيب الحية، وتوليد الإعلانات الذكي.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "aiVirtualStagingStudio", title: "الفرش الافتراضي للوحدات نصف التشطيب", desc: "معاينة الوحدة مفروشة بالذكاء الاصطناعي لتسهيل البيع" },
                { key: "dynamicFinishingCostEstimator", title: "حاسبة تكلفة التشطيب التفاعلية لعام 2026", desc: "تحسب تكلفة المتر للمحارة والكهرباء والسباكة والدهانات" },
                { key: "aiListingGenerator", title: "توليد الإعلان الذكي الجذاب", desc: "صياغة نص تسويقي احترافي من مواصفات الوحدة" },
                { key: "egyptianDialectAiSearch", title: "البحث الذكي بالعامية المصرية", desc: "فهم العبارات العامية: 'شقة بحري بالتجمع قسط 7 سنين'" },
                { key: "legalContractRiskChecklist", title: "مساعد الفحص القانوني المبدئي للعقود", desc: "يوضح الفرق بين التسجيل وصحة التوقيع وتخصيص الجهاز" },
              ].map((feat) => {
                const isEnabled = config.features[feat.key as keyof SmartFeaturesConfig["features"]];
                return (
                  <div
                    key={feat.key}
                    onClick={() => handleToggle(feat.key as keyof SmartFeaturesConfig["features"])}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isEnabled
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-100"
                        : "bg-slate-950/40 border-slate-800 text-slate-500 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-sm text-white">{feat.title}</span>
                      <span
                        className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 ${
                          isEnabled ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{feat.desc}</p>
                    <span className="mt-3 text-[11px] font-bold text-emerald-400">
                      {isEnabled ? "✓ الميزة نشطة على المنصة" : "✕ معطلة"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Finishing Cost Per m² Parameters */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <Home className="w-4 h-4" />
                متوسط تكاليف تشطيب المتر المربع بالسوق المصري (ج.م / م²)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">تشطيب لوكس (ج.م / م²)</label>
                  <input
                    type="number"
                    value={config.finishingParams.luxCostPerSqM}
                    onChange={(e) => handleFinishingChange("luxCostPerSqM", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">تشطيب سوبر لوكس (ج.م / م²)</label>
                  <input
                    type="number"
                    value={config.finishingParams.superLuxCostPerSqM}
                    onChange={(e) => handleFinishingChange("superLuxCostPerSqM", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">تشطيب ألترا لوكس / فندقي (ج.م / م²)</label>
                  <input
                    type="number"
                    value={config.finishingParams.ultraLuxCostPerSqM}
                    onChange={(e) => handleFinishingChange("ultraLuxCostPerSqM", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 6: Enterprise, Portfolios & Big Data */}
        {/* ========================================================================= */}
        {activeTab === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black text-white">المرحلة 6: بوابات الشركاء والبيانات الضخمة (الأفكار 26 - 30)</h2>
              <p className="text-xs text-slate-400 mt-1">
                نبض ريلز للجولات السريعة، مخططات الكمبوندات، حاسبة التمويل العقاري، ومؤشر نبض السوق للصحافة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "aqarReelsVideoFeed", title: "نبض ريلز (AqarReels) للفيديوهات السريعة", desc: "جولات فيديو عمودية غامرة تحاكي منصات التواصل" },
                { key: "interactiveCompoundMasterplans", title: "بوابة المطورين ومخططات الكمبوندات", desc: "عرض مخططات Masterplan التفاعلية للشركات الكبرى" },
                { key: "mortgageBankingMatcher", title: "حاسبة قروض التمويل العقاري والبنكي", desc: "دعم مبادرات البنك المركزي 3% و 8% والتمويل التجاري" },
                { key: "investorPortfolioTracker", title: "محفظة إدارة أملاك المستثمر", desc: "تتبع الإيجارات الشهرية واستحقاق الأقساط والقيمة السوقية" },
                { key: "aqarPulseMarketIndex", title: "مؤشر نبض السوق المصري للبيانات والتحليلات", desc: "تقارير دورية تمنح المنصة ثقلاً إعلامياً في الصحافة" },
              ].map((feat) => {
                const isEnabled = config.features[feat.key as keyof SmartFeaturesConfig["features"]];
                return (
                  <div
                    key={feat.key}
                    onClick={() => handleToggle(feat.key as keyof SmartFeaturesConfig["features"])}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isEnabled
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-100"
                        : "bg-slate-950/40 border-slate-800 text-slate-500 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-sm text-white">{feat.title}</span>
                      <span
                        className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 ${
                          isEnabled ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{feat.desc}</p>
                    <span className="mt-3 text-[11px] font-bold text-emerald-400">
                      {isEnabled ? "✓ الميزة نشطة على المنصة" : "✕ معطلة"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Mortgage Parameters */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                معايير مبادرات البنك المركزي والتمويل العقاري
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">مبادرة محدودي الدخل السنوية (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.mortgageParams.cbeLowIncomeRatePercent}
                    onChange={(e) => handleMortgageChange("cbeLowIncomeRatePercent", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">مبادرة متوسطي الدخل السنوية (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.mortgageParams.cbeMiddleIncomeRatePercent}
                    onChange={(e) => handleMortgageChange("cbeMiddleIncomeRatePercent", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">سعر الفائدة التجارية التنافسية (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.mortgageParams.commercialMortgageRatePercent}
                    onChange={(e) => handleMortgageChange("commercialMortgageRatePercent", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Action Bar */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            آخر تحديث للإعدادات: <strong className="text-slate-200">{new Date(config.updatedAt).toLocaleDateString("ar-EG")}</strong> بواسطة <strong className="text-emerald-400">{config.updatedBy}</strong>
          </span>
          <button
            onClick={saveChanges}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ وتطبيق التغييرات فوراً</span>
          </button>
        </div>
      </div>
    </div>
  );
}
