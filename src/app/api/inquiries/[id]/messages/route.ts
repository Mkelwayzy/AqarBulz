import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveInquiry } from "@/lib/services/inquiryResolver";
import { createAdminClient } from "@/utils/supabase/server";

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

    // Guest lead support: Advertiser and admin are always permitted to view the lead
    if (!isSeeker && !isAdvertiser && !isAdmin && !isPropertyOwner) {
      return NextResponse.json({ error: "غير مصرح لك بالاطلاع على رسائل هذا الطلب" }, { status: 403 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    const messageMap = new Map<string, any>();

    // 1. Fetch authoritative live messages from Supabase inquiry_messages using Admin Client
    if (isUuid) {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: cloudMsgs, error: msgsErr } = await supabaseAdmin
          .from("inquiry_messages")
          .select("*")
          .eq("inquiry_id", params.id)
          .order("created_at", { ascending: true });

        if (!msgsErr && cloudMsgs && cloudMsgs.length > 0) {
          cloudMsgs.forEach((m: any) => {
            const rawContent = String(m.content || "");
            const isInternal = Boolean(m.is_internal_note || rawContent.startsWith("[ملاحظة داخلية للإدارة]"));
            messageMap.set(m.id, {
              id: m.id,
              inquiryId: m.inquiry_id,
              senderId: m.sender_id || "guest",
              senderName: m.sender_name || "مستخدم",
              senderRole: m.sender_role || "buyer",
              content: rawContent,
              isAdminNote: Boolean(m.is_admin_note),
              isInternalNote: isInternal,
              isRead: Boolean(m.is_read),
              createdAt: m.created_at,
            });
          });
        }

        // Mark unread incoming messages as read in Supabase only when an actual participant opens the chat
        if (isSeeker || isAdvertiser || isPropertyOwner) {
          try {
            await supabaseAdmin
              .from("inquiry_messages")
              .update({ is_read: true })
              .eq("inquiry_id", params.id)
              .neq("sender_id", user.id);
          } catch {}
        }
      } catch (err) {
        console.warn("Could not fetch cloud inquiry messages:", err);
      }
    }

    // 2. Mark incoming messages as read in local dbStore when participant opens the chat
    if (isSeeker || isAdvertiser || isPropertyOwner) {
      dbStore.markInquiryMessagesAsRead(params.id, user.id);
    }

    // 3. Merge local messages from dbStore without duplicating IDs or content within short window
    const localMsgs = dbStore.getInquiryMessages(params.id) || [];
    const existingCloudList = Array.from(messageMap.values());
    localMsgs.forEach((lm) => {
      if (lm.id.endsWith("-initial")) return;
      if (messageMap.has(lm.id)) return;
      const lmTime = new Date(lm.createdAt || 0).getTime();
      const lmContent = String(lm.content || "").trim();
      const isDuplicateContent = existingCloudList.some((cm: any) => {
        const cmContent = String(cm.content || "").trim();
        const cmTime = new Date(cm.createdAt || 0).getTime();
        return (
          cmContent === lmContent &&
          cm.senderRole === lm.senderRole &&
          Math.abs(cmTime - lmTime) < 30000
        );
      });
      if (!isDuplicateContent) {
        messageMap.set(lm.id, lm);
      }
    });

    // 4. Sort messages strictly ascending by creation timestamp and filter internal notes for non-admins
    let messages = Array.from(messageMap.values()).sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      return timeA - timeB;
    });

    if (!isAdmin) {
      messages = messages.filter(
        (m: any) => !m.isInternalNote && !String(m.content || "").startsWith("[ملاحظة داخلية للإدارة]")
      );
    }

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
      return NextResponse.json({ error: "غير مصرح لك بإرسال رسائل في هذا الطلب" }, { status: 403 });
    }

    const body = await req.json();
    const { content, isAdminNote, isInternalNote } = body;

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

    // Ordinary users can NEVER set administrator notes or internal notes or impersonate admin role
    const safeIsInternalNote = isAdmin ? Boolean(isInternalNote) : false;
    const safeIsAdminNote = isAdmin ? Boolean(isAdminNote || safeIsInternalNote) : false;

    if (isAdmin) {
      senderRole = "admin";
      if (safeIsInternalNote) {
        senderName = "ملاحظة رقابية داخلية (للإدارة فقط 🔒)";
      } else if (safeIsAdminNote) {
        senderName = "إدارة منصة نبض العقار (تنبيه إشرافي 🛡️)";
      } else {
        senderName = "إدارة منصة نبض العقار 🛡️";
      }
    } else if (isAdvertiser || isPropertyOwner) {
      senderRole = "owner";
    } else {
      senderRole = "buyer";
    }

    const formattedContent =
      safeIsInternalNote && !content.trim().startsWith("[ملاحظة داخلية للإدارة]")
        ? `[ملاحظة داخلية للإدارة] ${content.trim()}`
        : content.trim();

    // Check if local store already has this exact message within last 10s (idempotency guard)
    const existingMsgs = dbStore.getInquiryMessages(params.id) || [];
    const lastExisting = existingMsgs[existingMsgs.length - 1];
    if (
      lastExisting &&
      lastExisting.senderId === senderId &&
      lastExisting.content === formattedContent &&
      Date.now() - new Date(lastExisting.createdAt).getTime() < 10000
    ) {
      return NextResponse.json({
        success: true,
        message: lastExisting,
        inquiry: dbStore.getInquiryById(params.id) || inquiry,
        deduplicated: true,
      });
    }

    const newMessage = dbStore.addInquiryMessage(params.id, {
      senderId,
      senderName,
      senderRole,
      content: formattedContent,
      isAdminNote: safeIsAdminNote,
      isInternalNote: safeIsInternalNote,
    });

    if (isAdmin && (safeIsAdminNote || safeIsInternalNote)) {
      dbStore.recordAuditEvent(
        user.id,
        safeIsInternalNote ? "ADMIN_INTERNAL_NOTE" : "ADMIN_SUPERVISORY_NOTE",
        "inquiry",
        params.id,
        {
          isInternalNote: safeIsInternalNote,
          propertyId: inquiry.propertyId,
          excerpt: content.trim().slice(0, 120),
        }
      );
    }

    // Also persist to Supabase if UUID
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
      if (isUuid) {
        const supabaseAdmin = createAdminClient();

        let validSenderId: string | null = null;
        const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
        if (isUserUuid) {
          try {
            const { data: prof } = await supabaseAdmin.from("profiles").select("id").eq("id", user.id).maybeSingle();
            if (prof) validSenderId = user.id;
          } catch {}
        }

        await supabaseAdmin.from("inquiry_messages").insert({
          inquiry_id: params.id,
          sender_id: validSenderId,
          sender_name: senderName,
          sender_role: senderRole,
          content: formattedContent,
          is_admin_note: safeIsAdminNote,
          is_read: false,
        });

        // If advertiser replied to a 'new' inquiry, sync status='contacted' in Supabase
        if (!safeIsInternalNote && inquiry.status === "new" && (senderRole === "owner" || senderRole === "broker")) {
          await supabaseAdmin.from("inquiries").update({ status: "contacted" }).eq("id", params.id);
        }

        if (isAdmin && (safeIsAdminNote || safeIsInternalNote)) {
          await supabaseAdmin.from("audit_events").insert({
            user_id: validSenderId,
            action: safeIsInternalNote ? "ADMIN_INTERNAL_NOTE" : "ADMIN_SUPERVISORY_NOTE",
            entity_type: "inquiry",
            entity_id: params.id,
            details: { isInternalNote: safeIsInternalNote, excerpt: content.trim().slice(0, 120) },
          });
        }
      }
    } catch (e) {
      console.warn("Could not persist message to Supabase:", e);
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
      inquiry: dbStore.getInquiryById(params.id) || inquiry,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء إرسال الرسالة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
