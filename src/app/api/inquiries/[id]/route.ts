import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveInquiry } from "@/lib/services/inquiryResolver";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const inquiry = await resolveInquiry(params.id);
    if (!inquiry) {
      return NextResponse.json({ error: "طلب التواصل غير موجود" }, { status: 404 });
    }

    const isAdvertiser = inquiry.advertiserId === user.id;
    const isAdmin = user.role === "admin" || (user as any).role === "superadmin" || (user as any).role === "moderator";
    if (!isAdvertiser && !isAdmin) {
      return NextResponse.json({ error: "غير مصرح بتعديل هذا الطلب" }, { status: 403 });
    }

    const { status } = await req.json();
    if (!status) {
      return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
    }

    const updated = dbStore.updateInquiryStatus(params.id, status, user.id, user.role);

    // Update in Supabase if UUID
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
      if (isUuid) {
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key) {
          const supabase = createSupabaseClient(url, key, { auth: { persistSession: false } });
          await supabase.from("inquiries").update({ status }).eq("id", params.id);
        }
      }
    } catch {}

    return NextResponse.json({ success: true, inquiry: updated || inquiry });
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
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول لعرض تفاصيل طلب التواصل" }, { status: 401 });
    }

    const inquiry = await resolveInquiry(params.id);
    if (!inquiry) {
      return NextResponse.json({ error: "طلب التواصل والمعاينة غير موجود" }, { status: 404 });
    }

    const isSeeker =
      inquiry.seekerId === user.id ||
      (Boolean(user.phone) && inquiry.seekerPhone === user.phone) ||
      (Boolean(user.email) && inquiry.seekerEmail === user.email);
    const isAdvertiser = inquiry.advertiserId === user.id;
    const isAdmin = user.role === "admin" || (user as any).role === "superadmin" || (user as any).role === "moderator";

    // Guest lead support: Advertiser and admin are always permitted to view the lead
    if (!isSeeker && !isAdvertiser && !isAdmin) {
      return NextResponse.json({ error: "غير مصرح لك بالاطلاع على هذا الطلب" }, { status: 403 });
    }

    let messages = dbStore.getInquiryMessages(params.id);
    if (!messages || messages.length === 0) {
      if (inquiry.message) {
        messages = [
          {
            id: `msg-${inquiry.id}-initial`,
            inquiryId: inquiry.id,
            senderId: inquiry.seekerId || "guest",
            senderName: inquiry.seekerName || "العميل",
            senderRole: "buyer",
            content: inquiry.message,
            createdAt: inquiry.createdAt,
          },
        ];
      }
    }

    return NextResponse.json({ success: true, inquiry, messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب تفاصيل الطلب";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
