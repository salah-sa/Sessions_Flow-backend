import { useAuthStore } from "../store/stores";
import { apiMonitor } from "../lib/apiMonitor";

const BASE_URL = "/api";

export async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  isBlob = false
): Promise<T> {
  const token = localStorage.getItem("sf_token");
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!isBlob && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Track every API call for duplicate detection
  apiMonitor.track(endpoint, options.method || "GET");

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        useAuthStore.getState().logout();
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        throw new Error("Session expired. Please login again.");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    
    if (isBlob) return await response.blob() as unknown as T;
    
    return await response.json();
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.debug(`[fetchWithAuth] Request aborted: ${endpoint}`);
      throw error;
    }
    throw error;
  }
}

// Resource modules can now use this client.
