"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import architectureCatalog from "./catalog.json";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  BellRing,
  Building2,
  Boxes,
  Braces,
  Cable,
  Check,
  CircleUserRound,
  CircleHelp,
  Cloud,
  Database,
  FileCode2,
  Fingerprint,
  HardDrive,
  Heart,
  Layers3,
  LockKeyhole,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type LayerId = "screen" | "action" | "api" | "logic" | "storage" | "external";
type FlowCategory = "discovery" | "account" | "engagement" | "operations" | "intelligence";
type CatalogView = "diagram" | "screens" | "controls" | "api";

interface CatalogScreen {
  route: string;
  file: string;
  controls: number;
  audience: string;
  summary: string;
  references: string[];
}

interface CatalogControl {
  id: string;
  label: string;
  kind: string;
  screen: string;
  file: string;
  line: number;
  handler: string;
  destinations: string[];
  interaction: string;
}

interface CatalogApiRoute {
  route: string;
  file: string;
  methods: string[];
  tables: string[];
  stores: string[];
  services: string[];
}

interface ArchitectureCatalog {
  counts: { screens: number; apiRoutes: number; controls: number; controlFiles: number };
  screens: CatalogScreen[];
  controls: CatalogControl[];
  apiRoutes: CatalogApiRoute[];
  scope: string;
}

interface ArchitectureNode {
  id: string;
  label: string;
  subtitle: string;
  layer: LayerId;
  x: number;
  y: number;
  icon: LucideIcon;
  files: string[];
  description: string;
}

interface ArchitectureFlow {
  id: string;
  title: string;
  category: FlowCategory;
  summary: string;
  actions: string[];
  controlTargets: string[];
  nodes: string[];
  data: string;
  notes: string;
}

interface JourneyStage {
  title: string;
  detail: string;
  kind: "visitor" | "site" | "choice" | "contact" | "account" | "team" | "result";
  preview: "welcome" | "search" | "property" | "form" | "conversation" | "dashboard" | "review" | "insight" | "save";
}

const journeyStages: Record<string, JourneyStage[]> = {
  browse: [
    { title: "الزائر يدخل الموقع", detail: "تظهر له العقارات والخدمات المتاحة", kind: "visitor", preview: "welcome" },
    { title: "يبحث عن طلبه", detail: "يختار المنطقة والسعر ونوع العقار", kind: "choice", preview: "search" },
    { title: "يتصفح النتائج", detail: "تظهر العقارات الأقرب لاختياراته", kind: "site", preview: "property" },
    { title: "يفتح تفاصيل العقار", detail: "يرى الصور والسعر والموقع", kind: "site", preview: "property" },
    { title: "يتواصل مع المعلن", detail: "يرسل استفساره من صفحة العقار", kind: "contact", preview: "conversation" },
  ],
  publish: [
    { title: "المعلن يبدأ الإعلان", detail: "يفتح صفحة إضافة عقار", kind: "visitor", preview: "welcome" },
    { title: "يدخل بيانات العقار", detail: "السعر والمكان والوصف والتفاصيل", kind: "choice", preview: "form" },
    { title: "يرفع الصور", detail: "تُرفق الصور بالإعلان", kind: "site", preview: "property" },
    { title: "يرسل الإعلان", detail: "يصل للمراجعة قبل ظهوره للزوار", kind: "contact", preview: "dashboard" },
    { title: "يتابع حالة الإعلان", detail: "يعرف إن كان قيد المراجعة أو منشورًا", kind: "result", preview: "review" },
  ],
  "sign-in": [
    { title: "المستخدم يفتح الدخول", detail: "يكتب بريده الإلكتروني", kind: "visitor", preview: "welcome" },
    { title: "يطلب رمز التحقق", detail: "يصل الرمز إلى بريده", kind: "contact", preview: "form" },
    { title: "يُدخل الرمز", detail: "يتأكد الموقع من صحة الرمز", kind: "choice", preview: "form" },
    { title: "يفتح حسابه", detail: "تظهر له الصفحات المناسبة لحسابه", kind: "account", preview: "dashboard" },
  ],
  favorite: [
    { title: "يعثر على عقار", detail: "من نتائج البحث أو صفحة التفاصيل", kind: "visitor", preview: "property" },
    { title: "يضغط حفظ", detail: "يضيف العقار إلى قائمته الخاصة", kind: "choice", preview: "save" },
    { title: "يُحفظ في المفضلة", detail: "يرتبط العقار بحساب المستخدم", kind: "account", preview: "dashboard" },
    { title: "يرجع إليه لاحقًا", detail: "يفتح قائمته من صفحة حسابه", kind: "result", preview: "save" },
  ],
  inquiry: [
    { title: "يفتح صفحة العقار", detail: "يراجع الصور والسعر والوصف", kind: "visitor", preview: "property" },
    { title: "يرسل استفساره", detail: "يكتب رسالته أو يطلب التواصل", kind: "choice", preview: "form" },
    { title: "تصل الرسالة للمعلن", detail: "تُفتح محادثة مرتبطة بالعقار", kind: "contact", preview: "conversation" },
    { title: "يرد المعلن", detail: "تستمر المتابعة داخل المحادثة", kind: "account", preview: "dashboard" },
  ],
  services: [
    { title: "الزائر يختار خدمة", detail: "يتعرف على الخدمات المتاحة بالموقع", kind: "visitor", preview: "welcome" },
    { title: "يطلب التواصل", detail: "يترك بياناته وموافقته", kind: "choice", preview: "form" },
    { title: "يصل الطلب لفريق الدعم", detail: "يظهر في قائمة طلبات المتابعة", kind: "team", preview: "dashboard" },
    { title: "الفريق يتابع الطلب", detail: "يسجل حالة التواصل والمتابعة", kind: "result", preview: "review" },
  ],
  moderation: [
    { title: "المعلن يرسل إعلانًا", detail: "يظهر الإعلان بانتظار المراجعة", kind: "visitor", preview: "property" },
    { title: "الموظف يفتح لوحة الإدارة", detail: "يراجع بيانات الإعلان وصوره", kind: "team", preview: "dashboard" },
    { title: "يتخذ قرار المراجعة", detail: "يوافق أو يرفض أو يحذف حسب صلاحياته", kind: "choice", preview: "review" },
    { title: "تظهر النتيجة للمعلن", detail: "تتحدث حالة الإعلان في لوحته", kind: "result", preview: "dashboard" },
  ],
  cms: [
    { title: "الموظف يفتح إدارة المحتوى", detail: "يدخل إلى أدوات إدارة صفحات الموقع", kind: "team", preview: "dashboard" },
    { title: "يعدّل الصفحة أو الصور", detail: "يغيّر النصوص والهوية والوسائط", kind: "choice", preview: "form" },
    { title: "يحفظ التغييرات", detail: "تُسجل التعديلات وتُحدّث الصفحة", kind: "contact", preview: "review" },
    { title: "يراها زوار الموقع", detail: "يظهر المحتوى الجديد في الواجهة", kind: "result", preview: "welcome" },
  ],
  support: [
    { title: "يصل بلاغ أو طلب", detail: "من زائر أو مستخدم للموقع", kind: "visitor", preview: "form" },
    { title: "يفتحه فريق الدعم", detail: "يراجع التفاصيل من لوحة الإدارة", kind: "team", preview: "dashboard" },
    { title: "يتابع الحالة", detail: "يحدّث حالة البلاغ أو الطلب", kind: "choice", preview: "review" },
    { title: "يتم التواصل عند الحاجة", detail: "يتابع الفريق الطلب مع صاحبه", kind: "result", preview: "conversation" },
  ],
  smart: [
    { title: "المستخدم يختار ميزة", detail: "مثل مؤشر السوق أو مقارنة العقارات", kind: "visitor", preview: "welcome" },
    { title: "يدخل اختياراته", detail: "يحدد العقار أو المنطقة المطلوبة", kind: "choice", preview: "search" },
    { title: "الموقع يحسب ويحلل", detail: "يجمع المعلومات اللازمة للميزة", kind: "site", preview: "insight" },
    { title: "تظهر له النتيجة", detail: "ملخص يساعده على اتخاذ قراره", kind: "result", preview: "insight" },
  ],
};

const layers: Array<{ id: LayerId; label: string; color: string; icon: LucideIcon }> = [
  { id: "screen", label: "الشاشات", color: "cyan", icon: Layers3 },
  { id: "action", label: "الأزرار والإجراءات", color: "violet", icon: Activity },
  { id: "api", label: "واجهات API", color: "blue", icon: Braces },
  { id: "logic", label: "منطق الأعمال", color: "amber", icon: Workflow },
  { id: "storage", label: "التخزين", color: "emerald", icon: Database },
  { id: "external", label: "خدمات خارجية", color: "rose", icon: Cloud },
];

const nodes: ArchitectureNode[] = [
  {
    id: "home",
    label: "الرئيسية",
    subtitle: "تصفح وبحث",
    layer: "screen",
    x: 50,
    y: 105,
    icon: Layers3,
    files: ["src/app/page.tsx", "src/components/home/HomeHeroSearch.tsx"],
    description: "واجهة التصفح الرئيسية، تجمع الإعلانات وتفضيلات البحث والمحتوى المعرّف عبر CMS.",
  },
  {
    id: "listing",
    label: "إضافة عقار",
    subtitle: "نموذج الإعلان",
    layer: "screen",
    x: 50,
    y: 220,
    icon: FileCode2,
    files: ["src/app/dashboard/properties/new/page.tsx"],
    description: "نموذج نشر إعلان عقاري، يرفع الصور ثم يرسل بيانات الإعلان إلى خادم التطبيق.",
  },
  {
    id: "property",
    label: "تفاصيل العقار",
    subtitle: "عرض وتواصل",
    layer: "screen",
    x: 50,
    y: 335,
    icon: Boxes,
    files: ["src/app/properties/[slug]/page.tsx", "src/app/properties/[slug]/InquiryForm.tsx"],
    description: "صفحة التفاصيل وإجراءات الحفظ وإرسال استفسار أو بدء محادثة مع المعلن.",
  },
  {
    id: "services",
    label: "الخدمات",
    subtitle: "طلب تواصل",
    layer: "screen",
    x: 50,
    y: 450,
    icon: CircleHelp,
    files: ["src/app/services/page.tsx"],
    description: "يعرض الخدمات ويجمع طلب تواصل، دون أن يؤكد حجزًا أو سعرًا.",
  },
  {
    id: "admin",
    label: "لوحة الإدارة",
    subtitle: "مراجعة ومتابعة",
    layer: "screen",
    x: 50,
    y: 565,
    icon: ShieldCheck,
    files: ["src/app/admin/page.tsx", "src/components/admin/AdminProjectsTab.tsx", "src/components/admin/AdminSupportTab.tsx"],
    description: "أقسام إدارة العقارات والرسائل والدعم والتقييمات والمحتوى والموظفين.",
  },
  {
    id: "search",
    label: "بحث العقارات",
    subtitle: "زر البحث والفلاتر",
    layer: "action",
    x: 225,
    y: 105,
    icon: Search,
    files: ["src/app/page.tsx", "src/components/property/PropertyFiltersBar.tsx"],
    description: "طلب قراءة العقارات مع فلاتر البحث والصفحات، ثم إظهار النتائج وبيانات الخريطة.",
  },
  {
    id: "publish",
    label: "نشر إعلان",
    subtitle: "إرسال النموذج",
    layer: "action",
    x: 225,
    y: 220,
    icon: ArrowDownLeft,
    files: ["src/app/dashboard/properties/new/page.tsx"],
    description: "يرسل حقول الإعلان والصور؛ ويخضع الإعلان لحالة المراجعة والصلاحيات قبل النشر.",
  },
  {
    id: "login",
    label: "تسجيل الدخول",
    subtitle: "رمز تحقق OTP",
    layer: "action",
    x: 225,
    y: 335,
    icon: Fingerprint,
    files: ["src/app/login/page.tsx", "src/app/api/auth/email-otp/send/route.ts", "src/app/api/auth/email-otp/verify/route.ts"],
    description: "إرسال رمز مؤقت والتحقق منه، ثم إنشاء جلسة موقعة وربطها بحساب المستخدم وصلاحياته.",
  },
  {
    id: "favorite",
    label: "حفظ الإعلان",
    subtitle: "زر المفضلة",
    layer: "action",
    x: 225,
    y: 450,
    icon: Check,
    files: ["src/app/page.tsx", "src/app/api/favorites/route.ts"],
    description: "يتطلب حسابًا؛ يحفظ الإعلان في مفضلات المستخدم ويعيد الحالة للواجهة.",
  },
  {
    id: "inquiry",
    label: "إرسال استفسار",
    subtitle: "بدء محادثة",
    layer: "action",
    x: 225,
    y: 565,
    icon: MessageSquare,
    files: ["src/app/properties/[slug]/InquiryForm.tsx", "src/components/chat/InquiryChatModal.tsx"],
    description: "يرسل بيانات الاستفسار، ثم تُدار المحادثة والرسائل وحالة الرد عبر واجهات منفصلة.",
  },
  {
    id: "property-api",
    label: "العقارات",
    subtitle: "GET / POST / PATCH",
    layer: "api",
    x: 410,
    y: 105,
    icon: Braces,
    files: ["src/app/api/properties/route.ts", "src/app/api/properties/[id]/route.ts"],
    description: "يتحقق من المدخلات والصلاحيات ويتعامل مع قراءات العقارات وإنشاءها وتحديثها.",
  },
  {
    id: "auth-api",
    label: "المصادقة والجلسة",
    subtitle: "/api/auth/*",
    layer: "api",
    x: 410,
    y: 220,
    icon: LockKeyhole,
    files: ["src/app/api/auth/email-otp/send/route.ts", "src/app/api/auth/email-otp/verify/route.ts", "src/app/api/auth/me/route.ts"],
    description: "مسارات OTP والتحقق من الحساب وتحديث بيانات الجلسة والمستخدم.",
  },
  {
    id: "inquiry-api",
    label: "الاستفسارات",
    subtitle: "/api/inquiries/*",
    layer: "api",
    x: 410,
    y: 335,
    icon: MessageSquare,
    files: ["src/app/api/inquiries/route.ts", "src/app/api/inquiries/[id]/route.ts", "src/app/api/inquiries/[id]/messages/route.ts"],
    description: "إنشاء استفسار، الوصول للمحادثة، إرسال الرسائل، وتحديث حالات المتابعة.",
  },
  {
    id: "service-api",
    label: "طلبات الخدمات",
    subtitle: "POST /api/service-inquiries",
    layer: "api",
    x: 410,
    y: 450,
    icon: CircleHelp,
    files: ["src/app/api/service-inquiries/route.ts", "src/app/api/admin/service-inquiries/route.ts"],
    description: "يتحقق من بيانات التواصل وموافقتها، ويقيّد المحاولات، ثم يتيح للدعم متابعة الطلب.",
  },
  {
    id: "admin-api",
    label: "واجهات الإدارة",
    subtitle: "/api/admin/*",
    layer: "api",
    x: 410,
    y: 565,
    icon: ShieldCheck,
    files: ["src/app/api/admin/moderation/route.ts", "src/app/api/admin/staff/route.ts", "src/app/api/admin/reports/route.ts"],
    description: "مسارات محمية بحسب صلاحية الإجراء: المراجعة، الحذف، الدعم، المحتوى أو الموظفين.",
  },
  {
    id: "security",
    label: "التحقق والصلاحيات",
    subtitle: "جلسة • مدخلات • أدوار",
    layer: "logic",
    x: 595,
    y: 105,
    icon: LockKeyhole,
    files: ["src/lib/auth/session.ts", "src/lib/auth/security.ts", "src/lib/auth/admin-permissions.ts"],
    description: "يتحقق من الجلسات والمدخلات وحدود الطلبات، ويطبق صلاحيات الدور قبل التنفيذ.",
  },
  {
    id: "property-service",
    label: "خدمة العقارات",
    subtitle: "استعلامات ومراجعة",
    layer: "logic",
    x: 595,
    y: 220,
    icon: Workflow,
    files: ["src/lib/services/propertyService.ts"],
    description: "تجمع منطق استعلام العقار، وتستخدم Supabase عند تهيئته أو التخزين المحلي في التطوير.",
  },
  {
    id: "inquiry-service",
    label: "منطق المحادثات",
    subtitle: "توجيه وحالة الرد",
    layer: "logic",
    x: 595,
    y: 335,
    icon: Workflow,
    files: ["src/lib/services/inquiryResolver.ts", "src/lib/services/inquiry-response-state.ts", "src/lib/chat/messageReliability.ts"],
    description: "يربط الاستفسارات بالعقار وأطراف المحادثة ويتابع موثوقية الرسائل والردود.",
  },
  {
    id: "smart",
    label: "الميزات الذكية",
    subtitle: "تحليل • خريطة • تمويل",
    layer: "logic",
    x: 595,
    y: 450,
    icon: Sparkles,
    files: ["src/lib/db/smartFeaturesStore.ts", "src/lib/ratings/reputation.ts"],
    description: "خدمات الميزات الذكية للسوق والأحياء والمخططات والتقييمات والطلبات العكسية.",
  },
  {
    id: "audit",
    label: "سجل التدقيق",
    subtitle: "أحداث إدارية وطلبات",
    layer: "logic",
    x: 595,
    y: 565,
    icon: FileCode2,
    files: ["src/lib/db/store.ts", "src/app/api/visitor-log/route.ts", "src/app/api/service-inquiries/route.ts"],
    description: "يسجل أحداثًا قابلة للتتبع مثل تسجيل اهتمام الخدمات وإجراءات الإدارة.",
  },
  {
    id: "supabase",
    label: "Supabase",
    subtitle: "Postgres • Auth • Storage",
    layer: "storage",
    x: 790,
    y: 170,
    icon: Database,
    files: ["src/utils/supabase/server.ts", "supabase/migrations/"],
    description: "قاعدة البيانات المركزية للحسابات والعقارات والمحادثات والإعدادات، مع تخزين الملفات عند التهيئة.",
  },
  {
    id: "local",
    label: "التخزين المحلي",
    subtitle: "dbStore / JSON",
    layer: "storage",
    x: 790,
    y: 340,
    icon: HardDrive,
    files: ["src/lib/db/store.ts", ".data/aqarpulse_db.json"],
    description: "طبقة تطوير وبيانات محلية مستخدمة في تدفقات عديدة عند عدم تهيئة قاعدة Supabase.",
  },
  {
    id: "external",
    label: "رسائل وخدمات خارجية",
    subtitle: "بريد • SMS • خرائط",
    layer: "external",
    x: 990,
    y: 255,
    icon: BellRing,
    files: ["src/lib/services/emailService.ts", "src/lib/services/smsService.ts", "src/lib/services/whatsappService.ts", "src/lib/map/tileConfig.ts"],
    description: "تكاملات إرسال OTP والتنبيهات، ومصادر خرائط/ترميز جغرافي حسب إعدادات البيئة.",
  },
  {
    id: "user",
    label: "المستخدم",
    subtitle: "زائر • معلن • موظف",
    layer: "external",
    x: 990,
    y: 475,
    icon: UserRound,
    files: ["src/lib/db/types.ts"],
    description: "المستخدم يتفاعل مع الواجهة؛ وتحدد هويته وصلاحياته ما يمكن عرضه وتنفيذه.",
  },
];

const flows: ArchitectureFlow[] = [
  {
    id: "browse",
    title: "البحث عن عقار",
    category: "discovery",
    summary: "زر البحث والفلاتر يرسل معايير البحث والصفحة المطلوبة ثم يعرض النتائج.",
    actions: ["البحث", "تغيير الفلاتر", "الانتقال بين الصفحات", "فتح بطاقة إعلان"],
    controlTargets: [
      "GET /api/properties",
      "GET /api/properties?category=…&districtId=…&minPrice=…",
      "GET /api/properties?page=…&limit=…",
      "GET /api/properties/[id] أو /properties/[slug]",
    ],
    nodes: ["home", "search", "property-api", "security", "property-service", "supabase", "local"],
    data: "GET /api/properties → propertyService.queryPublicProperties() → Supabase أو dbStore بحسب الإعدادات والبيئة.",
    notes: "في الإنتاج، غياب قاعدة البيانات المركزية يؤدي إلى خطأ واضح بدل تحويل صامت لبيانات محلية.",
  },
  {
    id: "publish",
    title: "إضافة عقار وصوره",
    category: "account",
    summary: "إرسال نموذج العقار ورفع الصور يمر عبر تحقق الخادم، ثم يحفظ الإعلان بانتظار المراجعة.",
    actions: ["رفع الصور", "إرسال الإعلان", "الانتقال إلى صفحة الإعلان"],
    controlTargets: [
      "POST /api/upload → تخزين الصور وإرجاع مراجعها",
      "POST /api/properties → حفظ الإعلان بحالة مراجعة",
      "GET /projects/[id] أو /dashboard/properties?status=pending_review",
    ],
    nodes: ["listing", "publish", "property-api", "auth-api", "security", "property-service", "supabase", "local"],
    data: "POST /api/upload ثم POST /api/properties → التحقق من المستخدم والحقول → properties / property_images.",
    notes: "المسار الخلفي يحمي عمليات النشر. تظهر أزرار قبول الإعلان ورفضه للمسؤولين المخولين فقط.",
  },
  {
    id: "sign-in",
    title: "تسجيل الدخول برمز التحقق",
    category: "account",
    summary: "طلب الرمز ثم إدخاله يثبت ملكية البريد ويصدر جلسة مصادقًا عليها.",
    actions: ["إرسال رمز OTP", "تأكيد الرمز", "تسجيل الخروج"],
    controlTargets: [
      "POST /api/auth/email-otp/send → مزود البريد",
      "POST /api/auth/email-otp/verify → profiles/dbStore ثم جلسة",
      "POST /api/auth/logout → إبطال ملف الارتباط",
    ],
    nodes: ["login", "auth-api", "security", "supabase", "local", "external", "user"],
    data: "POST /api/auth/email-otp/send → مزود البريد؛ ثم verify → profiles/dbStore → جلسة موقعة.",
    notes: "مصدر الحساب هو ملف المستخدم المركزي عند تهيئة Supabase، مع استخدام dbStore في بيئات التطوير المحددة.",
  },
  {
    id: "favorite",
    title: "حفظ إعلان في المفضلة",
    category: "engagement",
    summary: "زر المفضلة يتحقق من الجلسة ثم يسجل العلاقة بين المستخدم والعقار.",
    actions: ["إضافة للمفضلة", "إزالة من المفضلة", "طلب تسجيل الدخول عند الحاجة"],
    controlTargets: [
      "POST /api/favorites → حفظ user_id + property_id",
      "DELETE /api/favorites?propertyId=… → إزالة العلاقة",
      "/login?redirect=… ثم العودة بعد المصادقة",
    ],
    nodes: ["home", "property", "favorite", "auth-api", "security", "supabase", "local", "user"],
    data: "POST/DELETE /api/favorites → مصادقة المستخدم → جدول/مخزن المفضلات.",
    notes: "قد توجه الواجهة المستخدم إلى تسجيل الدخول إذا لم يكن لديه جلسة صالحة.",
  },
  {
    id: "inquiry",
    title: "استفسار ومحادثة",
    category: "engagement",
    summary: "إنشاء الاستفسار يربطه بالعقار والمعلن والعميل، ثم تمر الرسائل بمسار مستقل.",
    actions: ["إرسال استفسار", "بدء محادثة", "إرسال رسالة", "تغيير الحالة"],
    controlTargets: [
      "POST /api/inquiries → إنشاء inquiry",
      "GET /api/inquiries/[id] → التحقق من أطراف المحادثة",
      "POST /api/inquiries/[id]/messages → إضافة رسالة",
      "PATCH /api/inquiries/[id] → تحديث الحالة",
    ],
    nodes: ["property", "inquiry", "inquiry-api", "security", "inquiry-service", "supabase", "local", "external", "user"],
    data: "POST /api/inquiries → inquiries؛ ثم /api/inquiries/[id]/messages → inquiry_messages.",
    notes: "تُطبّق صلاحيات الأطراف وصلاحية messages.read على الوصول الإداري للمحادثات.",
  },
  {
    id: "services",
    title: "طلب تواصل عن خدمة",
    category: "engagement",
    summary: "النموذج يتحقق من الموافقة ورقم الهاتف ويحد المحاولات، ثم يتيح لفريق الدعم متابعة الحالة.",
    actions: ["الاستفسار عن الخدمة", "إرسال طلب التواصل", "تحديث حالة الطلب"],
    controlTargets: [
      "فتح نموذج داخل /services",
      "POST /api/service-inquiries → audit_events",
      "PATCH /api/admin/service-inquiries → تسجيل حالة المتابعة",
    ],
    nodes: ["services", "service-api", "security", "audit", "supabase", "local", "admin"],
    data: "POST /api/service-inquiries → audit_events؛ لوحة الدعم تستخدم /api/admin/service-inquiries للقراءة والتحديث.",
    notes: "الطلب للاستفسار فقط؛ لا يسجل حجزًا أو سعرًا مؤكدًا.",
  },
  {
    id: "moderation",
    title: "مراجعة العقارات",
    category: "operations",
    summary: "أزرار الموافقة والرفض والحذف تنفذ إجراءات منفصلة بصلاحيات مستقلة.",
    actions: ["موافقة/رفض: projects.review", "حذف: projects.delete", "تحديث الحالة"],
    controlTargets: [
      "POST /api/admin/moderation → قرار مراجعة projects.review",
      "POST /api/admin/moderation → قرار حذف projects.delete",
      "PATCH /api/admin/properties → تحديث حالة الإعلان",
    ],
    nodes: ["admin", "admin-api", "security", "property-service", "supabase", "local", "user"],
    data: "GET /api/admin/properties ثم POST /api/admin/moderation أو PATCH /api/admin/properties.",
    notes: "الواجهة تخفي الأزرار غير المسموحة، والخادم يعيد التحقق من الصلاحية لكل إجراء.",
  },
  {
    id: "cms",
    title: "تحديث محتوى وهوية المنصة",
    category: "operations",
    summary: "حفظ إعدادات الهوية أو الصفحات يمر بصلاحية CMS ويسجل الإصدارات.",
    actions: ["حفظ إعدادات الهوية", "رفع/حذف وسائط", "حفظ صفحة"],
    controlTargets: [
      "PUT /api/admin/cms/settings → إعدادات الصفحة الرئيسية والهوية",
      "POST/DELETE /api/admin/cms/media → رفع أو حذف الوسائط",
      "PUT /api/admin/cms/pages → محتوى الصفحة وسجل الإصدارات",
    ],
    nodes: ["admin", "admin-api", "security", "audit", "supabase", "local", "user"],
    data: "PUT /api/admin/cms/settings أو /pages أو /media → cms settings / revisions / assets.",
    notes: "تتطلب الكتابة cms.edit، بينما قراءة إعدادات العرض لها مسار عام منفصل.",
  },
  {
    id: "support",
    title: "متابعة البلاغات والدعم",
    category: "operations",
    summary: "فريق الدعم يعرض البلاغات وطلبات الخدمات وسجل الزيارات، ويحدث الحالات المصرح بها.",
    actions: ["عرض البلاغات", "تغيير الحالة", "متابعة طلب خدمة", "التواصل هاتفيًا"],
    controlTargets: [
      "GET /api/admin/reports → قائمة البلاغات",
      "PATCH /api/admin/reports → تحديث حالة البلاغ",
      "GET/PATCH /api/admin/service-inquiries → متابعة طلب الخدمة",
      "رابط tel: محلي يفتح تطبيق الاتصال على الجهاز",
    ],
    nodes: ["admin", "admin-api", "service-api", "security", "audit", "supabase", "local", "user"],
    data: "واجهات /api/admin/reports و/service-inquiries و/visitor-log → بيانات البلاغات وسجل التدقيق.",
    notes: "المسارات الإدارية محمية بصلاحية support.manage؛ الاتصال الهاتفي يتم من رابط الجهاز.",
  },
  {
    id: "smart",
    title: "الميزات العقارية الذكية",
    category: "intelligence",
    summary: "الحاسبات والخرائط والتحليلات تتصل بمسارات مستقلة ثم تعيد النتائج للواجهة.",
    actions: ["حساب التمويل", "عرض مؤشر السوق", "البحث عن الأحياء", "طلب فحص"],
    controlTargets: [
      "POST /api/smart-features/financial/calculate",
      "GET /api/smart-features/market-index",
      "GET /api/smart-features/neighborhoods",
      "POST /api/smart-features/inspection/book",
    ],
    nodes: ["home", "property", "admin", "smart", "security", "supabase", "local", "external"],
    data: "/api/smart-features/* → منطق الميزة → قاعدة البيانات أو خدمات جغرافية/خارجية عند الحاجة.",
    notes: "تشمل المسارات المالية والمخططات والمجمعات والمؤشر السوقي وطلبات المعاينة.",
  },
];

const categoryLabels: Record<FlowCategory | "all", string> = {
  all: "كل التدفقات",
  discovery: "التصفح",
  account: "الحساب",
  engagement: "التواصل",
  operations: "الإدارة",
  intelligence: "الميزات الذكية",
};

const nodeById = new Map(nodes.map((node) => [node.id, node]));

const layerStyles: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  cyan: { border: "border-cyan-400/50", bg: "bg-cyan-400/10", text: "text-cyan-200", glow: "shadow-cyan-500/15" },
  violet: { border: "border-violet-400/50", bg: "bg-violet-400/10", text: "text-violet-200", glow: "shadow-violet-500/15" },
  blue: { border: "border-blue-400/50", bg: "bg-blue-400/10", text: "text-blue-200", glow: "shadow-blue-500/15" },
  amber: { border: "border-amber-400/50", bg: "bg-amber-400/10", text: "text-amber-200", glow: "shadow-amber-500/15" },
  emerald: { border: "border-emerald-400/50", bg: "bg-emerald-400/10", text: "text-emerald-200", glow: "shadow-emerald-500/15" },
  rose: { border: "border-rose-400/50", bg: "bg-rose-400/10", text: "text-rose-200", glow: "shadow-rose-500/15" },
};

const layerHeaderStyles: Record<LayerId, string> = {
  screen: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  action: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  api: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  logic: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  storage: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  external: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

function getNodeCenter(node: ArchitectureNode) {
  return { x: node.x + 75, y: node.y + 36 };
}

function getEdgePath(fromId: string, toId: string): string {
  const from = nodeById.get(fromId);
  const to = nodeById.get(toId);
  if (!from || !to) return "";
  const start = getNodeCenter(from);
  const end = getNodeCenter(to);
  const control = Math.max(44, Math.abs(end.x - start.x) * 0.45);
  return `M ${start.x} ${start.y} C ${start.x + control} ${start.y}, ${end.x - control} ${end.y}, ${end.x} ${end.y}`;
}

function ArchitectureCanvas({
  activeFlow,
  selectedNode,
  onSelectNode,
  animateSignal,
}: {
  activeFlow: ArchitectureFlow;
  selectedNode: string;
  onSelectNode: (id: string) => void;
  animateSignal: boolean;
}) {
  const activeEdges = activeFlow.nodes.slice(0, -1).map((nodeId, index) => [nodeId, activeFlow.nodes[index + 1]]);
  const activeNodeSet = new Set(activeFlow.nodes);

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-[#07111f] shadow-inner">
      <div className="relative h-[650px] min-w-[1180px] bg-[radial-gradient(circle_at_50%_45%,rgba(14,116,144,0.13),transparent_48%),linear-gradient(rgba(148,163,184,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.055)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1180 650" aria-hidden="true">
          <defs>
            <filter id="neural-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {activeEdges.map(([fromId, toId]) => {
            const path = getEdgePath(fromId, toId);
            const isActive = activeNodeSet.has(fromId) && activeNodeSet.has(toId);
            return (
              <g key={`${activeFlow.id}-${fromId}-${toId}`}>
                <path d={path} fill="none" stroke={isActive ? "#22d3ee" : "#233247"} strokeWidth={isActive ? 2 : 1} opacity={isActive ? 0.58 : 0.28} />
                {isActive && animateSignal && (
                  <>
                    <path d={path} fill="none" stroke="#67e8f9" strokeWidth="1" strokeDasharray="3 14" opacity="0.85" className="architecture-current" />
                    <circle r="4" fill="#a5f3fc" filter="url(#neural-glow)">
                      <animateMotion dur="2.8s" repeatCount="indefinite" path={path} />
                    </circle>
                  </>
                )}
              </g>
            );
          })}
        </svg>
        {layers.map((layer) => {
          const LayerIcon = layer.icon;
          return (
            <div key={layer.id} className="absolute top-4 text-center" style={{ left: `${(layer.id === "screen" ? 0 : layer.id === "action" ? 175 : layer.id === "api" ? 360 : layer.id === "logic" ? 545 : layer.id === "storage" ? 740 : 940)}px`, width: "150px" }}>
              <div className={`mx-auto flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${layerHeaderStyles[layer.id]}`}>
                <LayerIcon className="h-3.5 w-3.5" />
                {layer.label}
              </div>
            </div>
          );
        })}
        {nodes.map((node) => {
          const NodeIcon = node.icon;
          const style = layerStyles[layers.find((layer) => layer.id === node.layer)?.color || "cyan"];
          const isInFlow = activeNodeSet.has(node.id);
          const isSelected = selectedNode === node.id;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              aria-pressed={isSelected}
              className={`absolute flex h-[72px] w-[150px] items-center gap-2 rounded-2xl border px-2.5 text-right transition-all duration-300 ${
                isSelected
                  ? `${style.border}${style.bg} ${style.text} scale-[1.03] shadow-lg${style.glow} ring-1 ring-white/10`
                  : isInFlow
                    ? `${style.border} bg-slate-900/95 ${style.text} shadow-md${style.glow}`
                    : "border-slate-700/70 bg-slate-900/70 text-slate-500 opacity-65 hover:border-slate-500 hover:opacity-100"
              }`}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              title={node.description}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isInFlow ? style.bg : "bg-slate-800"}`}>
                <NodeIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-black">{node.label}</span>
                <span className="mt-0.5 block truncate text-[9px] opacity-70" dir="auto">{node.subtitle}</span>
              </span>
            </button>
          );
        })}
        <div className="absolute bottom-4 left-5 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-[10px] font-bold text-cyan-100">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
          الإشارة النشطة: {activeFlow.title}
        </div>
        <div className="absolute bottom-4 right-5 text-[10px] font-medium text-slate-500">اضغط أي عقدة لعرض ملفاتها ودورها</div>
      </div>
    </div>
  );
}

const journeyKindStyles: Record<JourneyStage["kind"], { label: string; className: string; Icon: LucideIcon }> = {
  visitor: { label: "الزائر", className: "bg-sky-100 text-sky-700", Icon: CircleUserRound },
  site: { label: "داخل الموقع", className: "bg-cyan-100 text-cyan-700", Icon: Building2 },
  choice: { label: "اختيارك", className: "bg-violet-100 text-violet-700", Icon: Search },
  contact: { label: "تواصل", className: "bg-amber-100 text-amber-700", Icon: MessageSquare },
  account: { label: "حسابك", className: "bg-indigo-100 text-indigo-700", Icon: UserRound },
  team: { label: "فريق المنصة", className: "bg-rose-100 text-rose-700", Icon: ShieldCheck },
  result: { label: "النتيجة", className: "bg-emerald-100 text-emerald-700", Icon: Check },
};

function JourneyPreview({ kind }: { kind: JourneyStage["preview"] }) {
  if (kind === "welcome" || kind === "search") {
    return (
      <div className="space-y-2 rounded-xl bg-slate-50 p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-600 text-[8px] font-black text-white">ع</span>
          <span className="text-[8px] font-black text-slate-700">عقارك يبدأ من هنا</span>
          <span className="mr-auto flex gap-0.5"><i className="h-1 w-1 rounded-full bg-slate-300" /><i className="h-1 w-1 rounded-full bg-slate-300" /><i className="h-1 w-1 rounded-full bg-slate-300" /></span>
        </div>
        <div className="rounded-lg bg-gradient-to-l from-cyan-100 to-sky-50 px-2 py-2">
          <div className="mb-2 h-1.5 w-2/3 rounded bg-slate-300" />
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1">
            <MapPin className="h-2.5 w-2.5 text-cyan-700" />
            <span className="h-1 w-12 rounded bg-slate-200" />
            <span className="mr-auto rounded bg-cyan-700 px-1.5 py-0.5 text-[7px] font-bold text-white">ابحث</span>
          </div>
        </div>
      </div>
    );
  }
  if (kind === "property" || kind === "save") {
    return (
      <div className="flex gap-2 rounded-xl bg-slate-50 p-2">
        <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 via-orange-200 to-rose-200">
          <Building2 className="absolute bottom-1 right-1 h-8 w-8 text-white/90 drop-shadow" />
          {kind === "save" && <Heart className="absolute left-1 top-1 h-3 w-3 fill-rose-500 text-rose-500" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 py-1">
          <span className="block h-1.5 w-4/5 rounded bg-slate-300" />
          <span className="block h-1 w-3/5 rounded bg-slate-200" />
          <span className="flex items-center gap-1 text-[8px] font-black text-cyan-700"><MapPin className="h-2.5 w-2.5" /> القاهرة</span>
          <span className="block h-1 w-2/5 rounded bg-amber-300" />
        </div>
      </div>
    );
  }
  if (kind === "form") {
    return (
      <div className="space-y-1.5 rounded-xl bg-slate-50 p-2.5">
        <div className="mb-2 flex items-center gap-1 text-[8px] font-bold text-slate-600"><MessageSquare className="h-3 w-3 text-cyan-700" /> نموذج التواصل</div>
        <span className="block h-5 rounded-md border border-slate-200 bg-white" />
        <span className="block h-5 rounded-md border border-slate-200 bg-white" />
        <span className="mr-auto block w-16 rounded-md bg-cyan-700 px-2 py-1 text-center text-[7px] font-bold text-white">إرسال الطلب</span>
      </div>
    );
  }
  if (kind === "conversation") {
    return (
      <div className="space-y-2 rounded-xl bg-slate-50 p-2.5">
        <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-600"><CircleUserRound className="h-3 w-3 text-cyan-700" /> محادثة حول عقار</div>
        <span className="block w-4/5 rounded-lg rounded-tr-sm bg-cyan-100 px-2 py-1.5 text-[7px] text-slate-600">هل العقار متاح؟</span>
        <span className="mr-auto block w-3/5 rounded-lg rounded-tl-sm bg-white px-2 py-1.5 text-[7px] text-slate-600">نعم، متاح</span>
      </div>
    );
  }
  if (kind === "dashboard" || kind === "review") {
    return (
      <div className="flex gap-2 rounded-xl bg-slate-50 p-2.5">
        <div className="flex w-8 flex-col items-center gap-1 rounded-lg bg-slate-800 py-2">
          <Building2 className="h-3 w-3 text-cyan-300" />
          <span className="h-1 w-3 rounded bg-slate-500" />
          <span className="h-1 w-3 rounded bg-slate-500" />
          <span className="h-1 w-3 rounded bg-slate-500" />
        </div>
        <div className="flex-1 space-y-1.5 py-1">
          <span className="block h-1.5 w-4/5 rounded bg-slate-300" />
          <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1.5 text-[7px] text-slate-500"><Building2 className="h-3 w-3 text-cyan-700" /> إعلان عقاري</span>
          <span className={`block w-14 rounded px-1.5 py-1 text-center text-[7px] font-bold ${kind === "review" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
            {kind === "review" ? "قيد المتابعة" : "لوحة التحكم"}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-50 to-cyan-50 p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm"><BarChart3 className="h-4 w-4" /></span>
      <div className="flex-1 space-y-1.5">
        <span className="block h-1.5 w-3/4 rounded bg-slate-300" />
        <span className="block h-1 w-1/2 rounded bg-slate-200" />
        <span className="block h-1.5 w-full rounded bg-gradient-to-l from-cyan-400 via-violet-300 to-amber-300" />
      </div>
    </div>
  );
}

function VisitorJourneyNetwork({
  flow,
  animateSignal,
}: {
  flow: ArchitectureFlow;
  animateSignal: boolean;
}) {
  const stages = journeyStages[flow.id] || journeyStages.browse;
  const stepWidth = 290;
  const cardWidth = 218;
  const canvasWidth = stages.length * stepWidth;
  const lineY = 20;
  const paths = stages.slice(0, -1).map((_, index) => {
    const startX = canvasWidth - index * stepWidth - cardWidth;
    const endX = canvasWidth - (index + 1) * stepWidth;
    return `M ${startX} ${lineY} C ${startX - 26} ${lineY}, ${endX + 26} ${lineY}, ${endX} ${lineY}`;
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-100 bg-[radial-gradient(ellipse_at_top,rgba(207,250,254,0.55),transparent_58%),linear-gradient(145deg,#f8fafc,#eef7fa)] p-4 shadow-inner sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-cyan-800">رحلة استخدام حقيقية داخل الموقع</p>
          <h2 className="mt-1 text-base font-black text-slate-900">{flow.title}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">{flow.summary}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-100 bg-white/80 px-3 py-2 text-[10px] font-bold text-slate-600">
          <span className={`h-2.5 w-2.5 rounded-full ${animateSignal ? "animate-pulse bg-cyan-500 shadow-[0_0_12px_#06b6d4]" : "bg-slate-300"}`} />
          {animateSignal ? "المسار يتحرك خطوة بخطوة" : "حركة المسار متوقفة"}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/80 bg-white/45" dir="rtl">
        <div className="relative h-[330px] min-w-full" style={{ width: `${canvasWidth}px` }}>
          <svg
            className="pointer-events-none absolute inset-0 h-full"
            style={{ width: `${canvasWidth}px` }}
            viewBox={`0 0 ${canvasWidth} 330`}
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <filter id="journey-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {paths.map((path, index) => (
              <g key={`${flow.id}-journey-${index}`}>
                <path d={path} stroke="#94dce5" strokeWidth="4" strokeLinecap="round" />
                <path d={path} stroke="#0891b2" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" opacity="0.7" />
                {animateSignal && (
                  <circle r="5" fill="#06b6d4" filter="url(#journey-glow)">
                    <animateMotion dur="2.1s" begin={`${index * 0.22}s`} repeatCount="indefinite" path={path} />
                  </circle>
                )}
                <circle cx={canvasWidth - (index + 1) * stepWidth} cy={lineY} r="4" fill="#fff" stroke="#0891b2" strokeWidth="2" />
              </g>
            ))}
          </svg>

          {stages.map((stage, index) => {
            const style = journeyKindStyles[stage.kind];
            const StageIcon = style.Icon;
            return (
              <article
                key={`${flow.id}-stage-${index}`}
                className="absolute top-[38px] w-[218px] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1"
                style={{ right: `${index * stepWidth}px` }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black ${style.className}`}>
                    <StageIcon className="h-3 w-3" />
                    {style.label}
                  </span>
                  <span className="text-[9px] font-black text-slate-300">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mb-1 text-xs font-black text-slate-900">{stage.title}</h3>
                <p className="mb-3 min-h-[30px] text-[9px] leading-relaxed text-slate-500">{stage.detail}</p>
                <JourneyPreview kind={stage.preview} />
              </article>
            );
          })}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[9px] font-bold text-slate-500">
            <ArrowLeft className="h-3 w-3 text-cyan-700" />
            اسحب أفقيًا لمتابعة الرحلة
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[...new Set(stages.map((stage) => stage.kind))].map((kind) => {
          const style = journeyKindStyles[kind];
          const RoleIcon = style.Icon;
          return (
            <span key={kind} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ${style.className}`}>
              <RoleIcon className="h-3 w-3" />
              {style.label}
            </span>
          );
        })}
        <span className="mr-auto inline-flex items-center gap-1 text-[9px] text-slate-500">
          <Upload className="h-3 w-3" /> البيانات تتحرك بين هذه الخطوات تلقائيًا
        </span>
      </div>
    </section>
  );
}

export default function AdminArchitecturePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState(flows[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState(flows[0].nodes[0]);
  const [category, setCategory] = useState<FlowCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [autoSignal, setAutoSignal] = useState(true);
  const [diagramMode, setDiagramMode] = useState<"simple" | "detailed">("simple");
  const [copied, setCopied] = useState(false);
  const [catalogView, setCatalogView] = useState<CatalogView>("diagram");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedScreen, setSelectedScreen] = useState("all");
  const [controlLimit, setControlLimit] = useState(60);

  const catalog = architectureCatalog as ArchitectureCatalog;
  const catalogQuery = catalogSearch.trim().toLocaleLowerCase("ar");
  const matchingScreens = catalog.screens.filter((screen) =>
    [screen.route, screen.file, screen.summary, ...screen.references]
      .some((value) => value.toLocaleLowerCase("ar").includes(catalogQuery))
  );
  const matchingControls = catalog.controls.filter((control) => {
    const matchesScreen = selectedScreen === "all" || control.screen === selectedScreen || control.file === selectedScreen;
    const matchesQuery = !catalogQuery || [
      control.label,
      control.kind,
      control.screen,
      control.file,
      control.handler,
      control.interaction,
      ...control.destinations,
    ].some((value) => value.toLocaleLowerCase("ar").includes(catalogQuery));
    return matchesScreen && matchesQuery;
  });
  const matchingApiRoutes = catalog.apiRoutes.filter((route) =>
    [route.route, route.file, ...route.methods, ...route.tables, ...route.stores, ...route.services]
      .some((value) => value.toLocaleLowerCase("ar").includes(catalogQuery))
  );

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("تعذر التحقق من الجلسة");
        const data = await response.json();
        if (!data.user || data.user.role !== "admin") {
          router.replace("/login?redirect=%2Fadmin%2Farchitecture");
          return;
        }
        if (isMounted) setIsAdmin(true);
      })
      .catch(() => router.replace("/login?redirect=%2Fadmin%2Farchitecture"))
      .finally(() => {
        if (isMounted) setChecking(false);
      });
    return () => { isMounted = false; };
  }, [router]);

  const visibleFlows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    return flows.filter((flow) => {
      const matchesCategory = category === "all" || flow.category === category;
      const matchesSearch = !query || [
        flow.title,
        flow.summary,
        flow.data,
        ...flow.actions,
        ...flow.controlTargets,
        ...flow.nodes.map((id) => nodeById.get(id)?.label || ""),
        ...flow.nodes.flatMap((id) => nodeById.get(id)?.files || []),
      ].some((value) => value.toLocaleLowerCase("ar").includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  const activeFlow = flows.find((flow) => flow.id === activeFlowId) || flows[0];
  const selectedNode = nodeById.get(selectedNodeId) || nodeById.get(activeFlow.nodes[0])!;

  useEffect(() => {
    if (!visibleFlows.length) return;
    if (!visibleFlows.some((flow) => flow.id === activeFlowId)) {
      setActiveFlowId(visibleFlows[0].id);
      setSelectedNodeId(visibleFlows[0].nodes[0]);
    }
  }, [activeFlowId, visibleFlows]);

  const selectFlow = (flow: ArchitectureFlow) => {
    setActiveFlowId(flow.id);
    setSelectedNodeId(flow.nodes[0]);
  };

  const copyFlowDetails = async () => {
    const text = [
      activeFlow.title,
      activeFlow.summary,
      `الإجراءات: ${activeFlow.actions.map((action, index) => `${action} → ${activeFlow.controlTargets[index] || "المسار موضح في المخطط"}`).join("\n")}`,
      `مسار البيانات: ${activeFlow.data}`,
      `الملفات: ${activeFlow.nodes.flatMap((id) => nodeById.get(id)?.files || []).join("، ")}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (checking || !isAdmin) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-950 text-white" dir="rtl">
        <div className="text-center">
          <Activity className="mx-auto mb-3 h-8 w-8 animate-pulse text-cyan-300" />
          <p className="text-sm font-bold text-slate-300">جارٍ التحقق من صلاحية عرض المخطط...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-3 py-5 pb-32 text-slate-100 sm:px-6" dir="rtl">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <Workflow className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                خريطة تفاعلية للموقع
              </div>
              <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">رحلة المستخدم داخل الموقع</h1>
              <p className="mt-1 text-xs text-slate-400">شاهد كيف ينتقل الزائر من تصفح العقار إلى التواصل، أو كيف يتابع فريق الموقع الطلب.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoSignal((value) => !value)}
              aria-pressed={autoSignal}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${autoSignal ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-slate-700 bg-slate-800 text-slate-300"}`}
            >
              <Activity className="h-3.5 w-3.5" />
              الإشارة {autoSignal ? "تعمل" : "متوقفة"}
            </button>
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700">
              <ArrowRight className="h-3.5 w-3.5" />
              لوحة الإدارة
            </Link>
          </div>
        </header>

 main
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "رحلات الاستخدام", value: flows.length, icon: Cable },
            { label: "أقسام الموقع المترابطة", value: nodes.length, icon: Boxes },
            { label: "أدوار تستخدم الموقع", value: "زائر • مستخدم • فريق", icon: Layers3 },
            { label: "الرحلة الحالية", value: categoryLabels[activeFlow.category], icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-cyan-200"><Icon className="h-4 w-4" /></span>
              <div>
                <p className="text-[10px] font-bold text-slate-500">{label}</p>
                <p className="mt-0.5 text-sm font-black text-slate-100">{value}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "شاشات مفهرسة", value: catalog.counts.screens, icon: Layers3 },
            { label: "أزرار وروابط بالموقع", value: catalog.counts.controls, icon: Activity },
            { label: "طرق تواصل الموقع مع بياناته", value: catalog.counts.apiRoutes, icon: Braces },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-cyan-200"><Icon className="h-4 w-4" /></span>
              <div>
                <p className="text-[10px] font-bold text-slate-500">{label}</p>
                <p className="mt-0.5 text-sm font-black text-slate-100">{value}</p>
              </div>
            </div>
          ))}
        </section>

        <nav aria-label="أقسام خريطة النظام" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
          {([
            ["diagram", "الرسم التفاعلي"],
            ["screens", "الشاشات والرحلات"],
            ["controls", "الأزرار والإجراءات"],
            ["api", "ما يحدث خلف الكواليس"],
          ] as Array<[CatalogView, string]>).map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => setCatalogView(view)}
              aria-pressed={catalogView === view}
              className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition ${catalogView === view ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {catalogView === "diagram" && <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-black text-white">استكشف مسارات البيانات</h2>
              <p className="mt-1 text-xs text-slate-400">اختر رحلة أدناه أو ابحث باسم زر، API، ملف أو خدمة.</p>
            </div>
            <label className="relative block w-full xl:max-w-sm">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث عن زر أو مسار أو ملف..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-3 pr-10 text-xs font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
              />
              {search && <button type="button" onClick={() => setSearch("")} aria-label="مسح البحث" className="absolute left-2 top-2 rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-3.5 w-3.5" /></button>}
            </label>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {(Object.entries(categoryLabels) as Array<[FlowCategory | "all", string]>).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                aria-pressed={category === id}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${category === id ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100" : "border-slate-700 bg-slate-950/40 text-slate-400 hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {visibleFlows.map((flow, index) => (
              <button
                key={flow.id}
                type="button"
                onClick={() => selectFlow(flow)}
                aria-pressed={activeFlow.id === flow.id}
                className={`min-w-[190px] shrink-0 rounded-2xl border p-3 text-right transition ${activeFlow.id === flow.id ? "border-cyan-300/50 bg-cyan-300/10 shadow-lg shadow-cyan-950/30" : "border-slate-800 bg-slate-950/50 hover:border-slate-600"}`}
              >
                <span className="mb-2 flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-[10px] font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400">{categoryLabels[flow.category]}</span>
                </span>
                <span className={`block text-xs font-black ${activeFlow.id === flow.id ? "text-cyan-100" : "text-slate-200"}`}>{flow.title}</span>
                <span className="mt-1 block line-clamp-2 text-[10px] leading-relaxed text-slate-500">{flow.summary}</span>
              </button>
            ))}
            {visibleFlows.length === 0 && <p className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-400">لا توجد مسارات تطابق البحث.</p>}
          </div>

          {visibleFlows.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-relaxed text-slate-400">
                {diagramMode === "simple"
                  ? "عرض مبسط: بطاقات تشبه صفحات الموقع، والأسهم تشرح انتقال المستخدم."
                  : "عرض تفصيلي: يوضح مكونات الموقع الداخلية والملفات المرتبطة."}
              </p>
              <div className="inline-flex w-fit rounded-xl border border-slate-700 bg-slate-950/60 p-1">
                <button
                  type="button"
                  onClick={() => setDiagramMode("simple")}
                  aria-pressed={diagramMode === "simple"}
                  className={`rounded-lg px-3 py-2 text-[10px] font-bold transition ${diagramMode === "simple" ? "bg-cyan-300/15 text-cyan-100" : "text-slate-400 hover:text-white"}`}
                >
                  شرح بصري مبسط
                </button>
                <button
                  type="button"
                  onClick={() => setDiagramMode("detailed")}
                  aria-pressed={diagramMode === "detailed"}
                  className={`rounded-lg px-3 py-2 text-[10px] font-bold transition ${diagramMode === "detailed" ? "bg-cyan-300/15 text-cyan-100" : "text-slate-400 hover:text-white"}`}
                >
                  تفاصيل النظام
                </button>
              </div>
            </div>
          )}
        </section>}

        {catalogView === "diagram" && visibleFlows.length > 0 && (
          <>
            {diagramMode === "simple" ? (
              <VisitorJourneyNetwork flow={activeFlow} animateSignal={autoSignal} />
            ) : (
              <ArchitectureCanvas
                activeFlow={activeFlow}
                selectedNode={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                animateSignal={autoSignal}
              />
            )}

            {diagramMode === "detailed" ? <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <article className="rounded-3xl border border-cyan-400/20 bg-slate-900/85 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-cyan-200">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                      مسار الإشارة الحالي
                    </div>
                    <h2 className="mt-2 text-lg font-black text-white">{activeFlow.title}</h2>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">{activeFlow.summary}</p>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(categoryLabels) as Array<FlowCategory | "all">).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${category === cat ? "bg-cyan-400 text-slate-950 shadow-md" : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"}`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث في التدفقات والإجراءات..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-9 pl-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setCatalogView("diagram")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${catalogView === "diagram" ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  المخطط
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogView("screens")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${catalogView === "screens" ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  الفهرس ({catalog.counts.screens})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogView("controls")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${catalogView === "controls" ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  العناصر ({catalog.counts.controls})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogView("api")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${catalogView === "api" ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  API ({catalog.counts.apiRoutes})
                </button>
              </div>
            </div>
          </div>

          {catalogView === "diagram" && (
            <>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {visibleFlows.map((flow) => {
                  const isSelected = flow.id === activeFlow.id;
                  return (
                    <button
                      key={flow.id}
                      type="button"
                      onClick={() => selectFlow(flow)}
                      className={`shrink-0 rounded-2xl border px-4 py-2.5 text-right transition ${
                        isSelected
                          ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200 shadow-lg shadow-cyan-500/10"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="text-xs font-bold">{flow.title}</div>
                      <div className="mt-0.5 text-[10px] opacity-70">{flow.actions.length} إجراءات</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <ArchitectureCanvas
                  activeFlow={activeFlow}
                  selectedNode={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                  animateSignal={autoSignal}
                />
              </div>

              <div className="mt-4 grid gap-5 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">تفاصيل التدفق النشط</span>
                    <button
                      type="button"
                      onClick={copyFlowDetails}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-800"
                    >
                      {copied ? "تم النسخ!" : "نسخ التفاصيل"}
                    </button>
 main
                  </div>
                  <h2 className="mt-2 text-base font-black text-white">{activeFlow.title}</h2>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{activeFlow.summary}</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-bold text-slate-300">الإجراءات ونقاط الهدف:</div>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      {activeFlow.actions.map((action, index) => (
                        <li key={action} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          <div>
                            <span className="font-bold text-slate-200">{action}</span>
                            <span className="block text-[11px] text-cyan-300/80">{activeFlow.controlTargets[index] || "مسار قياسي"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs font-bold text-cyan-300">مسار تدفق البيانات</span>
                  <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300 font-mono leading-relaxed" dir="ltr">
                    {activeFlow.data}
                  </div>
                  <div className="mt-4">
                    <span className="text-[11px] font-bold text-slate-300">ملاحظات المعمارية:</span>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{activeFlow.notes}</p>
                  </div>
                </div>
 main
              </article>
            </section> : (
              <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/65 p-4 sm:grid-cols-3 sm:p-5">
                <div>
                  <p className="text-[10px] font-bold text-slate-500">من يبدأ الرحلة؟</p>
                  <p className="mt-1 text-xs font-black text-white">{journeyStages[activeFlow.id]?.[0]?.title || "زائر الموقع"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500">ما الذي يحدث؟</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{activeFlow.summary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500">كيف ترى التفاصيل الدقيقة؟</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">اختر «تفاصيل النظام» أو افتح فهارس الشاشات والأزرار وواجهات الموقع.</p>
                </div>
              </section>
            )}
          </>
        )}

        {catalogView !== "diagram" && (
          <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-black text-white">
                  {catalogView === "screens" ? "فهرس الشاشات والرحلات" : catalogView === "controls" ? "فهرس الأزرار وعناصر التفاعل" : "فهرس واجهات الخادم والتخزين"}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {catalogView === "screens"
                    ? `${matchingScreens.length} شاشة؛ اختر شاشة لعرض عناصرها التفاعلية ومسارات API التي تستدعيها.`
                    : catalogView === "controls"
                      ? `${matchingControls.length} إجراء مطابق؛ الوجهات تؤخذ من الروابط والمعالجات الثابتة في المصدر.`
                      : `${matchingApiRoutes.length} مسارًا مطابقًا؛ يعرض تفاصيل انتقال طلبات الموقع إلى البيانات والخدمات.`}
                </p>


                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs font-bold text-cyan-300">العقدة المختارة: {selectedNode.label}</span>
                  <h3 className="mt-2 text-sm font-black text-white">{selectedNode.subtitle}</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{selectedNode.description}</p>
                  
                  <div className="mt-4">
                    <span className="text-[11px] font-bold text-slate-300">الملفات المسؤولة:</span>
                    <ul className="mt-2 space-y-1">
                      {selectedNode.files.map((file) => (
                        <li key={file} className="rounded-lg bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-cyan-200" dir="ltr">
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
 main
              </div>
            </>
          )}

          {catalogView === "screens" && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-white">فهرس الشاشات والمسارات ({matchingScreens.length})</h2>
                  <p className="text-xs text-slate-400">تجميع شامل لجميع صفحات التطبيق ومساراتها وملفاتها.</p>
                </div>
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="ابحث في الشاشات..."
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none sm:w-64"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matchingScreens.map((screen) => (
                  <div key={screen.file} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-cyan-500/10 px-2 py-1 font-mono text-[10px] font-bold text-cyan-300" dir="ltr">{screen.route}</span>
                        <span className="text-[11px] text-slate-400">{screen.controls} عنصر تفاعل</span>
                      </div>
                      <h3 className="mt-3 text-sm font-black text-white" dir="ltr">{screen.file}</h3>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">{screen.summary}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>الجمهور: {screen.audience}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {catalogView === "controls" && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-white">فهرس عناصر التفاعل والأزرار ({matchingControls.length})</h2>
                  <p className="text-xs text-slate-400">الأزرار، النماذج، والروابط البرمجية في واجهات المنصة.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedScreen}
                    onChange={(e) => setSelectedScreen(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="all">كل الشاشات والمكونات</option>
                    {catalog.screens.map((screen) => <option key={screen.file} value={screen.file}>{screen.route}</option>)}
                    {catalog.controls
                      .filter((control) => control.screen.startsWith("مكوّن /"))
                      .map((control) => control.file)
                      .filter((file, index, self) => self.indexOf(file) === index)
                      .map((file) => <option key={file} value={file}>{file.replace(/^src\/components\//, "مكوّن / ")}</option>)
                    }
                  </select>
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="ابحث في العناصر..."
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none sm:w-52"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-right text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900 text-slate-400">
                    <tr>
                      <th className="p-3 font-bold">العنصر والتسمية</th>
                      <th className="p-3 font-bold">النوع</th>
                      <th className="p-3 font-bold">الشاشة / المكون</th>
                      <th className="p-3 font-bold">معالج الحدث (Handler)</th>
                      <th className="p-3 font-bold">الوجهة / التأثير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {matchingControls.slice(0, controlLimit).map((control) => (
                      <tr key={control.id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-bold text-white">
                          {control.label}
                          <span className="block font-mono text-[10px] font-normal text-slate-500" dir="ltr">{control.id}</span>
                        </td>
                        <td className="p-3">
                          <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-300">{control.kind}</span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-cyan-200" dir="ltr">{control.screen}</td>
                        <td className="p-3 font-mono text-[11px] text-amber-300" dir="ltr">{control.handler}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {control.destinations.map((dest) => (
                              <span key={dest} className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-300" dir="ltr">{dest}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {matchingControls.length > controlLimit && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setControlLimit((limit) => limit + 60)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
                  >
                    عرض المزيد من العناصر ({matchingControls.length - controlLimit} متبقية)
                  </button>
                </div>
              )}
            </div>
          )}

          {catalogView === "api" && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-white">فهرس واجهات الخادم API Routes ({matchingApiRoutes.length})</h2>
                  <p className="text-xs text-slate-400">مسارات الواجهة الخلفية والربط مع قواعد البيانات والجداول.</p>
                </div>
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="ابحث في مسارات API..."
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none sm:w-64"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {matchingApiRoutes.map((route) => (
                  <div key={route.file} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-300" dir="ltr">{route.route}</span>
                      <div className="flex gap-1">
                        {route.methods.map((method) => (
                          <span key={method} className="rounded-md bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-300">{method}</span>
                        ))}
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-slate-400" dir="ltr">{route.file}</div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div>
                        <span className="font-bold text-slate-400">الجداول:</span>
                        <div className="mt-1 flex flex-wrap gap-1 font-mono text-emerald-300">
                          {route.tables.length ? route.tables.map((t) => <span key={t} className="rounded bg-slate-900 px-1.5 py-0.5">{t}</span>) : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400">المتاجر/الخدمات:</span>
                        <div className="mt-1 flex flex-wrap gap-1 font-mono text-amber-300">
                          {route.stores.length || route.services.length ? [...route.stores, ...route.services].map((s) => <span key={s} className="rounded bg-slate-900 px-1.5 py-0.5">{s}</span>) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
