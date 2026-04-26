import { queryClient } from "../main";

/**
 * Purges all session-specific data and caches.
 * Call this during logout or when a session is invalidated (401).
 */
export function clearSessionCaches(): void {
  try {
    // 1. Wipe TanStack Query in-memory cache
    queryClient.clear();

    // 2. Wipe persisted query cache from localStorage
    localStorage.removeItem("sf_query_cache");

    // 3. Wipe per-user Zustand persistent stores
    localStorage.removeItem("sf-chat-storage");
    localStorage.removeItem("sf-section-badge-storage");
    
    console.debug("[Session Cleanup] All caches and persistent storage cleared.");
  } catch (error) {
    console.error("[Session Cleanup] Failed to clear caches:", error);
  }
}
