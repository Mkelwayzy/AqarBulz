import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { ReportReasonCategory } from "@/lib/db/types";

const VALID_CATEGORIES: ReportReasonCategory[] = [
  "misleading_details",
  "duplicate_listing",
  "unavailable",
  "suspected_fraud",
  "other",
];

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { propertyId, reasonCategory, details, reporterName, reporterPhone } = body;

    if (!propertyId || typeof propertyId !== "string") {
      return NextResponse.json({ error: "معرف العقار مطلوب" }, { status: 400 });
    }

    if (!reasonCategory || !VALID_CATEGORIES.includes(reasonCategory)) {
      return NextResponse.json(
        { error: "يرجى تحديد سبب صحيح للبلاغ من القائمة المتاحة" },
        { status: 400 }
      );
    }

    if (!details || !details.trim()) {
      return NextResponse.json({ error: "تفاصيل البلاغ مطلوبة" }, { status: 400 });
    }

    const report = dbStore.createPropertyReport({
      propertyId,
      reporterId: user?.id,
      reporterName: user?.name || reporterName?.trim() || "مستخدم الزائر",
      reporterPhone: user?.phone || reporterPhone?.trim(),
      reasonCategory,
      details,
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: "تم استلام البلاغ وسيتم مراجعته بواسطة فريق الامتثال والإشراف",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء تقديم البلاغ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
