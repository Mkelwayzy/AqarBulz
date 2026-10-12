import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { dbStore } from "@/lib/db/store";
import { getSafeRedirectUrl } from "@/lib/auth/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  const safeRedirect = getSafeRedirectUrl(rawRedirect, "/dashboard");

  if (code) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        const supaUser = data.user;
        const profileUser = dbStore.ensureUser({
          id: supaUser.id,
          name:
            supaUser.user_metadata?.full_name ||
            supaUser.user_metadata?.name ||
            supaUser.email?.split("@")[0] ||
            "مستخدم عقار",
          email: supaUser.email,
          phone: supaUser.user_metadata?.phone || supaUser.phone || "+201000000000",
          role: (supaUser.user_metadata?.role as any) || "seeker",
          avatarUrl: supaUser.user_metadata?.avatar_url || supaUser.user_metadata?.picture,
          isVerified: false,
          emailVerified: Boolean(supaUser.email_confirmed_at || supaUser.email),
          phoneVerified: Boolean(supaUser.phone_confirmed_at),
        });

        const token = createSessionToken(profileUser);
        const redirectUrl = new URL(safeRedirect, origin).toString();
        const response = NextResponse.redirect(redirectUrl);

        const proto = request.headers.get("x-forwarded-proto");
        const isHttps = proto === "https" || request.url.startsWith("https://");
        const isSecure = process.env.NODE_ENV === "production" && isHttps;

        response.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: token,
          httpOnly: true,
          secure: isSecure,
          path: "/",
          maxAge: 30 * 24 * 60 * 60, // 30 days for OAuth sign-ins
          sameSite: "lax",
        });

        return response;
      }
    } catch (err) {
      console.error("[OAuthCallback] Error completing exchange:", err);
    }
  }

  // Redirect to login with friendly error message on failure
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
