import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // 'advertiser' or 'seeker'

    let inquiries = [];
    if (mode === "advertiser" || user.role === "broker" || user.role === "owner") {
      inquiries = dbStore.getInquiriesForAdvertiser(user.id);
    } else {
      inquiries = dbStore.getInquiriesForSeeker(user.id);
    }

    return NextResponse.json({ inquiries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب طلبات التواصل";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { propertyId, message, seekerName, seekerPhone, seekerEmail, preferredContact } = body;

    if (!propertyId || !message || !seekerName || !seekerPhone) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف والرسالة مطلوبة" }, { status: 400 });
    }

    const rawProp = dbStore.getRawPropertyById(propertyId);
    if (!rawProp) {
      return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });
    }

    const inquiry = dbStore.createInquiry({
      propertyId,
      propertyTitle: rawProp.title,
      seekerId: user ? user.id : "guest-" + Date.now(),
      seekerName,
      seekerPhone,
      seekerEmail: seekerEmail || (user ? user.email : "guest@example.com"),
      advertiserId: rawProp.advertiserId,
      message,
      preferredContact: preferredContact || "call",
    });

    return NextResponse.json({ success: true, inquiry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء إرسال طلب التواصل";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
