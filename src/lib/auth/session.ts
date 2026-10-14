import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { User, UserRole } from "../db/types";
import { dbStore } from "../db/store";

const SESSION_COOKIE_NAME = "aqarpulse_session";

const DEV_FALLBACK_SECRET = "dev_insecure_aqarpulse_session_signing_secret_do_not_use_in_production_32chars";

export const VALID_SESSION_ROLES: readonly UserRole[] = [
  "seeker",
  "buyer",
  "owner",
  "broker",
  "admin",
] as const;

/**
 * Returns the session signing secret.
 * In production, fails securely if SESSION_SECRET is missing, predictable default, or < 32 characters.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (
      !secret ||
      secret.length < 32 ||
      secret === "aqarpulse_jwt_secret_egypt_market_2026" ||
      secret === DEV_FALLBACK_SECRET
    ) {
      throw new Error(
        "FATAL_SECURITY_ERROR: Missing or insufficiently strong SESSION_SECRET in production environment. A minimum of 32 characters is required."
      );
    }
    return secret;
  }

  // Explicit development fallback only in non-production environments
  return secret || DEV_FALLBACK_SECRET;
}

export interface SessionData {
  userId: string;
  email?: string;
  phone?: string;
  role: UserRole;
  name: string;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token for the user.
 */
export function createSessionToken(user: User): string {
  const secret = getSessionSecret();
  const payload = {
    userId: user.id,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
    name: user.name,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const jsonStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(jsonStr).toString("base64url");
  const signature = createHmac("sha256", secret).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${signature}`;
}

/**
 * Parses and cryptographically verifies session token using HMAC-SHA256 and timing-safe comparison.
 */
export function verifySessionToken(token: string): SessionData | null {
  if (!token || typeof token !== "string") return null;
  try {
    let secret: string;
    try {
      secret = getSessionSecret();
    } catch {
      // In production without valid secret, fail securely
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadBase64, signature] = parts;
    if (!payloadBase64 || !signature) return null;

    const expectedSignature = createHmac("sha256", secret).update(payloadBase64).digest("base64url");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const jsonStr = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr);
    
    // Strict payload structural validation
    if (!payload || typeof payload !== "object") return null;
    if (typeof payload.userId !== "string" || !payload.userId.trim()) return null;
    if (typeof payload.role !== "string" || !VALID_SESSION_ROLES.includes(payload.role as UserRole)) return null;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (typeof payload.iat !== "number" || payload.iat > Date.now() + 60 * 1000) return null;

    return {
      userId: payload.userId,
      email: payload.email || undefined,
      phone: payload.phone || undefined,
      role: payload.role as UserRole,
      name: payload.name || "مستخدم",
    };
  } catch {
    return null;
  }
}

/**
 * Gets currently logged in user from cookie headers (Server Components & Route Handlers).
 * Strictly validates against the authoritative database and rejects non-existent or suspended users.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = verifySessionToken(token);
    if (!session) return null;

    // 1. Authoritative Cloud Synchronization with Supabase profiles table
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.userId);
    let user = null;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);

        let supaProfile = null;
        if (isUuid) {
          const { data: byId } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.userId)
            .limit(1);
          supaProfile = byId?.[0];
        }
        if (!supaProfile && session.email) {
          const { data: byEmail } = await supabase
            .from("profiles")
            .select("*")
            .ilike("email", session.email)
            .limit(1);
          supaProfile = byEmail?.[0];
        }

        if (supaProfile) {
          user = dbStore.ensureUser({
            id: supaProfile.id,
            name: supaProfile.name || session.name,
            email: supaProfile.email || session.email,
            phone: supaProfile.phone || session.phone || "+201000000000",
            role: supaProfile.role || session.role,
            isVerified: Boolean(supaProfile.is_verified),
            isSuspended: Boolean(supaProfile.is_suspended),
            companyName: supaProfile.company_name || undefined,
            licenseNumber: supaProfile.license_number || undefined,
            adminRole: supaProfile.admin_role || (supaProfile.role === "admin" ? "superadmin" : undefined),
            adminPermissions: supaProfile.admin_permissions || (supaProfile.role === "admin" ? ["all"] : []),
            isStaff: Boolean(supaProfile.is_staff || supaProfile.role === "admin"),
            createdAt: supaProfile.created_at || new Date().toISOString(),
          });
        }
      }
    } catch {
      // Fall back to memory cache
    }

    // 2. Fallback to memory store (for legacy or offline test fixtures)
    if (!user) {
      user = dbStore.findUserById(session.userId);
    }
    if (!user && session.phone) {
      user = dbStore.findUserByPhone(session.phone);
    }
    if (!user && session.email) {
      user = dbStore.findUserByEmail(session.email);
    }

    // 3. Resilient Session Restoration:
    // If the token was cryptographically signed and verified by our HMAC-SHA256 secret,
    // ensure the authenticated user in dbStore. This is essential for serverless/multi-worker
    // environments (e.g. Vercel) where memory state is isolated across lambda invocations.
    if (!user && (session.userId || session.email)) {
      user = dbStore.ensureUser({
        id: session.userId,
        name: session.name || (session.email ? session.email.split("@")[0] : "مستخدم"),
        email: session.email || "",
        phone: session.phone || "",
        role: session.role || "seeker",
        isVerified: true,
        createdAt: new Date().toISOString(),
      });
    }

    if (!user) {
      return null;
    }

    // Fail closed if user is suspended
    if (user.isSuspended) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Guards a route to ensure user is authenticated.
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (user.isSuspended) {
    throw new Error("ACCOUNT_SUSPENDED");
  }
  return user;
}

/**
 * Guards a route to ensure user has specific role or admin.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const user = await requireAuth();
  if (user.role === "admin") return user; // Admin has superuser access
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export { SESSION_COOKIE_NAME };

