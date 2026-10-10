import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { checkRateLimit, isStrongPassword } from "@/lib/auth/security";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown_client";
    const rateStatus = checkRateLimit(`reset_${clientIp}`, 5, 60 * 1000);

    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار ${rateStatus.retryAfterSeconds} ثانية.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { password, email } = body;

    if (!password) {
      return NextResponse.json({ error: "كلمة المرور الجديدة مطلوبة" }, { status: 400 });
    }

    const passCheck = isStrongPassword(password);
    if (!passCheck.valid) {
      return NextResponse.json({ error: passCheck.reason }, { status: 400 });
    }

    // Update in Supabase if session exists
    try {
      const supabase = createSupabaseServerClient();
      await supabase.auth.updateUser({ password });
    } catch {
      // Offline fallback
    }

    if (email) {
      const user = dbStore.findUserByEmail(email.trim().toLowerCase());
      if (user) {
        dbStore.recordAuditEvent(user.id, "PASSWORD_RESET_COMPLETED", "auth", user.id, {
          ip: clientIp,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء إعادة تعيين كلمة المرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
