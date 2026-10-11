"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LocationPickerMap from "@/components/map/LocationPickerMap";
import {
  Building2,
  MapPin,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Star,
  Shield,
  Layers,
  Sparkles,
  Info,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";

const MEET_GHAMR_DISTRICTS = [
  { id: "dist-meet-ghamr-city", name: "مدينة ميت غمر (المركز)", lat: 30.7194, lng: 31.2580 },
  { id: "dist-daqados", name: "دقادوس", lat: 30.7280, lng: 31.2650 },
  { id: "dist-tafahna-al-ashraf", name: "تفهنا الأشراف", lat: 30.7450, lng: 31.2400 },
  { id: "dist-damas", name: "دماص", lat: 30.7800, lng: 31.3300 },
  { id: "dist-sehregt-kobra", name: "صهرجت الكبرى", lat: 30.6800, lng: 31.2900 },
  { id: "dist-atmida", name: "أتميدة", lat: 30.7600, lng: 31.3600 },
  { id: "dist-kom-el-nour", name: "كوم النور", lat: 30.7400, lng: 31.3400 },
  { id: "dist-beshla", name: "بشلا", lat: 30.7300, lng: 31.3100 },
  { id: "dist-awleela", name: "أوليلة", lat: 30.7100, lng: 31.3500 },
  { id: "dist-dandit", name: "دنديط", lat: 30.6900, lng: 31.3300 },
  { id: "dist-sanfa", name: "سنفا", lat: 30.7500, lng: 31.3000 },
  { id: "dist-meet-yaeish", name: "ميت يعيش", lat: 30.6700, lng: 31.2800 },
  { id: "dist-meet-abou-khaled", name: "ميت أبو خالد", lat: 30.6600, lng: 31.3200 },
  { id: "dist-meet-el-faramawy", name: "ميت الفرماوي", lat: 30.7700, lng: 31.3500 },
  { id: "dist-meet-el-qorashi", name: "ميت القرشي", lat: 30.7000, lng: 31.2900 },
  { id: "dist-meet-mohsen", name: "ميت محسن", lat: 30.7300, lng: 31.2800 },
  { id: "dist-meet-el-ezz", name: "ميت العز", lat: 30.7500, lng: 31.2700 },
  { id: "dist-meet-nagy", name: "ميت ناجي", lat: 30.6900, lng: 31.3100 },
  { id: "dist-hala", name: "هلا", lat: 30.7100, lng: 31.2900 },
  { id: "dist-serenga", name: "سرنجا", lat: 30.7600, lng: 31.3200 },
  { id: "dist-sanbo-maqam", name: "سنبو مقام", lat: 30.7400, lng: 31.2800 },
  { id: "dist-santmay", name: "سنتماي", lat: 30.7700, lng: 31.3000 },
  { id: "dist-bachaloch", name: "بشالوش", lat: 30.7200, lng: 31.2900 },
  { id: "dist-el-bouha", name: "البوها", lat: 30.7600, lng: 31.3800 },
  { id: "dist-behida", name: "بهيدة", lat: 30.7500, lng: 31.3700 },
  { id: "dist-gasfa", name: "جصفا", lat: 30.6800, lng: 31.3100 },
  { id: "dist-kafr-el-miqdam", name: "كفر المقدام", lat: 30.6900, lng: 31.2700 },
  { id: "dist-kafr-serenga", name: "كفر سرنجا", lat: 30.7650, lng: 31.3250 },
  { id: "dist-kafr-el-shahid", name: "كفر الشهيد", lat: 30.7150, lng: 31.2750 },
  { id: "dist-kafr-el-wazir", name: "كفر الوزير", lat: 30.7400, lng: 31.3600 },
  { id: "dist-kafr-behida", name: "كفر بهيدة", lat: 30.7550, lng: 31.3750 },
  { id: "dist-kafr-noaman", name: "كفر نعمان", lat: 30.7850, lng: 31.3400 },
  { id: "dist-kafr-el-naeem", name: "كفر النعيم", lat: 30.7750, lng: 31.3150 },
  { id: "dist-kafr-el-mohamadeya", name: "كفر المحمدية", lat: 30.7050, lng: 31.3050 },
  { id: "dist-kafr-el-sheikh-helal", name: "كفر الشيخ هلال", lat: 30.7250, lng: 31.3400 },
  { id: "dist-kofour-el-behaita", name: "كفور البهايتة", lat: 30.7350, lng: 31.3700 },
  { id: "dist-kafr-abou-nabhan", name: "كفر أبو نبهان", lat: 30.7100, lng: 31.2600 },
  { id: "dist-kafr-ibrahim-youssef", name: "كفر إبراهيم يوسف", lat: 30.7200, lng: 31.3300 },
  { id: "dist-kafr-attallah-soliman", name: "كفر عطا الله سليمان", lat: 30.6950, lng: 31.2950 },
  { id: "dist-kafr-ali-abdullah", name: "كفر علي عبد الله", lat: 30.7050, lng: 31.3150 },
];

interface UploadedImage {
  url: string;
  path: string;
  filename: string;
  isMain: boolean;
}

export default function NewPropertyListingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Wizard Step (1: Info, 2: Location, 3: Images, 4: Review)
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    transactionType: "sale" as "sale" | "rent",
    category: "apartment",
    price: "",
    currency: "EGP",
    rentalPeriod: "monthly",
    negotiable: false,
    hasInstallment: false,
    downPayment: "",
    installmentYears: "5",

    // Specs
    areaSqM: "",
    bedrooms: "3",
    bathrooms: "2",
    floor: "2",
    totalFloors: "5",
    finishingStatus: "fully_finished",
    furnishingStatus: "unfurnished",
    parkingSpots: "1",
    hasElevator: true,
    amenities: ["security_24_7", "private_parking"],

    // Location (Default: Markaz Meet Ghamr, Dakahlia)
    cityId: "city-dakahlia",
    districtId: "dist-meet-ghamr-city",
    addressDetails: "مدينة ميت غمر، الدقهلية",
    lat: 30.7194,
    lng: 31.2580,
    locationPrivacy: "exact" as "exact" | "approximate",
  });

  // Predefined default amenities + custom amenities added dynamically by user
  const [availableAmenities, setAvailableAmenities] = useState([
    { key: "security_24_7", label: "أمن وحراسة 24/7" },
    { key: "private_parking", label: "موقف سيارات خاص" },
    { key: "elevator", label: "مصعد كهربائي" },
    { key: "natural_gas", label: "غاز طبيعي" },
    { key: "electricity_meter", label: "عداد كهرباء (قديم / كارت)" },
    { key: "clean_water", label: "مياه شرب نقية" },
    { key: "fiber_internet", label: "خط أرضي وإنترنت فايبر" },
    { key: "balcony", label: "شرفة / تراس واسع" },
    { key: "luxury_entrance", label: "مدخل رخام فاخر" },
    { key: "north_facade", label: "واجهة بحري غير مجروحة" },
    { key: "nile_view", label: "إطلالة على النيل / البحر" },
    { key: "land_share", label: "حصة قانونية في الأرض" },
    { key: "real_estate_registered", label: "تسجيل شهر عقاري / صحة توقيع" },
    { key: "near_services", label: "قريب من المواصلات والخدمات" },
    { key: "private_garden", label: "حديقة خاصة" },
    { key: "swimming_pool", label: "حمام سباحة" },
    { key: "central_ac", label: "تكييف مركزي" },
  ]);

  const [newCustomAmenity, setNewCustomAmenity] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // Images state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Verify authentication on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login?redirect=/dashboard/properties/new");
        } else if (data.user.role === "buyer" || data.user.role === "seeker") {
          router.push("/dashboard");
        } else {
          setCurrentUser(data.user);
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setAuthLoading(false));
  }, [router]);

  // District / Village selection handler (centers map and updates address automatically)
  const handleDistrictChange = (distId: string) => {
    const dist = MEET_GHAMR_DISTRICTS.find((d) => d.id === distId);
    const lat = dist?.lat || 30.7194;
    const lng = dist?.lng || 31.2580;
    const distName = dist?.name || "ميت غمر";

    setFormData((prev) => ({
      ...prev,
      districtId: distId,
      lat,
      lng,
      addressDetails: `الدقهلية، مركز ميت غمر - ${distName}`,
    }));
  };

  // Map pin drag or click: updates coordinates and automatically reverse-geocodes address
  const handleLocationChange = async (newLat: number, newLng: number) => {
    setFormData((prev) => ({
      ...prev,
      lat: newLat,
      lng: newLng,
    }));

    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&accept-language=ar`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const road = data.address.road || data.address.suburb || data.address.neighbourhood || "";
          const village = data.address.village || data.address.town || data.address.city || "";
          const parts = [road, village, "مركز ميت غمر", "الدقهلية"].filter(Boolean);
          const fullAddress = parts.join("، ");
          if (fullAddress) {
            setFormData((prev) => ({
              ...prev,
              addressDetails: fullAddress,
            }));
          }
        }
      }
    } catch {
      // Fallback: keep previous or use district name
    } finally {
      setGeocoding(false);
    }
  };

  const handleAddCustomAmenity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCustomAmenity.trim();
    if (!trimmed) return;

    const customKey = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setAvailableAmenities((prev) => [...prev, { key: customKey, label: trimmed }]);
    setFormData((prev) => ({
      ...prev,
      amenities: [...prev.amenities, customKey],
    }));
    setNewCustomAmenity("");
  };

  // Image Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const body = new FormData();
        body.append("file", file);
        body.append("propertyId", "draft");

        const res = await fetch("/api/upload", {
          method: "POST",
          body,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setImages((prev) => [
            ...prev,
            {
              url: data.url,
              path: data.path,
              filename: data.filename,
              isMain: prev.length === 0, // First image is main by default
            },
          ]);
        } else {
          setErrorMsg(data.error || "فشل في رفع أحد الصور");
        }
      }
    } catch (err) {
      setErrorMsg("خطأ أثناء رفع الصور، يرجى المحاولة لاحقاً");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // Remove uploaded image
  const handleRemoveImage = async (index: number) => {
    const img = images[index];
    if (img && img.path) {
      try {
        await fetch(`/api/upload?path=${encodeURIComponent(img.path)}`, {
          method: "DELETE",
        });
      } catch (e) {
        // Ignored
      }
    }

    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Ensure at least one image is main
      if (updated.length > 0 && !updated.some((i) => i.isMain)) {
        updated[0].isMain = true;
      }
      return updated;
    });
  };

  // Set as main image
  const handleSetMainImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isMain: i === index,
      }))
    );
  };

  // Amenity toggle
  const toggleAmenity = (key: string) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(key);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== key)
          : [...prev.amenities, key],
      };
    });
  };

  // Submission handler (draft or pending_review)
  const handleSubmitListing = async (targetStatus: "draft" | "pending_review") => {
    // Form validation
    if (!formData.title.trim()) {
      setErrorMsg("يرجى كتابة عنوان العقار");
      setStep(1);
      return;
    }
    if (!formData.description.trim()) {
      setErrorMsg("يرجى كتابة وصف تفصيلي للعقار");
      setStep(1);
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      setErrorMsg("يرجى تحديد السعر المطلوب");
      setStep(1);
      return;
    }
    if (!formData.areaSqM || Number(formData.areaSqM) <= 0) {
      setErrorMsg("يرجى تحديد المساحة بالمتر المربع");
      setStep(1);
      return;
    }
    if (!formData.addressDetails.trim()) {
      setErrorMsg("يرجى كتابة العنوان وتفاصيل الموقع");
      setStep(2);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const imageUrls = images.map((i) => i.url);
    if (imageUrls.length === 0) {
      imageUrls.push("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80");
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        transactionType: formData.transactionType,
        category: formData.category,
        price: Number(formData.price),
        rentalPeriod: formData.transactionType === "rent" ? formData.rentalPeriod : undefined,
        negotiable: formData.negotiable,
        downPayment: formData.hasInstallment && formData.downPayment ? Number(formData.downPayment) : undefined,
        installmentYears: formData.hasInstallment && formData.installmentYears ? Number(formData.installmentYears) : undefined,
        areaSqM: Number(formData.areaSqM),
        bedrooms: isLandOrCommercial ? undefined : Number(formData.bedrooms),
        bathrooms: isLandOrCommercial ? undefined : Number(formData.bathrooms),
        floor: isLandOrVilla ? undefined : Number(formData.floor),
        totalFloors: isLandOrVilla ? undefined : Number(formData.totalFloors),
        finishingStatus: formData.finishingStatus,
        furnishingStatus: formData.furnishingStatus,
        parkingSpots: Number(formData.parkingSpots),
        hasElevator: formData.hasElevator,
        amenities: formData.amenities,
        cityId: formData.cityId,
        districtId: formData.districtId,
        addressDetails: formData.addressDetails,
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        locationPrivacy: formData.locationPrivacy,
        images: imageUrls,
        status: targetStatus,
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(data.property);
      } else {
        setErrorMsg(data.error || "فشل حفظ العقار، يرجى مراجعة البيانات");
      }
    } catch (err: unknown) {
      setErrorMsg("حدث خطأ في الاتصال بالخادم، يرجى إعادة المحاولة");
    } finally {
      setSubmitting(false);
    }
  };

  const isLandOrCommercial = formData.category === "land" || formData.category === "commercial" || formData.category === "commercial_retail" || formData.category === "office";
  const isLandOrVilla = formData.category === "land" || formData.category === "villa" || formData.category === "house";

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <span className="text-sm font-bold text-slate-600">جاري التحقق من هوية الحساب...</span>
      </div>
    );
  }

  // Success Confirmation Screen
  if (submitSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12" dir="rtl">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {submitSuccess.status === "draft" ? "تم حفظ العقار كمسودة بنجاح!" : "تم إرسال العقار للمراجعة والاعتماد!"}
            </h1>
            <p className="text-sm text-slate-500 font-medium max-w-lg mx-auto">
              {submitSuccess.status === "draft"
                ? "تم حفظ تفاصيل العقار كمسودة سرية خاصة بك. يمكنك استكمال البيانات وتعديلها في أي وقت من لوحة التحكم."
                : "تم إرسال عقارك إلى فريق الإشراف للتحقق من المواصفات والصور. سيتم إشعارك فور الاعتماد ونشره على الخريطة التفاعلية."}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-right max-w-md mx-auto space-y-2">
            <div className="text-xs text-slate-400 font-bold">العقار المسجل:</div>
            <div className="font-bold text-slate-800 text-sm">{submitSuccess.title}</div>
            <div className="text-xs text-brand-700 font-black">
              {submitSuccess.price?.toLocaleString("ar-EG")} ج.م •{" "}
              <span className="text-slate-500 font-normal">
                {submitSuccess.status === "draft" ? "مسودة غير معلنة" : "قيد المراجعة الإدارية"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard/properties"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition shadow-sm"
            >
              الانتقال إلى عقاراتي في لوحة التحكم
            </Link>
            <button
              onClick={() => {
                setSubmitSuccess(null);
                setStep(1);
                setImages([]);
                setFormData((prev) => ({ ...prev, title: "", description: "", price: "", areaSqM: "" }));
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
            >
              إضافة عقار آخر
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-700 mb-1">
            <Building2 className="w-4 h-4" />
            <span>لوحة تحكم المعلن • إضافة وحدة جديدة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">إضافة عقار جديد</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            أدخل المواصفات المحددة وحدد الموقع على الخريطة لحفظه كمسودة أو نشره للمشترين
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
        >
          إلغاء والعودة
        </Link>
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { num: 1, label: "المواصفات الأساسية" },
          { num: 2, label: "الموقع الجغرافي" },
          { num: 3, label: "الصور والوسائط" },
          { num: 4, label: "المراجعة والإرسال" },
        ].map((s) => (
          <div
            key={s.num}
            onClick={() => s.num < step && setStep(s.num)}
            className={`cursor-pointer p-3 rounded-2xl border transition ${
              step === s.num
                ? "bg-brand-50 border-brand-500 text-brand-800 shadow-sm"
                : step > s.num
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div className="text-xs font-black">الخطوة {s.num}</div>
            <div className="text-[11px] font-bold truncate mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Basic Specifications */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
            1. نوع المعاملة والبيانات الأساسية
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع المعاملة *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transactionType: "sale" })}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                    formData.transactionType === "sale"
                      ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  للبيع
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transactionType: "rent" })}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                    formData.transactionType === "rent"
                      ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  للإيجار
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع العقار *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="apartment">شقة سكنية</option>
                <option value="house">بيت / منزل</option>
                <option value="villa">فيلا مستقلة</option>
                <option value="commercial_retail">محل تجاري</option>
                <option value="office">مكتب إداري</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان العقار التسويقي *</label>
            <input
              type="text"
              placeholder="مثال: فيلا مستقلة فاخرة مطلة على البحيرة في بالم هيلز التجمع الخامس"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الوصف التفصيلي *</label>
            <textarea
              rows={4}
              placeholder="اكتب مواصفات العقار، التقسيم الداخلي، الإطلالة، مميزات الكمبوند..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />
          </div>

          {/* Pricing & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">السعر المطلوب (ج.م) *</label>
              <input
                type="number"
                placeholder="مثال: 5500000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المساحة الإجمالية (م²) *</label>
              <input
                type="number"
                placeholder="مثال: 185"
                value={formData.areaSqM}
                onChange={(e) => setFormData({ ...formData, areaSqM: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {formData.transactionType === "rent" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">دورية الإيجار</label>
                <select
                  value={formData.rentalPeriod}
                  onChange={(e) => setFormData({ ...formData, rentalPeriod: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="monthly">شهرياً</option>
                  <option value="yearly">سنوياً</option>
                  <option value="daily">يومياً (مفروش)</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="negotiable"
                  checked={formData.negotiable}
                  onChange={(e) => setFormData({ ...formData, negotiable: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded"
                />
                <label htmlFor="negotiable" className="text-xs font-bold text-slate-700 cursor-pointer">
                  السعر قابل للتفاوض
                </label>
              </div>
            )}
          </div>

          {/* Conditional Specs (Bedrooms, Bathrooms, Floor) */}
          {!isLandOrCommercial && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">غرف النوم</label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الحمامات</label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">حالة التشطيب</label>
                <select
                  value={formData.finishingStatus}
                  onChange={(e) => setFormData({ ...formData, finishingStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="ultra_lux">ألترا سوبر لوكس</option>
                  <option value="fully_finished">تشطيب كامل (سوبر لوكس)</option>
                  <option value="semi_finished">نصف تشطيب (محارة وحلوق)</option>
                  <option value="core_and_shell">بدون تشطيب (على الطوب)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الفرش</label>
                <select
                  value={formData.furnishingStatus}
                  onChange={(e) => setFormData({ ...formData, furnishingStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="unfurnished">بدون فرش</option>
                  <option value="furnished">مفروش بالكامل</option>
                  <option value="semi_furnished">مفروش جزئياً</option>
                </select>
              </div>
            </div>
          )}

          {/* Amenities Badges */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">المرافق والمزايا المتوفرة</label>
              <span className="text-[11px] text-slate-400">
                ({formData.amenities.length} مزايا مختارة)
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {availableAmenities.map((a) => {
                const isSelected = formData.amenities.includes(a.key);
                const isCustom = a.key.startsWith("custom_");
                return (
                  <div
                    key={a.key}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      isSelected
                        ? "bg-brand-50 border-brand-500 text-brand-700 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleAmenity(a.key)}
                      className="cursor-pointer"
                    >
                      {a.label}
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvailableAmenities((prev) => prev.filter((item) => item.key !== a.key));
                          setFormData((prev) => ({
                            ...prev,
                            amenities: prev.amenities.filter((k) => k !== a.key),
                          }));
                        }}
                        className="text-slate-400 hover:text-rose-600 font-bold ml-1 text-sm leading-none"
                        title="إزالة هذه الميزة"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Custom Amenity Input */}
            <div className="mt-3.5 flex items-center gap-2 max-w-md">
              <input
                type="text"
                placeholder="أضف ميزة أو مرفق آخر (مثال: سطح خاص، خزان مياه، طاقة شمسية...)"
                value={newCustomAmenity}
                onChange={(e) => setNewCustomAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomAmenity();
                  }
                }}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => handleAddCustomAmenity()}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>إضافة ميزة</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => {
                if (!formData.title || !formData.price || !formData.areaSqM) {
                  setErrorMsg("يرجى ملء الحقول الأساسية (العنوان، السعر، المساحة)");
                  return;
                }
                setErrorMsg(null);
                setStep(2);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <span>الانتقال للموقع الجغرافي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Location & Privacy Map */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
            2. الموقع المكاني وخريطة التحديد التفاعلية (مركز ميت غمر)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المحافظة *</label>
              <select
                value={formData.cityId}
                onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="city-dakahlia">الدقهلية (محافظة الدقهلية)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المنطقة والحي / القرية (مركز ميت غمر) *</label>
              <select
                value={formData.districtId}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {MEET_GHAMR_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">العنوان التفصيلي واسم الشارع أو المعلم *</label>
              {geocoding ? (
                <span className="text-[11px] text-brand-600 flex items-center gap-1 font-bold animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري كتابة العنوان تلقائياً من الخريطة...</span>
                </span>
              ) : formData.addressDetails ? (
                <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>العنوان محدد بناءً على موقع الدبوس على الخريطة</span>
                </span>
              ) : null}
            </div>
            <input
              type="text"
              placeholder="مثال: شارع بورسعيد، ميت غمر بالقرب من مستشفى الكلى"
              value={formData.addressDetails}
              onChange={(e) => setFormData({ ...formData, addressDetails: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Interactive Map Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-600" />
                <span>خريطة مركز ميت غمر (انقر لتثبيت الدبوس أو اسحبه لتحديث العنوان تلقائياً)</span>
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                [{formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}]
              </span>
            </div>

            <LocationPickerMap
              lat={formData.lat}
              lng={formData.lng}
              isApproximate={formData.locationPrivacy === "approximate"}
              onLocationChange={handleLocationChange}
            />
          </div>

          {/* Privacy Option Choice */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-600" />
              <span>خصوصية عرض الموقع على الخريطة العامة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setFormData({ ...formData, locationPrivacy: "exact" })}
                className={`cursor-pointer p-3 rounded-xl border transition ${
                  formData.locationPrivacy === "exact"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <input
                    type="radio"
                    checked={formData.locationPrivacy === "exact"}
                    onChange={() => {}}
                    className="text-emerald-600"
                  />
                  <span>موقع دقيق (Exact Location)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  يظهر الدبوس في موقعه الحقيقي تماماً على الخريطة التفاعلية للباحثين عن عقارات.
                </p>
              </div>

              <div
                onClick={() => setFormData({ ...formData, locationPrivacy: "approximate" })}
                className={`cursor-pointer p-3 rounded-xl border transition ${
                  formData.locationPrivacy === "approximate"
                    ? "bg-amber-50 border-amber-500 text-amber-900 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <input
                    type="radio"
                    checked={formData.locationPrivacy === "approximate"}
                    onChange={() => {}}
                    className="text-amber-600"
                  />
                  <span>موقع تقريبي (نطاق 500م)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  يقوم النظام بتمويه الإحداثيات وتوفير دائرة نطاق لحماية خصوصية سكن المالك.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!formData.addressDetails.trim()) {
                  setErrorMsg("يرجى كتابة العنوان وتفاصيل الشارع");
                  return;
                }
                setErrorMsg(null);
                setStep(3);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <span>الانتقال لرفع الصور</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Images & Supabase Storage */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              3. معرض الصور وحاوية التخزين السحابية (Storage)
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {images.length} صور مرفوعة
            </span>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-8 text-center transition bg-slate-50/50">
            <input
              type="file"
              id="property-image-input"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="property-image-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl shadow-sm">
                {uploadingImage ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>
              <div className="font-bold text-slate-800 text-sm">
                {uploadingImage ? "جاري رفع الصور إلى Supabase Storage..." : "انقر لاختيار صور من جهازك أو اسحبها هنا"}
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                الأنواع المدعومة: JPG, PNG, WEBP, AVIF (الحد الأقصى 10 ميجابايت للصورة)
              </p>
            </label>
          </div>

          {/* Preview Gallery Grid */}
          {images.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700">معاينة الصور المرفوعة (حدد الصورة الرئيسية):</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-2xl overflow-hidden border-2 transition group ${
                      img.isMain ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-200"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.filename}
                      className="w-full h-32 object-cover bg-slate-100"
                    />

                    {/* Main image badge */}
                    {img.isMain && (
                      <div className="absolute top-2 right-2 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                        الرئيسية ⭐
                      </div>
                    )}

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
                      {!img.isMain && (
                        <button
                          type="button"
                          onClick={() => handleSetMainImage(idx)}
                          className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg text-[10px] font-bold transition"
                          title="تعيين كرئيسية"
                        >
                          <Star className="w-4 h-4 text-amber-500" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <span>الانتقال للمعاينة والإرسال</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Final Actions */}
      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
            4. مراجعة تفاصيل العقار وتأكيد الإرسال
          </h2>

          {/* Quick Review Card */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-100 text-brand-800">
                  {formData.transactionType === "sale" ? "للبيع" : "للإيجار"} • {formData.category}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-2">{formData.title}</h3>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span>{formData.addressDetails}</span>
                </div>
              </div>

              <div className="text-left">
                <div className="text-xl font-black text-brand-800">
                  {Number(formData.price || 0).toLocaleString("ar-EG")} ج.م
                </div>
                <div className="text-xs text-slate-400">
                  {formData.areaSqM} م² • {formData.bedrooms} غرف
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
              {formData.description}
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pt-2 border-t border-slate-200">
              <Info className="w-4 h-4 text-brand-600 shrink-0" />
              <span>
                نوع الخصوصية: {formData.locationPrivacy === "exact" ? "موقع دقيق للجمهور" : "موقع تقريبي (نطاق 500م)"} • الصور: {images.length} صورة
              </span>
            </div>
          </div>

          {/* Dual Action Buttons (Draft vs Submit) */}
          <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-2xl space-y-4">
            <div className="text-xs font-bold text-brand-900">اختر طريقة الحفظ والإرسال:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitListing("draft")}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-right transition group disabled:opacity-50"
              >
                <div className="font-bold text-xs text-slate-800 mb-1 flex items-center justify-between">
                  <span>حفظ كمسودة خاصة</span>
                  <span className="text-[10px] text-slate-400 font-mono">DRAFT</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  يُحفظ العقار في لوحة تحكمك فقط ولا يُعرض للجمهور. يمكنك تعديله واستكماله لاحقاً.
                </p>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitListing("pending_review")}
                className="p-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-right transition shadow-sm disabled:opacity-50"
              >
                <div className="font-bold text-xs mb-1 flex items-center justify-between">
                  <span>إرسال للاعتماد والمراجعة</span>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <p className="text-[11px] text-brand-100">
                  يُرسل العقار لفريق الإشراف لاعتماده ونشره على الخريطة وقوائم البحث العامة.
                </p>
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            {submitting && (
              <div className="flex items-center gap-2 text-xs font-bold text-brand-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري معالجة وحفظ العقار...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
