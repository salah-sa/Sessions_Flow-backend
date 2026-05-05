import { useAuthStore } from "../store/stores";
import { apiMonitor } from "../lib/apiMonitor";
import { clearSessionCaches } from "../lib/sessionCleanup";

// In dev: Vite proxy forwards /api → Railway (BASE_URL = "")
// In Electron build: VITE_API_URL = full Railway origin, so fetch hits it directly
const BASE_URL = (import.meta.env.VITE_API_URL ?? "") + "/api/v1";

// Refresh token rotation lock to prevent concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for the existing attempt
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) return false;

      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      const { setAuth } = useAuthStore.getState();
      setAuth(data.user, data.token, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}


export async function fetchPublic<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Requested-With", "XMLHttpRequest");

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return await response.json();
  } catch (error: any) {
    throw error;
  }
}

export async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  isBlob = false
): Promise<T> {
  const { token } = useAuthStore.getState();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!isBlob && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Requested-With", "XMLHttpRequest");

  // Track every API call for duplicate detection
  apiMonitor.track(endpoint, options.method || "GET");

  try {
    let response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Automatic token refresh on 401
    if (response.status === 401) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry the original request with the new token
        const { token: newToken } = useAuthStore.getState();
        const retryHeaders = new Headers(options.headers);
        if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);
        if (!isBlob && !retryHeaders.has("Content-Type") && !(options.body instanceof FormData)) {
          retryHeaders.set("Content-Type", "application/json");
        }
        retryHeaders.set("X-Requested-With", "XMLHttpRequest");

        response = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers: retryHeaders,
        });
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        const method = (options.method || "GET").toUpperCase();
        const isSessionCheck = endpoint === "/auth/me" || endpoint.startsWith("/auth/me?");
        // Mutations (POST/PUT/DELETE) that 401 are a strong signal the session
        // is truly expired — unlike background GET re-fetches that can transiently fail.
        const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

        if (isSessionCheck || isMutation) {
          const { _lastLoginAt, logout } = useAuthStore.getState();
          const timeSinceLogin = Date.now() - _lastLoginAt;
          const LOGIN_COOLDOWN_MS = 5000;

          if (timeSinceLogin > LOGIN_COOLDOWN_MS) {
            logout();
            clearSessionCaches();
            if (!window.location.pathname.includes("/login")) {
              window.location.href = "/login";
            }
          }
        }
        throw new Error("Session expired. Please login again.");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    
    if (isBlob) return await response.blob() as unknown as T;
    
    return await response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.debug(`[fetchWithAuth] Request aborted: ${endpoint}`);
      }
      throw error;
    }
    throw new Error("An unexpected error occurred during the API request.");
  }
}

// Resource modules can now use this client.

