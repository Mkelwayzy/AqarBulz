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
  Clock,
  Save,
  RotateCcw,
  GripVertical,
  MoveLeft,
  MoveRight,
  Calculator,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import { compressImageClientSide, formatBytesArabic } from "@/lib/utils/imageCompression";
import { convertEgyptianUnitsToSqm, convertSqmToEgyptianUnits } from "@/lib/utils/landAreaUnits";

// Dynamic taxonomy is fetched directly from /api/taxonomy

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
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);

  // Wizard Step (1: Info, 2: Location, 3: Images, 4: Review)
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const MAX_IMAGES = 6;

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
    bedrooms: "",
    bathrooms: "",
    floor: "",
    totalFloors: "",
    hasBuildingPermit: false, // For Land (أراضي)
    finishingStatus: "fully_finished",
    furnishingStatus: "unfurnished",
    parkingSpots: "0",
    hasElevator: false,
    amenities: [] as string[], // Empty by default per host request

    // Location (Dakahlia only)
    cityId: "city-dakahlia",
    districtId: "dist-mansoura-city",
    addressDetails: "مدينة المنصورة، الدقهلية",
    lat: 31.0409,
    lng: 31.3785,
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
  const [compressionNotice, setCompressionNotice] = useState<string | null>(null);

  // Drag & drop image reordering state
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);
  const [dragOverImgIdx, setDragOverImgIdx] = useState<number | null>(null);

  // Agricultural Land Unit Converter State (Feddan / Qirat / Sahm)
  const [areaUnitMode, setAreaUnitMode] = useState<"sqm" | "egyptian">("sqm");
  const [landUnits, setLandUnits] = useState({ feddan: "", qirat: "", sahm: "" });

  // LocalStorage Draft State
  const DRAFT_STORAGE_KEY = "aqarpulse_new_property_draft_v1";
  const [draftAvailable, setDraftAvailable] = useState<any | null>(null);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState(false);

  // Check for saved local draft on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          (parsed.formData?.title ||
            parsed.formData?.description ||
            (parsed.images && parsed.images.length > 0))
        ) {
          setDraftAvailable(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to read draft from localStorage", e);
    }
  }, []);

  // Debounced auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasContent = Boolean(
        formData.title.trim() ||
        formData.description.trim() ||
        formData.price ||
        formData.areaSqM ||
        images.length > 0
      );

      if (hasContent) {
        try {
          const payload = {
            formData,
            images,
            step,
            areaUnitMode,
            landUnits,
            savedAt: Date.now(),
          };
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
          const now = new Date();
          const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
          setLastAutoSaved(timeStr);
        } catch (e) {
          console.error("Auto-save failed", e);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [formData, images, step, areaUnitMode, landUnits]);

  // Restore draft handler
  const handleRestoreDraft = () => {
    if (!draftAvailable) return;
    if (draftAvailable.formData) {
      setFormData(draftAvailable.formData);
      if (draftAvailable.formData.category === "land" && draftAvailable.formData.areaSqM) {
        const converted = convertSqmToEgyptianUnits(Number(draftAvailable.formData.areaSqM));
        setLandUnits({
          feddan: converted.feddan > 0 ? String(converted.feddan) : "",
          qirat: converted.qirat > 0 ? String(converted.qirat) : "",
          sahm: converted.sahm > 0 ? String(converted.sahm) : "",
        });
      }
    }
    if (draftAvailable.images) setImages(draftAvailable.images);
    if (draftAvailable.step) setStep(draftAvailable.step);
    if (draftAvailable.areaUnitMode) setAreaUnitMode(draftAvailable.areaUnitMode);
    if (draftAvailable.landUnits) setLandUnits(draftAvailable.landUnits);

    setDraftRestoredNotice(true);
    setDraftAvailable(null);
    setTimeout(() => setDraftRestoredNotice(false), 5000);
  };

  // Discard draft handler
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    setDraftAvailable(null);
    setLastAutoSaved(null);
  };

  // Land Unit converter input handlers
  const handleLandUnitChange = (field: "feddan" | "qirat" | "sahm", val: string) => {
    const updated = { ...landUnits, [field]: val };
    setLandUnits(updated);

    const f = parseFloat(updated.feddan) || 0;
    const q = parseFloat(updated.qirat) || 0;
    const s = parseFloat(updated.sahm) || 0;

    if (f > 0 || q > 0 || s > 0) {
      const calculatedSqm = convertEgyptianUnitsToSqm({ feddan: f, qirat: q, sahm: s });
      setFormData((prev) => ({
        ...prev,
        areaSqM: calculatedSqm.toString(),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        areaSqM: "",
      }));
    }
  };

  const handleAreaSqmChange = (val: string) => {
    setFormData((prev) => ({ ...prev, areaSqM: val }));
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const converted = convertSqmToEgyptianUnits(num);
      setLandUnits({
        feddan: converted.feddan > 0 ? String(converted.feddan) : "",
        qirat: converted.qirat > 0 ? String(converted.qirat) : "",
        sahm: converted.sahm > 0 ? String(converted.sahm) : "",
      });
    } else {
      setLandUnits({ feddan: "", qirat: "", sahm: "" });
    }
  };

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

  // Fetch taxonomy on mount
  useEffect(() => {
    fetch("/api/taxonomy")
      .then((res) => res.json())
      .then((data) => {
        if (data.cities) setCities(data.cities);
        if (data.districts) setDistricts(data.districts);
      })
      .catch((err) => console.error(err));
  }, []);

  // District selection handler (centers map without wiping manual street details)
  const handleDistrictChange = (distId: string) => {
    const dist = districts.find((d) => d.id === distId);
    const lat = dist?.centerLat || formData.lat;
    const lng = dist?.centerLng || formData.lng;
    const distName = dist?.nameAr || "";

    setFormData((prev) => ({
      ...prev,
      districtId: distId,
      lat,
      lng,
      addressDetails: distName ? `${distName}، الدقهلية` : prev.addressDetails,
    }));
  };

  // Map pin drag or click: updates coordinates ONLY, preserving manual address accuracy
  const handleLocationChange = (newLat: number, newLng: number) => {
    setFormData((prev) => ({
      ...prev,
      lat: newLat,
      lng: newLng,
    }));
  };

  // Optional manual helper to suggest address from map coordinates
  const handleFetchAddressFromCoordinates = async () => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${formData.lat}&lon=${formData.lng}&accept-language=ar`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const road = data.address.road || data.address.suburb || data.address.neighbourhood || "";
          const village = data.address.village || data.address.town || data.address.city || "";
          const parts = [road, village].filter(Boolean);
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
      // Ignored
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

  // Batch Image Upload Handler with In-Browser Client-Side Compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingQuota = MAX_IMAGES - images.length;
    if (remainingQuota <= 0) {
      setErrorMsg(`تم الوصول للحد الأقصى لعدد الصور المسموح به (${MAX_IMAGES} صور للمشروع الواحد).`);
      e.target.value = "";
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingQuota);
    if (files.length > remainingQuota) {
      setErrorMsg(`الحد الأقصى هو ${MAX_IMAGES} صور للمشروع. تم اختيار أول ${filesToUpload.length} صور المتاحة بحصتك.`);
    } else {
      setErrorMsg(null);
    }

    setUploadingImage(true);
    setCompressionNotice("جاري فحص الصور وضغطها تلقائياً على جهازك قبل الرفع...");

    try {
      let totalOriginalBytes = 0;
      let totalCompressedBytes = 0;

      // 1. Client-Side Image Compression (WebP / 1920px max)
      const compressedResults = await Promise.all(
        filesToUpload.map(async (file) => {
          totalOriginalBytes += file.size;
          const res = await compressImageClientSide(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.82,
            mimeType: "image/webp",
          });
          totalCompressedBytes += res.compressedSizeBytes;
          return res;
        })
      );

      const savedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
      const ratio = totalOriginalBytes > 0 ? Math.round((savedBytes / totalOriginalBytes) * 100) : 0;
      setCompressionNotice(
        `تم ضغط الصور وتوفير ${ratio}% (من ${formatBytesArabic(totalOriginalBytes)} إلى ${formatBytesArabic(totalCompressedBytes)}). جاري الرفع السحابي...`
      );

      // 2. Upload Compressed WebP Files to Supabase Storage
      const uploadPromises = compressedResults.map(async ({ file }) => {
        const body = new FormData();
        body.append("file", file);
        body.append("propertyId", "draft");

        const res = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          return {
            url: data.url,
            path: data.path,
            filename: data.filename,
          };
        } else {
          throw new Error(data.error || `خطأ في رفع الصورة ${file.name}`);
        }
      });

      const results = await Promise.allSettled(uploadPromises);
      const successfulImages: UploadedImage[] = [];
      const failedErrors: string[] = [];

      results.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          successfulImages.push({
            url: r.value.url,
            path: r.value.path,
            filename: r.value.filename,
            isMain: false,
          });
        } else {
          failedErrors.push(compressedResults[idx].file.name);
        }
      });

      if (successfulImages.length > 0) {
        setImages((prev) => {
          const updated = [...prev, ...successfulImages];
          if (!updated.some((img) => img.isMain) && updated.length > 0) {
            updated[0].isMain = true;
          }
          return updated;
        });
      }

      if (failedErrors.length > 0) {
        setErrorMsg(`فشل رفع بعض الصور (${failedErrors.join("، ")}). يرجى التأكد من اتصال الإنترنت.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "خطأ أثناء رفع الصور، يرجى المحاولة لاحقاً");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // Drag and Drop Image Handlers for Reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    setDraggedImgIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverImgIdx !== index) {
      setDragOverImgIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = draggedImgIdx !== null ? draggedImgIdx : parseInt(e.dataTransfer.getData("text/plain"), 10);

    if (isNaN(sourceIndex) || sourceIndex === targetIndex || sourceIndex < 0 || sourceIndex >= images.length) {
      setDraggedImgIdx(null);
      setDragOverImgIdx(null);
      return;
    }

    const reordered = [...images];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Index 0 is always the primary cover
    const updated = reordered.map((img, i) => ({
      ...img,
      isMain: i === 0,
    }));

    setImages(updated);
    setDraggedImgIdx(null);
    setDragOverImgIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedImgIdx(null);
    setDragOverImgIdx(null);
  };

  // Touch / Mobile Friendly One-Tap Reordering
  const handleMoveImage = (fromIndex: number, direction: "prev" | "next") => {
    const toIndex = direction === "prev" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;

    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setImages(
      reordered.map((img, i) => ({
        ...img,
        isMain: i === 0,
      }))
    );
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

    const isLand = formData.category === "land";
    const isHouse = formData.category === "house";
    const isApartment = formData.category === "apartment";
    const isVilla = formData.category === "villa";

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        transactionType: formData.transactionType,
        category: formData.category,
        price: Number(formData.price),
        rentalPeriod: formData.transactionType === "rent" ? formData.rentalPeriod : undefined,
        negotiable: Boolean(formData.negotiable),
        downPayment: formData.hasInstallment && formData.downPayment ? Number(formData.downPayment) : undefined,
        installmentYears: formData.hasInstallment && formData.installmentYears ? Number(formData.installmentYears) : undefined,
        areaSqM: Number(formData.areaSqM),
        hasBuildingPermit: isLand ? Boolean(formData.hasBuildingPermit) : undefined,
        bedrooms: !isLand && formData.bedrooms ? Number(formData.bedrooms) : undefined,
        bathrooms: !isLand && formData.bathrooms ? Number(formData.bathrooms) : undefined,
        floor: (isApartment || formData.category === "commercial_retail" || formData.category === "office") && formData.floor ? Number(formData.floor) : undefined,
        totalFloors: (isHouse || isApartment || isVilla) && formData.totalFloors ? Number(formData.totalFloors) : undefined,
        finishingStatus: isLand ? undefined : formData.finishingStatus,
        furnishingStatus: isLand ? undefined : formData.furnishingStatus,
        parkingSpots: Number(formData.parkingSpots || 0),
        hasElevator: isApartment ? formData.hasElevator : false,
        amenities: formData.amenities,
        cityId: "city-dakahlia",
        districtId: formData.districtId,
        addressDetails: formData.addressDetails.trim(),
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        locationPrivacy: formData.locationPrivacy,
        images: imageUrls,
        status: targetStatus,
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(data.property);
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (e) {}
      } else {
        setErrorMsg(data.error || "فشل حفظ العقار، يرجى مراجعة البيانات");
      }
    } catch (err: unknown) {
      setErrorMsg("حدث خطأ في الاتصال بالخادم، يرجى إعادة المحاولة");
    } finally {
      setSubmitting(false);
    }
  };

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
    const isPending = submitSuccess.status === "pending_review";
    return (
      <div className="max-w-3xl mx-auto px-4 py-12" dir="rtl">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm text-center space-y-6">
          <div
            className={`w-16 h-16 ${
              isPending ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
            } rounded-2xl flex items-center justify-center mx-auto shadow-inner`}
          >
            {isPending ? <Clock className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
          </div>

          <div className="space-y-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                isPending
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              {isPending ? "سجل المشاريع المقيدة ⏳" : "مسودة خاصة 📝"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {submitSuccess.status === "draft"
                ? "تم حفظ العقار كمسودة بنجاح!"
                : "تم إرسال المشروع للإدارة بنجاح!"}
            </h1>
            <p className="text-sm text-slate-600 font-medium max-w-lg mx-auto leading-relaxed">
              {submitSuccess.status === "draft"
                ? "تم حفظ تفاصيل العقار كمسودة سرية خاصة بك. يمكنك استكمال البيانات وتعديلها في أي وقت من لوحة التحكم."
                : "سُجل العقار في «سجل المشاريع المقيدة» لدى إدارة المنصة، وهو مسجل الآن في حسابك تحت بند «قيد المراجعة». بمجرد موافقة الإدارة على المشروع سيخرج تلقائياً من المشاريع المقيدة ويتحول مباشرة إلى بند «عقارات منشورة» ويصبح متاحاً للجمهور على الخريطة وقوائم البحث."}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-right max-w-md mx-auto space-y-2">
            <div className="text-xs text-slate-400 font-bold">العقار المسجل:</div>
            <div className="font-bold text-slate-800 text-sm">{submitSuccess.title}</div>
            <div className="text-xs text-brand-700 font-black flex items-center justify-between">
              <span>{submitSuccess.price?.toLocaleString("ar-EG")} ج.م</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  isPending ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                }`}
              >
                {isPending ? "بند قيد المراجعة (سجل المشاريع المقيدة)" : "مسودة خاصة"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard?status=pending_review"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition shadow-sm"
            >
              عرض العقار في بند قيد المراجعة باللوحة
            </Link>
            <Link
              href="/dashboard/properties?status=pending_review"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
            >
              صفحة إدارة عقاراتي
            </Link>
            <button
              onClick={() => {
                setSubmitSuccess(null);
                setStep(1);
                setImages([]);
                setFormData((prev) => ({ ...prev, title: "", description: "", price: "", areaSqM: "" }));
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-sm transition border border-slate-200"
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
        <div className="flex items-center gap-2">
          {lastAutoSaved && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Save className="w-3.5 h-3.5 text-emerald-600" />
              <span>محفوظ تلقائياً {lastAutoSaved}</span>
            </span>
          )}
          <Link
            href="/dashboard"
            className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
          >
            إلغاء والعودة
          </Link>
        </div>
      </div>

      {/* Draft Restoration Banner */}
      {draftAvailable && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-200 text-amber-800 rounded-xl shrink-0">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-amber-950">
                تم العثور على مسودة سابقة محفوظة تلقائياً على جهازك 💾
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {draftAvailable.formData?.title ? `العنوان: "${draftAvailable.formData.title}" • ` : ""}
                {draftAvailable.savedAt ? `آخر تعديل: ${new Date(draftAvailable.savedAt).toLocaleTimeString("ar-EG")}` : ""}
                {draftAvailable.images?.length ? ` • (${draftAvailable.images.length} صور مرفوعة)` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة المسودة</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition"
            >
              تجاهل ومسح
            </button>
          </div>
        </div>
      )}

      {/* Draft Restored Confirmation Notice */}
      {draftRestoredNotice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تم استعادة المسودة بنجاح! يمكنك الآن استكمال بياناتك ونشر العقار.</span>
        </div>
      )}

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
                <option value="land">أراضي / أرض</option>
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
              placeholder="مثال: قطعة أرض فضاء مميزة على شارع رئيسي في المنصورة أو منزل 3 أدوار بميت غمر"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الوصف التفصيلي *</label>
            <textarea
              rows={4}
              placeholder="اكتب مواصفات العقار أو الأرض، الأبعاد، الشوارع المحيطة، الواجهة، ترخيص البناء، الخدمات المتوفرة..."
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
                placeholder="مثال: 2500000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className={formData.category === "land" ? "sm:col-span-2 space-y-2" : ""}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  المساحة الإجمالية *
                </label>
                {formData.category === "land" && (
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setAreaUnitMode("sqm")}
                      className={`px-2 py-0.5 rounded-md transition ${
                        areaUnitMode === "sqm"
                          ? "bg-white text-brand-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      بالمتر المربع (م²)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAreaUnitMode("egyptian")}
                      className={`px-2 py-0.5 rounded-md transition ${
                        areaUnitMode === "egyptian"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      فدان / قيراط / سهم 🌾
                    </button>
                  </div>
                )}
              </div>

              {formData.category === "land" && areaUnitMode === "egyptian" ? (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                        فدان (Feddan)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={landUnits.feddan}
                        onChange={(e) => handleLandUnitChange("feddan", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                        قيراط (Qirat)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        placeholder="0"
                        value={landUnits.qirat}
                        onChange={(e) => handleLandUnitChange("qirat", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                        سهم (Sahm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        placeholder="0"
                        value={landUnits.sahm}
                        onChange={(e) => handleLandUnitChange("sahm", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {formData.areaSqM && (
                    <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-emerald-100/70 rounded-xl text-emerald-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                        <span>المساحة المحسوبة بقاعدة البيانات:</span>
                      </span>
                      <span className="font-mono text-emerald-800 font-black">
                        {Number(formData.areaSqM).toLocaleString("ar-EG")} م²
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="number"
                    placeholder="مثال: 175"
                    value={formData.areaSqM}
                    onChange={(e) => handleAreaSqmChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {formData.category === "land" && formData.areaSqM && Number(formData.areaSqM) > 0 && (
                    <div className="text-[11px] text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-lg flex items-center justify-between">
                      <span>يعادل تقريباً بالوحدات الزراعية:</span>
                      <span className="font-bold">
                        {convertSqmToEgyptianUnits(Number(formData.areaSqM)).summaryArabic}
                      </span>
                    </div>
                  )}
                </div>
              )}
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

          {/* Conditional 1: Land (أراضي) - Building Permit Choice */}
          {formData.category === "land" && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
              <div>
                <label className="block text-xs font-black text-emerald-950 mb-0.5">
                  تصريح وترخيص البناء *
                </label>
                <p className="text-[11px] text-emerald-800 font-medium">
                  حدد الموقف التنظيمي والرسمي لقطعة الأرض: هل يتوفر لها ترخيص بناء؟
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, hasBuildingPermit: true })}
                  className={`p-3.5 rounded-xl border text-right transition ${
                    formData.hasBuildingPermit
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-xs">مرخصة للبناء (يوجد ترخيص بناء رسمي) ✅</div>
                  <div className={`text-[11px] mt-0.5 ${formData.hasBuildingPermit ? "text-emerald-100" : "text-slate-500"}`}>
                    الأرض داخل الحيز العمراني ولديها رخصة وتصريح بناء قانوني
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, hasBuildingPermit: false })}
                  className={`p-3.5 rounded-xl border text-right transition ${
                    !formData.hasBuildingPermit
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-xs">غير مرخصة للبناء (بدون ترخيص حالياً) ⚠️</div>
                  <div className={`text-[11px] mt-0.5 ${!formData.hasBuildingPermit ? "text-amber-100" : "text-slate-500"}`}>
                    أرض فضاء أو لم يصدر لها ترخيص بناء رسمي بعد
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Conditional 2: House (بيت / منزل) - Total Floors */}
          {formData.category === "house" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-black text-brand-900 mb-1.5">
                  عدد الأدوار (إجمالي أدوار المنزل) *
                </label>
                <input
                  type="number"
                  placeholder="مثال: 3 أدوار"
                  min="1"
                  value={formData.totalFloors}
                  onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
                  className="w-full px-3 py-2 bg-brand-50/50 border border-brand-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">إجمالي غرف النوم</label>
                <input
                  type="number"
                  placeholder="مثال: 5"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">إجمالي الحمامات</label>
                <input
                  type="number"
                  placeholder="مثال: 3"
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
            </div>
          )}

          {/* Conditional 3: Apartment (شقة سكنية) */}
          {formData.category === "apartment" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الدور / الطابق</label>
                <input
                  type="number"
                  placeholder="مثال: 3"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">إجمالي أدوار المبنى</label>
                <input
                  type="number"
                  placeholder="مثال: 6"
                  value={formData.totalFloors}
                  onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">غرف النوم</label>
                <input
                  type="number"
                  placeholder="مثال: 3"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الحمامات</label>
                <input
                  type="number"
                  placeholder="مثال: 2"
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

              <div className="flex items-center gap-2 pt-6 col-span-2">
                <input
                  type="checkbox"
                  id="hasElevator"
                  checked={formData.hasElevator}
                  onChange={(e) => setFormData({ ...formData, hasElevator: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded"
                />
                <label htmlFor="hasElevator" className="text-xs font-bold text-slate-700 cursor-pointer">
                  يتوفر مصعد كهربائي (أسانسير) بالعمارة
                </label>
              </div>
            </div>
          )}

          {/* Conditional 4: Villa / Commercial / Office */}
          {(formData.category === "villa" || formData.category === "commercial_retail" || formData.category === "office") && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {formData.category === "villa" ? "عدد الأدوار" : "الدور / الطابق"}
                </label>
                <input
                  type="number"
                  placeholder="مثال: 2"
                  value={formData.category === "villa" ? formData.totalFloors : formData.floor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      [formData.category === "villa" ? "totalFloors" : "floor"]: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الحمامات</label>
                <input
                  type="number"
                  placeholder="مثال: 2"
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
                  <option value="fully_finished">تشطيب كامل</option>
                  <option value="semi_finished">نصف تشطيب</option>
                  <option value="core_and_shell">بدون تشطيب</option>
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
            2. الموقع الجغرافي وخريطة التحديد التفاعلية
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">المحافظة *</label>
                <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                  المحافظة الحصرية للنطاق
                </span>
              </div>
              <select
                value="city-dakahlia"
                disabled
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-not-allowed"
              >
                <option value="city-dakahlia">محافظة الدقهلية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المركز / الحي أو القرية (داخل الدقهلية) *</label>
              <select
                value={formData.districtId}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {(districts.filter((d) => !d.cityId || d.cityId === "city-dakahlia").length > 0
                  ? districts.filter((d) => !d.cityId || d.cityId === "city-dakahlia")
                  : districts
                ).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                العنوان التفصيلي واسم الشارع أو المعلم *
              </label>
              <button
                type="button"
                onClick={handleFetchAddressFromCoordinates}
                disabled={geocoding}
                className="text-[11px] text-brand-600 hover:text-brand-800 font-bold underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {geocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>استخراج عنوان مقترح من الخريطة (اختياري)</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="اكتب العنوان بدقة: مثال (مدينة ميت غمر - شارع الحرية بجوار البنك الأهلي)"
              value={formData.addressDetails}
              onChange={(e) => setFormData({ ...formData, addressDetails: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              💡 العنوان المكتوب بيدك هنا لن يتغير تلقائياً عند تحريك الدبوس على الخريطة لضمان كتابة الشارع والمعالم بدقة.
            </p>
          </div>

          {/* Interactive Map Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-600" />
                <span>خريطة التحديد المكاني (حدد موقع العقار بدقة)</span>
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
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                3. معرض الصور (بحد أقصى {MAX_IMAGES} صور للمشروع)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك تحديد عدة صور جملة واحدة من جهازك ورفعها دفعة واحدة
              </p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              images.length >= MAX_IMAGES
                ? "bg-amber-100 text-amber-800"
                : "bg-brand-50 text-brand-700"
            }`}>
              {images.length} من {MAX_IMAGES} صور
            </span>
          </div>

          {/* Compression Status Banner */}
          {compressionNotice && (
            <div className="flex items-center gap-2.5 p-3.5 bg-brand-50 border border-brand-200 rounded-2xl text-brand-900 text-xs font-bold animate-in fade-in shadow-2xs">
              <Sparkles className="w-4 h-4 text-brand-600 shrink-0 animate-pulse" />
              <span>{compressionNotice}</span>
            </div>
          )}

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-8 text-center transition bg-slate-50/50">
            <input
              type="file"
              id="property-image-input"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileUpload}
              disabled={uploadingImage || images.length >= MAX_IMAGES}
              className="hidden"
            />
            <label
              htmlFor="property-image-input"
              className={`cursor-pointer flex flex-col items-center justify-center gap-2 ${
                images.length >= MAX_IMAGES ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl shadow-sm">
                {uploadingImage ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>
              <div className="font-bold text-slate-800 text-sm">
                {uploadingImage
                  ? "جاري فحص وضغط ورفع الصور..."
                  : images.length >= MAX_IMAGES
                  ? `تم الوصول للحد الأقصى (${MAX_IMAGES} صور)`
                  : "انقر لاختيار حتى 6 صور جملة واحدة أو اسحبها هنا"}
              </div>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                ⚡ يتم ضغط الصور تلقائياً على جهازك قبل الرفع لتقليل حجمها بنسبة تصل إلى 85% مع الحفاظ على أعلى جودة.
              </p>
              <p className="text-[11px] text-slate-400">
                الأنواع المدعومة: JPG, PNG, WEBP, AVIF (متبقي لك {MAX_IMAGES - images.length} صور)
              </p>
            </label>
          </div>

          {/* Preview Gallery Grid with Drag & Drop Reordering */}
          {images.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <GripVertical className="w-4 h-4 text-brand-600" />
                  <span>ترتيب الصور بالسحب والإفلات (الصورة الأولى هي الغلاف دائماً):</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  💡 اسحب الصورة وأفلتها في المكان المطلوب، أو استخدم الأسهم
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {images.map((img, idx) => {
                  const isDragging = draggedImgIdx === idx;
                  const isDragOver = dragOverImgIdx === idx && draggedImgIdx !== idx;

                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-200 group cursor-grab active:cursor-grabbing select-none ${
                        isDragging ? "opacity-30 scale-95" : ""
                      } ${
                        isDragOver ? "border-brand-500 ring-4 ring-brand-200 scale-105 shadow-lg" : ""
                      } ${
                        img.isMain
                          ? "border-brand-600 ring-2 ring-brand-100 shadow-sm"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.filename}
                        className="w-full h-32 object-cover bg-slate-100 pointer-events-none"
                      />

                      {/* Number and Main Badge */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        {img.isMain ? (
                          <div className="bg-brand-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>الغلاف ⭐</span>
                          </div>
                        ) : (
                          <div className="bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </div>
                        )}
                      </div>

                      {/* Drag Grip Handle */}
                      <div className="absolute top-1.5 left-1.5 p-1 rounded bg-black/40 text-white/90 group-hover:bg-black/60 transition shadow-2xs">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      {/* Bottom Quick-Action Toolbar (Reordering & Delete) */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-1.5 flex items-center justify-between opacity-90 group-hover:opacity-100 transition">
                        <div className="flex items-center gap-0.5">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, "prev")}
                              className="p-1 rounded bg-white/20 hover:bg-white text-white hover:text-slate-900 transition text-[10px]"
                              title="تحريك للخلف (أقرب للغلاف)"
                            >
                              <MoveRight className="w-3 h-3" />
                            </button>
                          )}
                          {idx < images.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, "next")}
                              className="p-1 rounded bg-white/20 hover:bg-white text-white hover:text-slate-900 transition text-[10px]"
                              title="تحريك للأمام"
                            >
                              <MoveLeft className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {!img.isMain && (
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(idx)}
                              className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition"
                              title="تعيين كغلاف رئيسي"
                            >
                              <Star className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded transition"
                            title="حذف الصورة"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  {formData.transactionType === "sale" ? "للبيع" : "للإيجار"} • {
                    formData.category === "land" ? "أراضي / أرض" :
                    formData.category === "house" ? "بيت / منزل" :
                    formData.category === "villa" ? "فيلا مستقلة" :
                    formData.category === "apartment" ? "شقة سكنية" :
                    formData.category === "commercial_retail" ? "محل تجاري" : "مكتب إداري"
                  }
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
                <div className="text-xs text-slate-500 mt-1 font-semibold">
                  {formData.areaSqM} م²
                  {formData.category === "land" ? (
                    <>
                      <span className="mr-1 text-emerald-800 font-bold">
                        ({convertSqmToEgyptianUnits(Number(formData.areaSqM)).summaryArabic})
                      </span>
                      <span className="mr-1.5 text-emerald-700 font-bold">
                        • {formData.hasBuildingPermit ? "مرخصة للبناء ✅" : "بدون ترخيص بناء ⚠️"}
                      </span>
                    </>
                  ) : formData.category === "house" ? (
                    <span className="mr-1.5 font-bold">
                      • {formData.totalFloors || 1} أدوار
                    </span>
                  ) : formData.category === "apartment" ? (
                    <span className="mr-1.5">
                      • الدور {formData.floor || "-"} {formData.bedrooms ? `• ${formData.bedrooms} غرف` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
              {formData.description}
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pt-2 border-t border-slate-200">
              <Info className="w-4 h-4 text-brand-600 shrink-0" />
              <span>
                نوع الخصوصية: {formData.locationPrivacy === "exact" ? "موقع دقيق للجمهور" : "موقع تقريبي (نطاق 500م)"} • الصور: {images.length} صورة من أصل 6 • المزايا المختارة: {formData.amenities.length}
              </span>
            </div>
          </div>

          {/* Dual Action Buttons (Draft vs Submit to Admin Restricted Registry) */}
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
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  يُحفظ العقار في لوحة تحكمك فقط ولا يُعرض للإدارة أو الجمهور. يمكنك تعديله واستكماله لاحقاً.
                </p>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitListing("pending_review")}
                className="p-4 bg-gradient-to-r from-brand-700 to-brand-600 hover:from-brand-800 hover:to-brand-700 text-white rounded-xl text-right transition shadow-md disabled:opacity-50 relative overflow-hidden"
              >
                <div className="font-bold text-xs mb-1 flex items-center justify-between">
                  <span className="font-black text-white">إرسال للإدارة (سجل المشاريع المقيدة) 🚀</span>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <p className="text-[11px] text-brand-100 leading-relaxed">
                  يُرسل المشروع للإدارة في <strong>سجل المشاريع المقيدة</strong>، ويُسجل بحسابك في <strong>بند قيد المراجعة</strong>. وبمجرد الموافقة يخرج من المقيدة ويتحول لعقارات منشورة.
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
