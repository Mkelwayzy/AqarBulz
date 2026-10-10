import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { ReportStatus } from "@/lib/db/types";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ReportStatus | null;
    const propertyId = searchParams.get("propertyId") || undefined;

    const reports = dbStore.getPropertyReports({
      status: status && status !== ("all" as any) ? status : undefined,
      propertyId,
    });

    const allProps = dbStore.getAllPropertiesForAdmin();
    const allUsers = dbStore.getAllUsersForAdmin();

    // Enrich reports with property title and advertiser info
    const enriched = reports.map((r) => {
      const prop = allProps.find((p) => p.id === r.propertyId);
      const adv = prop ? allUsers.find((u) => u.id === prop.advertiserId) : null;
      return {
        ...r,
        propertyTitle: prop?.title || "عقار محذوف أو غير معروف",
        propertySlug: prop?.slug,
        propertyStatus: prop?.status,
        propertyPrice: prop?.price,
        advertiserName: adv?.name || "معلن غير معروف",
        advertiserId: prop?.advertiserId,
      };
    });

    return NextResponse.json({ reports: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب قائمة البلاغات";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const body = await req.json();
    const { reportId, status, resolutionNotes } = body;

    if (!reportId || !status) {
      return NextResponse.json({ error: "معرف البلاغ والحالة الجديدة مطلوبان" }, { status: 400 });
    }

    const validStatuses: ReportStatus[] = ["pending", "investigating", "resolved", "dismissed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "حالة بلاغ غير صالحة" }, { status: 400 });
    }

    const updated = dbStore.resolvePropertyReport(reportId, status, user, resolutionNotes);

    return NextResponse.json({
      success: true,
      report: updated,
      message:
        status === "resolved"
          ? "تم حل البلاغ وإغلاقه بنجاح"
          : status === "dismissed"
          ? "تم رفض البلاغ وحفظه"
          : "تم تحديث حالة البلاغ بنجاح",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء معالجة البلاغ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
