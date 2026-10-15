import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveInquiry } from "@/lib/services/inquiryResolver";
import { createAdminClient } from "@/utils/supabase/server";

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

    const isSeeker =
      inquiry.seekerId === user.id ||
      (Boolean(user.phone) && inquiry.seekerPhone === user.phone) ||
      (Boolean(user.email) && inquiry.seekerEmail === user.email);
    const isAdvertiser = inquiry.advertiserId === user.id;
    const isAdmin = user.role === "admin" || (user as any).role === "superadmin" || (user as any).role === "moderator";

    let isPropertyOwner = false;
    if (!isAdvertiser && !isSeeker && !isAdmin && inquiry.propertyId) {
      const prop = dbStore.getRawPropertyById(inquiry.propertyId) || dbStore.getPropertyByIdOrSlug(inquiry.propertyId);
      if (prop && (prop.advertiserId === user.id || (prop as any).userId === user.id || (prop as any).ownerId === user.id)) {
        isPropertyOwner = true;
      }
    }

    if (!isAdvertiser && !isAdmin && !isSeeker && !isPropertyOwner) {
      return NextResponse.json({ error: "غير مصرح بتعديل هذا الطلب" }, { status: 403 });
    }

    const { status, note } = await req.json();
    if (!status) {
      return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
    }

    const updated = dbStore.updateInquiryStatus(params.id, status, user.id, user.role);

    // Formulate a friendly system event notice for the chat timeline
    let statusNotice = "";
    if (status === "viewing_scheduled") {
      statusNotice = "📅 تم تأكيد وحجز موعد معاينة العقار بين الطرفين.";
    } else if (status === "negotiating") {
      statusNotice = "🤝 تم الانتقال لمرحلة التفاوض والاتفاق على الشروط والسعر.";
    } else if (status === "deal_closed") {
      statusNotice = "🎉 تهانينا! تم إتمام الاتفاق والصفقة بنجاح بين المشتري والمالك.";
    } else if (status === "contacted") {
      statusNotice = "💬 تم الرد وبدء التواصل المباشر بين الطرفين.";
    } else if (status === "closed") {
      statusNotice = "🔒 تم إغلاق طلب التواصل والمعاينة.";
    } else if (status === "spam") {
      statusNotice = "⚠️ تم وضع علامة بلاغ / ملغي على هذا الطلب من قبل الإدارة.";
    }

    if (note && typeof note === "string" && note.trim()) {
      statusNotice += `\nملاحظة: ${note.trim()}`;
    }

    if (statusNotice) {
      dbStore.addInquiryMessage(params.id, {
        senderId: user.id,
        senderName: isAdmin ? "إشراف الإدارة (نظام 🛡️)" : user.name || "نظام المنصة",
        senderRole: isAdmin ? "admin" : isAdvertiser ? "owner" : "buyer",
        content: statusNotice,
        isAdminNote: isAdmin,
      });
    }

    // Update in Supabase if UUID
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
      if (isUuid) {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.from("inquiries").update({ status }).eq("id", params.id);
        if (statusNotice) {
          await supabaseAdmin.from("inquiry_messages").insert({
            inquiry_id: params.id,
            sender_id: null,
            sender_name: isAdmin ? "إشراف الإدارة (نظام 🛡️)" : "نظام المنصة",
            sender_role: isAdmin ? "admin" : isAdvertiser ? "owner" : "buyer",
            content: statusNotice,
            is_admin_note: isAdmin,
            is_read: false,
          });
        }
      }
    } catch (e) {
      console.warn("[Inquiry PATCH] Supabase update notice:", e);
    }

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

    let isPropertyOwner = false;
    if (!isAdvertiser && !isSeeker && !isAdmin && inquiry.propertyId) {
      const prop = dbStore.getRawPropertyById(inquiry.propertyId) || dbStore.getPropertyByIdOrSlug(inquiry.propertyId);
      if (prop && (prop.advertiserId === user.id || (prop as any).userId === user.id || (prop as any).ownerId === user.id)) {
        isPropertyOwner = true;
      }
    }

    if (!isSeeker && !isAdvertiser && !isAdmin && !isPropertyOwner) {
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
