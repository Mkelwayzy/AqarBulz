import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveInquiry } from "@/lib/services/inquiryResolver";

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

    // Guest lead support: Advertiser and admin are always permitted to view the lead
    if (!isSeeker && !isAdvertiser && !isAdmin) {
      return NextResponse.json({ error: "غير مصرح لك بالاطلاع على رسائل هذا الطلب" }, { status: 403 });
    }

    let messages = dbStore.getInquiryMessages(params.id);

    // Fetch from Supabase inquiry_messages if local messages array is empty
    if (!messages || messages.length === 0) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
        if (isUuid) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (url && key) {
            const supabase = createSupabaseClient(url, key, { auth: { persistSession: false } });
            const { data: cloudMsgs } = await supabase
              .from("inquiry_messages")
              .select("*")
              .eq("inquiry_id", params.id)
              .order("created_at", { ascending: true });
            if (cloudMsgs && cloudMsgs.length > 0) {
              messages = cloudMsgs.map((m: any) => ({
                id: m.id,
                inquiryId: m.inquiry_id,
                senderId: m.sender_id || "guest",
                senderName: m.sender_name || "عميل / زائر",
                senderRole: m.sender_role || "buyer",
                content: m.content,
                isAdminNote: m.is_admin_note || false,
                createdAt: m.created_at,
              }));
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch cloud inquiry messages:", err);
      }
    }

    // If still no messages but inquiry has an initial message, ensure initial message is displayed
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

    // Sort messages strictly ascending by creation timestamp
    if (messages && messages.length > 0) {
      messages.sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        return timeA - timeB;
      });
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
      senderRole = "buyer";
    }

    const newMessage = dbStore.addInquiryMessage(params.id, {
      senderId,
      senderName,
      senderRole,
      content: content.trim(),
      isAdminNote: safeIsAdminNote,
    });

    // Also persist to Supabase if UUID
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
      if (isUuid) {
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key) {
          const supabase = createSupabaseClient(url, key, { auth: { persistSession: false } });

          let validSenderId: string | null = null;
          const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
          if (isUserUuid) {
            try {
              const { data: prof } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
              if (prof) validSenderId = user.id;
            } catch {}
          }

          await supabase.from("inquiry_messages").insert({
            inquiry_id: params.id,
            sender_id: validSenderId,
            sender_name: senderName,
            sender_role: senderRole,
            content: content.trim(),
            is_admin_note: safeIsAdminNote,
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
