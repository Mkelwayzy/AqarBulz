import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const inquiry = dbStore.getInquiryById(params.id);
    if (!inquiry) {
      return NextResponse.json({ error: "طلب التواصل والمعاينة غير موجود" }, { status: 404 });
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
    const inquiry = dbStore.getInquiryById(params.id);
    if (!inquiry) {
      return NextResponse.json({ error: "طلب التواصل والمعاينة غير موجود" }, { status: 404 });
    }

    const body = await req.json();
    const { content, senderName: rawSenderName, senderRole: rawSenderRole, isAdminNote } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "محتوى الرسالة مطلوب" }, { status: 400 });
    }

    const user = await getCurrentUser();

    let senderId: string = "guest-seeker";
    let senderName: string = rawSenderName || inquiry.seekerName || "مشتري / باحث";
    let senderRole: "buyer" | "seeker" | "owner" | "broker" | "admin" = "buyer";

    if (user) {
      senderId = user.id;
      senderName = user.name || (user.email ? user.email.split("@")[0] : "مستخدم نبض العقار");

      if (user.role === "admin") {
        senderRole = "admin";
        senderName = isAdminNote ? "إدارة منصة نبض العقار (تنبيه إشرافي 🛡️)" : "إدارة منصة نبض العقار 🛡️";
      } else if (user.id === inquiry.advertiserId) {
        senderRole = user.role === "broker" ? "broker" : "owner";
      } else {
        senderRole = "buyer";
      }
    } else {
      // Guest or seeker submitting by identifier match
      if (rawSenderRole === "admin") {
        return NextResponse.json({ error: "غير مصرح بإرسال رسائل كمسؤول نظام" }, { status: 403 });
      }
      senderId = inquiry.seekerId;
      senderRole = "buyer";
    }

    const newMessage = dbStore.addInquiryMessage(params.id, {
      senderId,
      senderName,
      senderRole,
      content: content.trim(),
      isAdminNote: Boolean(isAdminNote || senderRole === "admin"),
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
