"use client";

import { useEffect } from "react";
import { isCapacitorPlatform, resolveApiUrl } from "@/lib/apiClient";
import {
  getStoredAuthTokenSync,
  setStoredAuthToken,
  clearStoredAuthToken,
} from "@/lib/auth/mobileAuthStorage";

/**
 * Automatically patches window.fetch inside Capacitor WebView so that any
 * relative fetch('/api/...') call seamlessly targets the full server URL
 * and automatically injects Authorization Bearer tokens for mobile persistence.
 */
export default function CapacitorClientInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      let finalInput = input;
      const isApiPath =
        (typeof input === "string" && input.startsWith("/api/")) ||
        (input instanceof URL && input.pathname.startsWith("/api/"));

      // 1. Resolve relative API path to absolute URL if running inside Capacitor
      if (isCapacitorPlatform() && isApiPath) {
        if (typeof input === "string") {
          finalInput = resolveApiUrl(input);
        } else if (input instanceof URL) {
          finalInput = resolveApiUrl(input.pathname + input.search);
        }
      }

      // 2. Auto-inject Authorization Bearer header if user has active session
      const headers = new Headers(init?.headers || {});
      if (isApiPath && !headers.has("Authorization")) {
        const token = getStoredAuthTokenSync();
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }

      const mergedInit: RequestInit = {
        ...init,
        credentials: init?.credentials || "include",
        headers,
      };

      const res = await originalFetch(finalInput, mergedInit);

      // 3. Intercept successful login/register responses to persist token in Capacitor preferences
      if (isApiPath && res.ok) {
        const urlStr = typeof finalInput === "string" ? finalInput : finalInput.toString();
        if (
          urlStr.includes("/api/auth/login") ||
          urlStr.includes("/api/auth/email-otp/verify") ||
          urlStr.includes("/api/auth/otp/verify") ||
          urlStr.includes("/api/auth/register")
        ) {
          try {
            const clone = res.clone();
            clone
              .json()
              .then((data) => {
                if (data?.token) {
                  setStoredAuthToken(data.token);
                }
              })
              .catch(() => {});
          } catch {}
        } else if (urlStr.includes("/api/auth/logout")) {
          clearStoredAuthToken().catch(() => {});
        }
      }

      return res;
    };
  }, []);

  return null;
}
