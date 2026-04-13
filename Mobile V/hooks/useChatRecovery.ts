/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Auth State Anti-Corruption Layer
 * PARITY: 1:1 mirror of desktop hooks/useChatRecovery.ts
 * ═══════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../shared/store/stores";
import { authApi } from "../shared/api/resources";

/**
 * Anti-corruption layer: monitors for auth state corruption and auto-recovers.
 * 
 * Detects the case where:
 *   - token exists in SecureStore (user was logged in)
 *   - but user object is null (Zustand persist failed / storage overflow)
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
  const hasRecovered = useRef(false);

  useEffect(() => {
    // If we have a token but no user, auth store is corrupted
    if (token && !user && !hasRecovered.current) {
      hasRecovered.current = true;
      console.warn("[ChatRecovery] Auth store corrupted — token exists but user is null. Triggering recovery.");

      authApi.getMe()
        .then((freshUser) => {
          if (freshUser) {
            console.info("[ChatRecovery] Successfully recovered auth state.");
            setAuth(freshUser, token);
            // Force refetch all data with now-valid auth
            queryClient.invalidateQueries();
          } else {
            console.error("[ChatRecovery] /auth/me returned null — forcing logout.");
            logout();
          }
        })
        .catch((err) => {
          console.error("[ChatRecovery] Token is also invalid — forcing logout.", err);
          logout();
        });
    }

    // Reset recovery flag when user successfully logs in
    if (user && token) {
      hasRecovered.current = false;
    }
  }, [token, user, queryClient, setAuth, logout]);
}
