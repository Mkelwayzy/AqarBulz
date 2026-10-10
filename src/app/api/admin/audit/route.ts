import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const auditEvents = dbStore.getAuditEvents();
    return NextResponse.json({ auditEvents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ في جلب سجل العمليات";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
