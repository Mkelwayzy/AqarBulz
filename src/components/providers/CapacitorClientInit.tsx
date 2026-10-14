"use client";

import { useEffect } from "react";
import { isCapacitorPlatform, resolveApiUrl } from "@/lib/apiClient";

/**
 * Automatically patches window.fetch inside Capacitor WebView so that any
 * relative fetch('/api/...') call seamlessly targets the full server URL.
 */
export default function CapacitorClientInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isCapacitorPlatform()) {
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        let finalInput = input;
        if (typeof input === "string" && input.startsWith("/api/")) {
          finalInput = resolveApiUrl(input);
        } else if (input instanceof URL && input.pathname.startsWith("/api/")) {
          finalInput = resolveApiUrl(input.pathname + input.search);
        }

        const mergedInit: RequestInit = {
          ...init,
          credentials: init?.credentials || "include",
        };

        return originalFetch(finalInput, mergedInit);
      };
    }
  }, []);

  return null;
}
