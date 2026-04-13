/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — API Client (fetchWithAuth)
 * Phase 7: Production-Hardened Network Layer
 * Phase 13.A: Token Refresh Strategy
 * ═══════════════════════════════════════════════════════════
 */

import { API_BASE_URL, MOBILE_VERSION, PLATFORM } from "./config";
import { secureStorage } from "../../services/secureStorage";
import { apiMonitor } from "../lib/apiMonitor";
import { router } from "expo-router";

let cachedToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Updates the in-memory token cache. Called by AuthStore.
 */
export const setCachedToken = (token: string | null) => {
  cachedToken = token;
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

/**
 * Core fetch wrapper with:
 * 1. Automatic JWT Injection
 * 2. Device/Version Headers
 * 3. 401 Interception + Refresh Logic
 * 4. Request Deduplication (Race protection)
 */
export async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  isBlob = false,
  timeout = 15000
): Promise<T> {
  // Ensure we have a token
  if (!cachedToken) {
    cachedToken = await secureStorage.getToken();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Phase 14.A: Force HTTPS in production
  if (!__DEV__ && url.startsWith("http://")) {
    url = url.replace("http://", "https://");
  }

  // Phase 16: Track API calls in DEV mode to catch duplicate requests
  if (__DEV__) {
    const rawEndpoint = url.replace(API_BASE_URL, "");
    apiMonitor.track(rawEndpoint, options.method || "GET");
  }

  const defaultHeaders: Record<string, string> = {
    "X-Mobile-Version": MOBILE_VERSION,
    "X-Platform": PLATFORM,
    "X-Secure-Agent": `SessionFlow-Mobile-${PLATFORM}/${MOBILE_VERSION}`,
  };

  // Only add Content-Type: application/json if body is not FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  if (cachedToken) {
    defaultHeaders["Authorization"] = `Bearer ${cachedToken}`;
  }

  const mergedOptions: RequestInit = {
    ...options,
    signal: controller.signal,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);
    clearTimeout(timeoutId);

    // Handle 401 Unauthorized -> Refresh Strategy
    if (response.status === 401 && !url.includes("/auth/refresh")) {
      return handle401<T>(url, mergedOptions, isBlob);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    // Handle empty responses
    if (response.status === 204) return null as any;

    if (isBlob) {
      return (await response.blob()) as unknown as T;
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("REQUEST_TIMEOUT: Server took too long to respond.");
    }
    if (__DEV__) console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Handles 401 errors by attempting a token refresh.
 * Uses a subscriber pattern to prevent multiple refresh calls (Refresh Race Protection).
 */
async function handle401<T>(url: string, options: RequestInit, isBlob = false): Promise<T> {
  if (!isRefreshing) {
    isRefreshing = true;
    try {
      if (__DEV__) console.info("[Auth] Token expired. Attempting refresh...");
      const refreshToken = await secureStorage.getRefreshToken();
      
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const { token, refreshToken: newRefreshToken } = await refreshResponse.json();
        await secureStorage.setToken(token);
        if (newRefreshToken) await secureStorage.setRefreshToken(newRefreshToken);
        
        cachedToken = token;
        onTokenRefreshed(token);
        isRefreshing = false;
        
        // Retry the original request
        return fetchWithAuth<T>(url, options, isBlob);
      } else {
        // Refresh failed (e.g. refresh token expired) -> Force logout
        if (__DEV__) console.warn("[Auth] Refresh token invalid. Logging out.");
        await secureStorage.clearAll();
        
        try {
          const { useAuthStore } = require("../store/stores");
          await useAuthStore.getState().logout();
          router.replace("/(auth)/login");
        } catch(e) {
          console.error("Logout navigation failure", e);
        }

        throw new Error("Session expired. Please log in again.");
      }
    } catch (error) {
      isRefreshing = false;
      throw error;
    }
  }

  // If already refreshing, wait for it to complete
  return new Promise<T>((resolve, reject) => {
    refreshSubscribers.push((newToken) => {
      // Create new headers with the fresh token
      const newOptions = {
        ...options,
        headers: {
          ...options.headers,
          "Authorization": `Bearer ${newToken}`,
        },
      };
      fetchWithAuth<T>(url, newOptions, isBlob).then(resolve).catch(reject);
    });
  });
}
