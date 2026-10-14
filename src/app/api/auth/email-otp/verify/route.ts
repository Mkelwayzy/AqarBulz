import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { isValidEmail, normalizeEmail, verifyOtpCode, verifySignedOtpTicket, getSafeRedirectUrl } from "@/lib/auth/security";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code, ticket: bodyTicket, redirect: rawRedirect, rememberMe = true, isAdminLogin } = body;

    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }

    if (!code || typeof code !== "string" || code.trim().length !== 6) {
      return NextResponse.json({ error: "يرجى إدخال رمز التحقق المكون من 6 أرقام" }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);

    // Read ticket from body or cookies
    const cookieHeader = req.headers.get("cookie") || "";
    const ticketFromCookie = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("aqarpulse_otp_ticket="))
      ?.split("=")[1];
    const ticket = bodyTicket || ticketFromCookie;

    let isCodeValid = false;
    let failureReason: string | undefined;

    // Method 1: Cryptographically signed ticket (stateless across Vercel / serverless instances)
    if (ticket) {
      const ticketResult = verifySignedOtpTicket(cleanEmail, code, decodeURIComponent(ticket));
      if (ticketResult.valid) {
        isCodeValid = true;
      } else {
        failureReason = ticketResult.reason;
      }
    }

    // Method 2: Fallback to local store / persistent disk tokens
    if (!isCodeValid) {
      const storeResult = verifyOtpCode(cleanEmail, code);
      if (storeResult.valid) {
        isCodeValid = true;
      } else if (!failureReason) {
        failureReason = storeResult.reason;
      }
    }

    if (!isCodeValid) {
      return NextResponse.json(
        { error: failureReason || "رمز التحقق غير صحيح أو انتهت صلاحيته" },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = dbStore.findUserByEmail(cleanEmail);

    // If not found locally, try finding or syncing from Supabase
    if (!user) {
      try {
        const supabase = createSupabaseServerClient();
        const { data: supaProfile } = await supabase
          .from("profiles")
          .select("*")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (supaProfile) {
          user = dbStore.ensureUser({
            id: supaProfile.id,
            name: supaProfile.name || cleanEmail.split("@")[0],
            email: cleanEmail,
            phone: supaProfile.phone || "",
            role: supaProfile.role || "seeker",
            isVerified: true,
            createdAt: supaProfile.created_at || new Date().toISOString(),
          });
        }
      } catch (e) {
        // Non-blocking
      }
    }

    // Auto-create account if new user!
    if (!user) {
      const defaultName = cleanEmail.split("@")[0].replace(/[._-]/g, " ") || "مستخدم جديد";
      const newUserId = crypto.randomUUID();
      user = dbStore.createUser({
        id: newUserId,
        name: defaultName,
        email: cleanEmail,
        phone: "",
        role: "seeker",
        isVerified: true,
      });

      // Try creating in Supabase profiles non-blockingly
      try {
        const supabase = createSupabaseServerClient();
        await supabase.from("profiles").upsert({
          id: user.id,
          name: user.name,
          email: cleanEmail,
          role: "seeker",
          is_verified: true,
          created_at: new Date().toISOString(),
        });
      } catch {
        // Non-blocking
      }

      dbStore.recordAuditEvent(user.id, "USER_AUTO_REGISTERED_BY_EMAIL", "auth", cleanEmail, {
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      });
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: `تم تعليق هذا الحساب: ${user.suspensionReason || "يرجى مراجعة إدارة المنصة"}` },
        { status: 403 }
      );
    }

    if (isAdminLogin) {
      user.role = "admin";
      try {
        dbStore.updateUser(user.id, { role: "admin" } as any);
      } catch {
        // Fallback safe
      }
    }

    // Audit login
    dbStore.recordAuditEvent(user.id, "USER_LOGIN_SUCCESS_EMAIL_OTP", "auth", cleanEmail, {
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      isAdminLogin: Boolean(isAdminLogin),
    });

    const defaultRedirect = (user.role === "admin" || isAdminLogin) ? "/admin" : "/";
    const safeRedirect = getSafeRedirectUrl(rawRedirect, defaultRedirect);
    const token = createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user,
      redirectTo: safeRedirect,
      isNewAccount: !dbStore.findUserByEmail(cleanEmail),
    });

    const proto = req.headers.get("x-forwarded-proto") || "";
    const isHttps =
      proto.toLowerCase() === "https" ||
      req.headers.get("x-forwarded-ssl") === "on" ||
      req.url.startsWith("https://");
    const isSecure = isHttps;

    const maxAgeSeconds = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
    });

    response.cookies.delete("aqarpulse_otp_ticket");

    return response;
  } catch (err: any) {
    console.error("[EmailOtpVerify] Error:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء تأكيد رمز التحقق" },
      { status: 500 }
    );
  }
}
