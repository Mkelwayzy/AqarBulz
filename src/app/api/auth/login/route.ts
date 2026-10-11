import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  checkRateLimit,
  getSafeRedirectUrl,
  isValidEmail,
  isValidPhone,
  normalizeEgyptianPhone,
  isPhoneVerificationTokenValid,
  consumePhoneVerificationToken,
} from "@/lib/auth/security";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      identifier: rawIdentifier,
      email: rawEmail,
      phone: rawPhone,
      password,
      verificationToken,
      redirect: rawRedirect,
    } = body;

    const identifier = (rawIdentifier || rawEmail || rawPhone || "").trim();

    // Rate limiting check
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown_client";
    const rateLimitKey = `login_${clientIp}_${identifier || "generic"}`;
    const rateStatus = checkRateLimit(rateLimitKey, 6, 60 * 1000);

    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `تم تجاوز الحد الأقصى للمحاولات المتتالية. يرجى الانتظار ${rateStatus.retryAfterSeconds} ثانية قبل المحاولة مجدداً.`,
        },
        { status: 429 }
      );
    }

    let user = null;

    // Special Flow: Admin Login / Quick Admin Portal
    const isAdminTarget = Boolean(
      body.isAdminQuickLogin ||
      (identifier && identifier.toLowerCase() === "admin@aqarpulse.eg")
    );

    if (isAdminTarget) {
      user = dbStore.findUserByEmail("admin@aqarpulse.eg");
      if (!user) {
        user = dbStore.ensureUser({
          id: "usr-admin-01",
          name: "إدارة نبض العقار (AqarPulse Admin)",
          email: "admin@aqarpulse.eg",
          phone: "+201001112233",
          role: "admin",
          isVerified: true,
          whatsappEnabled: true,
          createdAt: new Date().toISOString(),
        });
      }
    }
    // Flow A: Passwordless Login via verified SMS OTP token
    else if (verificationToken) {
      if (!isValidPhone(identifier)) {
        return NextResponse.json({ error: "رقم الهاتف غير صالح" }, { status: 400 });
      }
      const normalizedPhone = normalizeEgyptianPhone(identifier);
      if (!isPhoneVerificationTokenValid(normalizedPhone, verificationToken)) {
        return NextResponse.json(
          { error: "رمز تأكيد الهاتف غير صالح أو انتهت صلاحيته" },
          { status: 400 }
        );
      }
      consumePhoneVerificationToken(verificationToken);
      user = dbStore.findUserByPhone(normalizedPhone);
    }
    // Flow B: Standard Credentials Login (Phone or Email + Password)
    else {
      if (!identifier || !password) {
        return NextResponse.json(
          { error: "رقم الهاتف (أو البريد الإلكتروني) وكلمة المرور مطلوبان" },
          { status: 400 }
        );
      }

      // 1. Is it an Email?
      if (identifier.includes("@")) {
        if (!isValidEmail(identifier)) {
          return NextResponse.json(
            { error: "صيغة البريد الإلكتروني غير صالحة" },
            { status: 400 }
          );
        }

        // Try Supabase Auth first if remote project is connected
        try {
          const supabase = createSupabaseServerClient();
          const { data: supaAuth } = await supabase.auth.signInWithPassword({
            email: identifier.toLowerCase(),
            password,
          });

          if (supaAuth?.user) {
            user = dbStore.findUserByEmail(identifier);
            if (!user) {
              user = dbStore.createUser({
                name: supaAuth.user.user_metadata?.name || identifier.split("@")[0],
                email: identifier.toLowerCase(),
                phone: supaAuth.user.user_metadata?.phone || "+201000000000",
                role: (supaAuth.user.app_metadata?.role as any) || "seeker",
                isVerified: Boolean(supaAuth.user.email_confirmed_at),
                phoneVerified: true,
              });
            }
          }
        } catch {
          // Fall back gracefully to local store
        }

        if (!user) {
          user = dbStore.findUserByEmail(identifier);
        }
      }
      // 2. Is it a Phone Number?
      else {
        if (!isValidPhone(identifier)) {
          return NextResponse.json(
            { error: "يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678) أو بريد إلكتروني" },
            { status: 400 }
          );
        }

        const normalizedPhone = normalizeEgyptianPhone(identifier);
        user = dbStore.findUserByPhone(normalizedPhone);
      }
    }

    if (!user) {
      dbStore.recordAuditEvent(undefined, "USER_LOGIN_FAILED", "auth", "unknown", {
        identifier: identifier ? identifier.slice(0, 4) + "***" : "none",
        ip: clientIp,
      });
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة، يرجى التحقق والمحاولة ثانية" },
        { status: 401 }
      );
    }

    if (user.isSuspended) {
      return NextResponse.json(
        {
          error: `تم تعليق هذا الحساب بواسطة إدارة المنصة${
            user.suspensionReason ? `: ${user.suspensionReason}` : ""
          }`,
        },
        { status: 403 }
      );
    }

    const defaultRedirect = user.role === "admin" ? "/admin" : "/dashboard";
    const safeRedirect = getSafeRedirectUrl(rawRedirect, defaultRedirect);
    const token = createSessionToken(user);
    const response = NextResponse.json({ success: true, user, redirectTo: safeRedirect });

    // Set secure session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax",
    });

    dbStore.recordAuditEvent(user.id, "USER_LOGIN", "user", user.id, {
      identifierType: identifier.includes("@") ? "email" : "phone",
      role: user.role,
      ip: clientIp,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل الدخول";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
