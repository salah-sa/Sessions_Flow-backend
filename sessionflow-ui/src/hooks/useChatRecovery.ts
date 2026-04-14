import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/stores";
import { useMeQuery } from "../queries/useAuthQueries";

/**
 * Anti-corruption layer: monitors for auth state corruption and auto-recovers.
 * 
 * Detects the case where:
 *   - token exists in localStorage (user was logged in)
 *   - but user object is null (Zustand persist failed / localStorage overflow)
 * 
 * Recovery:
 *   1. Calls GET /auth/me to fetch fresh user with the existing token
 *   2. If successful: restores auth state → all queries refetch automatically
 *   3. If fails: force logout to prevent infinite broken state
 */
export function useChatRecovery() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);
  const { refetch } = useMeQuery({ enabled: false });
  const hasRecovered = useRef(false);

  useEffect(() => {
    // If we have a token but no user, auth store is corrupted
    if (token && !user && !hasRecovered.current) {
      hasRecovered.current = true;
      
      // Add a small delay for store hydration to settle
      setTimeout(() => {
        // Re-check after delay
        const latestState = useAuthStore.getState();
        if (latestState.user) return;

        // Don't force-logout during login cooldown
        const timeSinceLogin = Date.now() - latestState._lastLoginAt;
        if (timeSinceLogin < 5000) {
          console.info("[ChatRecovery] Within login cooldown — skipping recovery.");
          hasRecovered.current = false;
          return;
        }

        console.warn("[ChatRecovery] Auth store corrupted — token exists but user is null. Triggering recovery via normalized query.");

        refetch().then(({ data: freshUser }) => {
          if (freshUser) {
            console.info("[ChatRecovery] Successfully recovered auth state.");
            setAuth(freshUser, token);
            queryClient.invalidateQueries();
          } else {
            console.error("[ChatRecovery] /auth/me returned null — forcing logout.");
            logout();
          }
        }).catch((err) => {
          console.error("[ChatRecovery] Token is also invalid — forcing logout.", err);
          logout();
        });
      }, 1500);
    }

    // Reset recovery flag when user successfully logs in
    if (user && token) {
      hasRecovered.current = false;
    }
  }, [token, user, queryClient, setAuth, logout, refetch]);
}
