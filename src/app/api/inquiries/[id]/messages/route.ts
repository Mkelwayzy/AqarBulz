import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول لعرض رسائل المحادثة" }, { status: 401 });
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
      return NextResponse.json({ error: "غير مصرح لك بالاطلاع على رسائل هذا الطلب" }, { status: 403 });
    }

    const messages = dbStore.getInquiryMessages(params.id);
    return NextResponse.json({
      success: true,
      inquiry,
      messages,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب رسائل المحادثة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول لإرسال رسالة" }, { status: 401 });
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
      return NextResponse.json({ error: "غير مصرح لك بإرسال رسائل في هذا الطلب" }, { status: 403 });
    }

    const body = await req.json();
    const { content, isAdminNote } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "محتوى الرسالة مطلوب" }, { status: 400 });
    }

    if (content.trim().length > 5000) {
      return NextResponse.json({ error: "محتوى الرسالة طويل جداً (الحد الأقصى 5000 حرف)" }, { status: 400 });
    }

    // Authenticated sender resolution (Prevent sender impersonation)
    const senderId = user.id;
    let senderName = user.name || (user.email ? user.email.split("@")[0] : "مستخدم نبض العقار");
    let senderRole: any = "seeker";

    // Ordinary users can NEVER set administrator notes or impersonate admin role
    const safeIsAdminNote = isAdmin ? Boolean(isAdminNote) : false;

    if (isAdmin) {
      senderRole = "admin";
      senderName = safeIsAdminNote ? "إدارة منصة نبض العقار (تنبيه إشرافي 🛡️)" : "إدارة منصة نبض العقار 🛡️";
    } else if (isAdvertiser) {
      senderRole = "owner";
    } else {
      senderRole = "seeker";
    }

    const newMessage = dbStore.addInquiryMessage(params.id, {
      senderId,
      senderName,
      senderRole,
      content: content.trim(),
      isAdminNote: safeIsAdminNote,
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
      inquiry: dbStore.getInquiryById(params.id),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء إرسال الرسالة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
