import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  checkRateLimit,
  getSafeRedirectUrl,
  isValidEmail,
  isValidPhone,
  normalizeEgyptianPhone,
  isDisposableEmail,
  isStrongPassword,
  evaluateSubmissionSecurity,
  validateHoneypot,
  validateSubmissionTiming,
  isPhoneVerificationTokenValid,
  consumePhoneVerificationToken,
} from "@/lib/auth/security";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown_client";
    const rateStatus = checkRateLimit(`register_${clientIp}`, 8, 60 * 1000);

    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `تم تجاوز الحد الأقصى لمحاولات التسجيل. يرجى الانتظار ${rateStatus.retryAfterSeconds} ثانية.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      password,
      role,
      licenseNumber,
      companyName,
      nationalId,
      verificationToken,
      hp_field,
      formLoadedAt,
      redirect: rawRedirect,
    } = body;

    // 1. Multi-Layer Anti-Bot & Speed Trap Guard (No fragile user-data matching)
    const secResult = evaluateSubmissionSecurity({
      honeypotValue: hp_field,
      formLoadedAt,
      minDurationMs: 400,
    });

    if (secResult.isBlocked) {
      dbStore.recordAuditEvent(undefined, "SECURITY_BOT_BLOCKED", "auth", "bot_guard", {
        ip: clientIp,
        riskScore: secResult.riskScore,
        reason: secResult.reason,
      });
      return NextResponse.json(
        { error: secResult.reason || "تعذر إتمام التسجيل، تم رصد نشاط غير مصرح" },
        { status: 400 }
      );
    }

    // 3. Basic mandatory fields
    if (!name?.trim() || !phone?.trim() || !role) {
      return NextResponse.json(
        { error: "الاسم الكامل، رقم الهاتف، ونوع الحساب حقول إلزامية" },
        { status: 400 }
      );
    }

    // 4. Phone validation & normalization
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "صيغة رقم الهاتف غير صالحة. يرجى إدخال رقم مصري صحيح (مثال: 01012345678)" },
        { status: 400 }
      );
    }
    const normalizedPhone = normalizeEgyptianPhone(phone);

    // Check duplicate phone
    const existingPhoneUser = dbStore.findUserByPhone(normalizedPhone);
    if (existingPhoneUser) {
      return NextResponse.json(
        { error: "رقم الهاتف مسجل بالفعل في حساب آخر. يرجى تسجيل الدخول بدلاً من التسجيل." },
        { status: 409 }
      );
    }

    // 5. Email validation & disposable email defense
    let cleanEmail: string | undefined = undefined;
    if (email && email.trim().length > 0) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!isValidEmail(trimmedEmail)) {
        return NextResponse.json({ error: "صيغة البريد الإلكتروني غير صحيحة" }, { status: 400 });
      }

      // Block temporary/fake disposable emails
      if (isDisposableEmail(trimmedEmail)) {
        return NextResponse.json(
          { error: "لا يمكن استخدام بريد إلكتروني مؤقت أو وهمي. يرجى إدخال بريدك الحقيقي أو تركه فارغاً." },
          { status: 400 }
        );
      }

      const existingEmailUser = dbStore.findUserByEmail(trimmedEmail);
      if (existingEmailUser) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مسجل بالفعل مسبقاً، يمكنك تسجيل الدخول به" },
          { status: 409 }
        );
      }

      cleanEmail = trimmedEmail;
    }

    // 6. Anti-Fake Protection: Verify Token (Gmail SMTP or Phone)
    const isTokenValid =
      Boolean(cleanEmail && isPhoneVerificationTokenValid(cleanEmail, verificationToken)) ||
      Boolean(normalizedPhone && isPhoneVerificationTokenValid(normalizedPhone, verificationToken));

    if (!verificationToken || !isTokenValid) {
      return NextResponse.json(
        {
          error: "يجب تأكيد الحساب عبر رمز التحقق (Gmail) قبل إتمام التسجيل لضمان أمان وموثوقية الحساب",
          requiresOtp: true,
        },
        { status: 400 }
      );
    }

    // 7. Password check
    if (password) {
      const passCheck = isStrongPassword(password);
      if (!passCheck.valid) {
        return NextResponse.json({ error: passCheck.reason }, { status: 400 });
      }
    }

    // 8. Role validation & escalation prevention
    if (role === "admin") {
      dbStore.recordAuditEvent(undefined, "SECURITY_PRIVILEGE_ESCALATION_BLOCKED", "auth", "unknown", {
        attemptedRole: "admin",
        phone: normalizedPhone,
        ip: clientIp,
      });
      return NextResponse.json(
        { error: "لا يمكن إنشاء حساب مسؤول نظام عبر التسجيل العام نهائياً" },
        { status: 403 }
      );
    }

    const allowedRoles = ["seeker", "buyer", "owner", "broker"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "نوع الحساب المختار غير صالح" }, { status: 400 });
    }

    // Role-specific validation
    if (role === "broker" && !companyName?.trim() && !licenseNumber?.trim()) {
      // Non-blocking warning or allow but encourage broker profile completion
    }

    // 9. Consume the verification token (prevent replay attacks)
    consumePhoneVerificationToken(verificationToken);

    // 10. Attempt Supabase Auth sign up if email was provided
    let supabaseUserId: string | undefined = undefined;
    if (cleanEmail && password) {
      try {
        const supabase = createSupabaseServerClient();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              phone: normalizedPhone,
              role: role === "buyer" ? "seeker" : role,
            },
          },
        });

        if (authError) {
          console.warn("[Register] Supabase Auth response note:", authError.message);
          // If Supabase specifically detects duplicate user or rate limits
          if (authError.message.toLowerCase().includes("already registered") || authError.status === 422) {
            return NextResponse.json(
              { error: "البريد الإلكتروني مسجل بالفعل في نظام المصادقة. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد." },
              { status: 409 }
            );
          }
          if (authError.message.toLowerCase().includes("rate limit") || authError.status === 429) {
            return NextResponse.json(
              { error: "تم تجاوز حد محاولات التسجيل من مزود المصادقة. يرجى الانتظار بضع دقائق والمحاولة مجدداً." },
              { status: 429 }
            );
          }
        } else if (authData?.user?.id) {
          supabaseUserId = authData.user.id;
        }
      } catch (authErr: unknown) {
        console.warn("[Register] Supabase Auth call warning:", authErr);
      }
    }

    // 11. Create Persistent User
    const newUser = dbStore.createUser({
      id: supabaseUserId,
      name: name.trim(),
      email: cleanEmail,
      phone: normalizedPhone,
      role: role === "buyer" ? "seeker" : role,
      licenseNumber: role === "broker" ? licenseNumber?.trim() : undefined,
      companyName: role === "broker" ? companyName?.trim() : undefined,
      nationalId: role === "owner" ? nationalId?.trim() : undefined,
      isVerified: role === "seeker" || role === "buyer", // Seekers are standard users; brokers/owners get verified badge upon document moderation
      phoneVerified: true,
      emailVerified: Boolean(cleanEmail),
      whatsappEnabled: true,
    });

    const safeRedirect = getSafeRedirectUrl(rawRedirect, "/dashboard");
    const token = createSessionToken(newUser);
    const response = NextResponse.json({
      success: true,
      user: newUser,
      redirectTo: safeRedirect,
      message: "تم إنشاء وتوثيق حسابك بنجاح عبر تأكيد Gmail الرسمي!",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    dbStore.recordAuditEvent(newUser.id, "USER_REGISTER_GMAIL_VERIFIED", "user", newUser.id, {
      role: newUser.role,
      phone: normalizedPhone,
      hasEmail: Boolean(cleanEmail),
      channel: cleanEmail ? "gmail" : "whatsapp",
      ip: clientIp,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء إتمام التسجيل";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
