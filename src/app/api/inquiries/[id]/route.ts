import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const inquiry = dbStore.getInquiryById(params.id);
    if (!inquiry) {
      return NextResponse.json({ error: "طلب التواصل غير موجود" }, { status: 404 });
    }

    const isAdvertiser = inquiry.advertiserId === user.id;
    const isAdmin = user.role === "admin";
    if (!isAdvertiser && !isAdmin) {
      return NextResponse.json({ error: "غير مصرح بتعديل هذا الطلب" }, { status: 403 });
    }

    const { status } = await req.json();
    if (!status) {
      return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
    }

    const updated = dbStore.updateInquiryStatus(params.id, status, user.id, user.role);
    return NextResponse.json({ success: true, inquiry: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء تحديث حالة الطلب";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول لعرض تفاصيل طلب التواصل" }, { status: 401 });
    }

    const inquiry = dbStore.getInquiryById(params.id);
    if (!inquiry) {
      return NextResponse.json({ error: "طلب التواصل والمعاينة غير موجود" }, { status: 404 });
    }

    const isSeeker =
      inquiry.seekerId === user.id ||
      (Boolean(user.phone) && inquiry.seekerPhone === user.phone) ||
      (Boolean(user.email) && inquiry.seekerEmail === user.email);
    const isAdvertiser = inquiry.advertiserId === user.id;
    const isAdmin = user.role === "admin";

    if (!isSeeker && !isAdvertiser && !isAdmin) {
      return NextResponse.json({ error: "غير مصرح لك بالاطلاع على هذا الطلب" }, { status: 403 });
    }

    const messages = dbStore.getInquiryMessages(params.id);
    return NextResponse.json({ success: true, inquiry, messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب تفاصيل الطلب";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

