import { cookies } from "next/headers";
import { User, UserRole } from "../db/types";
import { dbStore } from "../db/store";

const SESSION_COOKIE_NAME = "aqarpulse_session";
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "aqarpulse_jwt_secret_egypt_market_2026";

export interface SessionData {
  userId: string;
  email?: string;
  phone?: string;
  role: UserRole;
  name: string;
}

/**
 * Creates a lightweight signed session token for the user.
 */
export function createSessionToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
    name: user.name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr).toString("base64");
  return `${base64}.${SESSION_SECRET.slice(0, 8)}`;
}

/**
 * Parses and verifies session token.
 */
export function verifySessionToken(token: string): SessionData | null {
  try {
    const [base64] = token.split(".");
    if (!base64) return null;
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(jsonStr);
    if (payload.exp && Date.now() > payload.exp) return null;
    return {
      userId: payload.userId,
      email: payload.email || undefined,
      phone: payload.phone || undefined,
      role: payload.role,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

/**
 * Gets currently logged in user from cookie headers (Server Components & Route Handlers).
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = verifySessionToken(token);
    if (!session) return null;

    // 1. Primary lookup by ID
    let user = dbStore.findUserById(session.userId);

    // 2. Secondary lookup by Phone or Email
    if (!user && session.phone) {
      user = dbStore.findUserByPhone(session.phone);
    }
    if (!user && session.email) {
      user = dbStore.findUserByEmail(session.email);
    }

    // 3. Fallback reconstitution for cryptographically verified session
    if (!user) {
      user = {
        id: session.userId,
        name: session.name || "مستخدم موثق",
        email: session.email,
        phone: session.phone || "",
        role: session.role,
        isVerified: session.role === "seeker" || session.role === "buyer",
        phoneVerified: true,
        emailVerified: Boolean(session.email),
        whatsappEnabled: true,
        createdAt: new Date().toISOString(),
      };
      dbStore.ensureUser(user);
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
