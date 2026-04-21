import { useAuthStore } from "../store/stores";
import { apiMonitor } from "../lib/apiMonitor";

// In dev: Vite proxy forwards /api → Railway (BASE_URL = "")
// In Electron build: VITE_API_URL = full Railway origin, so fetch hits it directly
const BASE_URL = (import.meta.env.VITE_API_URL ?? "") + "/api";


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
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Only the /auth/me endpoint is the definitive "session expired" signal.
        // Background query re-fetches (from SignalR invalidation) can transiently 401
        // without meaning the session is truly dead.
        const isSessionCheck = endpoint === "/auth/me" || endpoint.startsWith("/auth/me?");

        if (isSessionCheck) {
          const { _lastLoginAt, logout } = useAuthStore.getState();
          const timeSinceLogin = Date.now() - _lastLoginAt;
          const LOGIN_COOLDOWN_MS = 5000;

          if (timeSinceLogin > LOGIN_COOLDOWN_MS) {
            logout();
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
