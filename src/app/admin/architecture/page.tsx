"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  BarChart3,
  BellRing,
  Boxes,
  Braces,
  Cable,
  Check,
  CircleHelp,
  Cloud,
  Database,
  FileCode2,
  Fingerprint,
  HardDrive,
  Layers3,
  LockKeyhole,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type LayerId = "screen" | "action" | "api" | "logic" | "storage" | "external";
type FlowCategory = "discovery" | "account" | "engagement" | "operations" | "intelligence";

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
                  ? `${style.border} ${style.bg} ${style.text} scale-[1.03] shadow-lg ${style.glow} ring-1 ring-white/10`
                  : isInFlow
                    ? `${style.border} bg-slate-900/95 ${style.text} shadow-md ${style.glow}`
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

export default function AdminArchitecturePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState(flows[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState(flows[0].nodes[0]);
  const [category, setCategory] = useState<FlowCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [autoSignal, setAutoSignal] = useState(true);
  const [copied, setCopied] = useState(false);

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
                خريطة البنية ومسارات البيانات
              </div>
              <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">الجهاز العصبي للمنصة</h1>
              <p className="mt-1 text-xs text-slate-400">اختر رحلة أو إجراءً لترى انتقال البيانات بين الواجهة والخادم والمنطق والتخزين.</p>
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
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800">
              <ArrowRight className="h-3.5 w-3.5" />
              العودة للوحة الإدارة
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "رحلات موثقة", value: flows.length, icon: Cable },
            { label: "عقد في الخريطة", value: nodes.length, icon: Boxes },
            { label: "طبقات النظام", value: layers.length, icon: Layers3 },
            { label: "المسار المحدد", value: categoryLabels[activeFlow.category], icon: BarChart3 },
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

        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
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
        </section>

        {visibleFlows.length > 0 && (
          <>
            <ArchitectureCanvas
              activeFlow={activeFlow}
              selectedNode={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              animateSignal={autoSignal}
            />

            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <article className="rounded-3xl border border-cyan-400/20 bg-slate-900/85 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-cyan-200">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                      مسار الإشارة الحالي
                    </div>
                    <h2 className="mt-2 text-lg font-black text-white">{activeFlow.title}</h2>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">{activeFlow.summary}</p>
                  </div>
                  <button type="button" onClick={copyFlowDetails} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 transition hover:bg-slate-800">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <FileCode2 className="h-3.5 w-3.5" />}
                    {copied ? "تم النسخ" : "نسخ تفاصيل المسار"}
                  </button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <h3 className="text-[11px] font-black text-slate-200">الأزرار والإجراءات في هذه الرحلة</h3>
                    <ul className="mt-3 space-y-2">
                      {activeFlow.actions.map((action, index) => (
                        <li key={action} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300 shadow-[0_0_8px_#c4b5fd]" />
                          <span className="min-w-0">
                            <span className="block font-bold text-slate-200">{action}</span>
                            <code dir="ltr" className="mt-1 block break-all text-left text-[10px] text-cyan-200">{activeFlow.controlTargets[index] || "التفاصيل ضمن العقدة المحددة"}</code>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <h3 className="text-[11px] font-black text-slate-200">وجهة البيانات</h3>
                    <p className="mt-3 text-[11px] leading-6 text-cyan-100" dir="ltr">{activeFlow.data}</p>
                    <p className="mt-3 border-t border-slate-800 pt-3 text-[10px] leading-relaxed text-amber-100/80">{activeFlow.notes}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-800 bg-slate-900/85 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black text-slate-500">العقدة المحددة</span>
                    <h2 className="mt-1 text-base font-black text-white">{selectedNode.label}</h2>
                    <p className="mt-1 text-[10px] text-cyan-200">{layers.find((layer) => layer.id === selectedNode.layer)?.label}</p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><selectedNode.icon className="h-4 w-4" /></span>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-400">{selectedNode.description}</p>
                <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
                  <h3 className="text-[10px] font-black text-slate-300">الملفات والمسارات المرتبطة</h3>
                  {selectedNode.files.map((file) => (
                    <code key={file} dir="ltr" className="block break-all rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-left text-[10px] text-emerald-200">{file}</code>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}

        <footer className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-[10px] leading-relaxed text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>المخطط يوضح المسارات الرئيسية المكتشفة في المصدر؛ قد تختلف وجهة التخزين بحسب إعدادات البيئة.</span>
          <span className="inline-flex items-center gap-1.5"><MessageSquare className="h-3 w-3" /> اضغط الرحلات والعقد للتنقل بين التدفقات وملفاتها.</span>
        </footer>
      </div>
    </main>
  );
}
