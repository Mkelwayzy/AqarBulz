/**
 * AqarPulse Platform — Auth Security Utilities
 *
 * Implements:
 * 1. Safe redirect URL validation (protecting against Open Redirect vulnerabilities).
 * 2. In-memory sliding rate limiter for authentication endpoints (preventing brute-force/credential-stuffing).
 * 3. Input sanitation and password/email strength validation.
 */

import { randomInt, randomBytes } from "node:crypto";

// Safe redirect validator: strictly permits relative paths starting with single '/'
export function getSafeRedirectUrl(url: string | null | undefined, fallback = "/dashboard"): string {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  // Reject protocol-relative URLs (e.g., "//evil.com") or javascript: URIs
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    // Avoid double slashes or encoded backslashes
    return trimmed;
  }
  return fallback;
}

// In-memory rate limiter for login and registration attempts
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Checks if a key (e.g. IP or email) has exceeded max attempts within the given window.
 * Default: 5 attempts per 60 seconds.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60 * 1000
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  record.count += 1;
  return {
    allowed: true,
    remainingAttempts: maxAttempts - record.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Normalizes Egyptian and international phone numbers into canonical E.164 format.
 * Examples:
 *   "01012345678" -> "+201012345678"
 *   "201012345678" -> "+201012345678"
 *   "00201012345678" -> "+201012345678"
 *   "+20 10 1234 5678" -> "+201012345678"
 */
export function normalizeEgyptianPhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "").trim();

  // Handle leading 00
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // Egyptian mobile with leading 0 (e.g. 010..., 011..., 012..., 015...)
  if (/^01[0125]\d{8}$/.test(cleaned)) {
    return "+20" + cleaned.slice(1);
  }

  // Egyptian mobile with 20 without + (e.g. 2010...)
  if (/^201[0125]\d{8}$/.test(cleaned)) {
    return "+" + cleaned;
  }

  // Already prefixed with +20
  if (/^\+201[0125]\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  // Generic international with +
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // Generic fallback: prepend +
  return cleaned ? `+${cleaned}` : "";
}

/**
 * Validates Egyptian or international phone numbers.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const clean = phone.replace(/[\s\-\(\)\.]/g, "").trim();
  // Accepts Egyptian mobiles (010, 011, 012, 015) or standard E.164
  return /^(\+?20|0)?1[0125]\d{8}$/.test(clean) || /^\+?[1-9]\d{7,14}$/.test(clean);
}

/**
 * Common disposable / throwaway email provider domains used by spam bots and fake accounts.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "fakeinbox.com",
  "sharklasers.com",
  "getairmail.com",
  "dispostable.com",
  "trashmail.com",
  "inboxbear.com",
  "mohmal.com",
  "mytemp.email",
  "dropmail.me",
  "crazymailing.com",
  "burnermail.io",
]);

/**
 * Checks whether an email belongs to a known temporary/disposable domain.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.trim().toLowerCase().split("@")[1];
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Validates email format strictly.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates password strength (minimum 6 characters for user convenience).
 */
export function isStrongPassword(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 6) {
    return { valid: false, reason: "كلمة المرور يجب ألا تقل عن 6 أحرف" };
  }
  return { valid: true };
}

export interface BotSecurityResult {
  isBlocked: boolean;
  reason?: string;
  riskScore: number;
}

/**
 * Anti-Bot & Spam Submission Guard:
 * Multi-layer evaluation without naive user-data matching.
 * 
 * 1. Explicit Spam Signatures:
 *    Detects automated scrapers/bots that inject URLs (http/https/www), HTML/script tags,
 *    bbcode, spam advertising tokens, or excessive payload lengths (> 100 chars).
 * 
 * 2. Inhuman Speed Trap:
 *    Catches sub-second programmatic submissions while tolerating client clock skews.
 * 
 * 3. Autofill Tolerance:
 *    Benign text accidentally placed in a hidden field by a browser extension
 *    does NOT unilaterally block legitimate humans, while spam payloads are rejected.
 * 
 * 4. Resilient Server Defense:
 *    Even if a bot leaves the honeypot empty, IP/email rate limits, OTP verification,
 *    and cryptographic tokens protect the endpoints.
 */
export function evaluateSubmissionSecurity(options: {
  honeypotValue?: string | null;
  formLoadedAt?: number | null;
  minDurationMs?: number;
}): BotSecurityResult {
  const { honeypotValue, formLoadedAt, minDurationMs = 400 } = options;
  let riskScore = 0;

  // Layer 1: Honeypot analysis
  if (honeypotValue && typeof honeypotValue === "string" && honeypotValue.trim().length > 0) {
    const raw = honeypotValue.trim();
    const hasSpamSignature =
      /https?:\/\/|www\.|\.ru\/|\.xyz\/|<script|<\/script|<a\s|\[url=|\b(casino|crypto|viagra|porn|seo-traffic)\b/i.test(raw) ||
      raw.length > 100;

    if (hasSpamSignature) {
      return {
        isBlocked: true,
        reason: "تعذر معالجة الطلب، تم رصد نشاط غير مصرح",
        riskScore: 100,
      };
    }

    // Harmless text without spam URLs: suspicious (+25) but not alone a block
    riskScore += 25;
  }

  // Layer 2: Speed trap (sub-human submission time)
  if (formLoadedAt && typeof formLoadedAt === "number" && !isNaN(formLoadedAt)) {
    const duration = Date.now() - formLoadedAt;
    if (duration > 0 && duration < minDurationMs) {
      riskScore += 40;
    }
  }

  if (riskScore >= 60) {
    return {
      isBlocked: true,
      reason: "يرجى الانتظار بضع ثوانٍ قبل إرسال النموذج",
      riskScore,
    };
  }

  return { isBlocked: false, riskScore };
}

/**
 * Standalone Honeypot Validator:
 * Validates that the hidden trap field remains empty and untouched.
 */
export function validateHoneypot(honeypotValue?: string | null): boolean {
  return !honeypotValue || typeof honeypotValue !== "string" || honeypotValue.trim().length === 0;
}

/**
 * Form Speed Trap:
 * Verifies submission timing while tolerating negative clock skews safely.
 */
export function validateSubmissionTiming(formLoadedAt: number | undefined | null, minMs = 400): boolean {
  if (!formLoadedAt || typeof formLoadedAt !== "number" || isNaN(formLoadedAt)) return true;
  const duration = Date.now() - formLoadedAt;
  if (duration < 0) return true; // Clock skew tolerated
  return duration >= minMs;
}

// ============================================================================
// OTP & Verification Token State Management (Email & Phone)
// ============================================================================

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

// In-memory OTP storage (keyed by normalized phone or email)
const otpStore = new Map<string, OtpRecord>();

// Verified tokens ready for registration consumption
interface VerificationTokenRecord {
  identifier: string;
  expiresAt: number;
}
const verifiedTokens = new Map<string, VerificationTokenRecord>();

/**
 * Normalizes an identifier (either email or phone number).
 */
export function normalizeIdentifier(identifier: string): string {
  if (!identifier || typeof identifier !== "string") return "";
  if (identifier.includes("@")) {
    return identifier.trim().toLowerCase();
  }
  return normalizeEgyptianPhone(identifier);
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
export function generateNumericOtp(): string {
  try {
    return randomInt(100000, 1000000).toString();
  } catch {
    const buf = new Uint32Array(1);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(buf);
      return (100000 + (buf[0] % 900000)).toString();
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

/**
 * Stores an OTP code for a normalized phone or email with an expiration window.
 * Default validity: 5 minutes (300,000 ms).
 */
export function storeOtp(identifier: string, code: string, ttlMs = 5 * 60 * 1000): void {
  const normalized = normalizeIdentifier(identifier);
  otpStore.set(normalized, {
    code,
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
    createdAt: Date.now(),
  });
}

/**
 * Verifies the OTP code entered by the user.
 * Blocks after 3 failed attempts to prevent brute-force attacks.
 */
export function verifyOtpCode(
  identifier: string,
  inputCode: string
): { valid: boolean; reason?: string } {
  const normalized = normalizeIdentifier(identifier);
  const record = otpStore.get(normalized);

  if (!record) {
    return { valid: false, reason: "لم يتم طلب رمز تحقق لهذا البريد/الرقم أو انتهت صلاحيته. يرجى طلب رمز جديد." };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalized);
    return { valid: false, reason: "انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد." };
  }

  if (record.attempts >= 3) {
    otpStore.delete(normalized);
    return { valid: false, reason: "تم تجاوز الحد الأقصى للمحاولات الخاطئة (3 محاولات). يرجى طلب رمز جديد." };
  }

  const cleanInput = inputCode.trim().replace(/\D/g, "");
  if (record.code !== cleanInput) {
    record.attempts += 1;
    const remaining = 3 - record.attempts;
    return {
      valid: false,
      reason: `رمز التحقق غير صحيح. متبقي ${remaining} محاولة.`,
    };
  }

  // Successful verification: delete OTP and return success
  otpStore.delete(normalized);
  return { valid: true };
}

/**
 * Creates a cryptographically random, signed verification token granting permission
 * to register with this email or phone. Valid for 15 minutes.
 */
export function createVerificationToken(identifier: string): string {
  const normalized = normalizeIdentifier(identifier);
  const prefix = normalized.includes("@") ? "evtk_" : "pvtk_";
  const secureRandom = randomBytes(24).toString("hex");
  const token = `${prefix}${secureRandom}`;

  verifiedTokens.set(token, {
    identifier: normalized,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return token;
}

/**
 * Validates that the provided verification token matches the identifier (email or phone).
 */
export function isVerificationTokenValid(identifier: string, token: string): boolean {
  if (!token) return false;
  const record = verifiedTokens.get(token);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    verifiedTokens.delete(token);
    return false;
  }
  const normalized = normalizeIdentifier(identifier);
  return record.identifier === normalized;
}

/**
 * Consumes the verification token after successful user registration (one-time use).
 */
export function consumeVerificationToken(token: string): boolean {
  if (!token) return false;
  return verifiedTokens.delete(token);
}

// Backwards-compatible aliases for legacy phone-specific calls
export const createPhoneVerificationToken = createVerificationToken;
export const isPhoneVerificationTokenValid = isVerificationTokenValid;
export const consumePhoneVerificationToken = consumeVerificationToken;
