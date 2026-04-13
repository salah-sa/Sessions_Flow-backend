/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Auth Provider
 * Phase 14: App Hydration & Security Entry Point
 * ═══════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuthStore } from "../shared/store/stores";
import { secureStorage } from "../services/secureStorage";
import { setCachedToken } from "../shared/api/client";
import { authApi } from "../shared/api/resources";
import { router, useSegments } from "expo-router";
import { logger } from "../shared/lib/logger";

interface AuthContextType {
  isHydrated: boolean;
}

const AuthContext = createContext<AuthContextType>({ isHydrated: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const { setAuth, user, token } = useAuthStore();
  const segments = useSegments();

  // 1. Initial Hydration & Server Validation
  useEffect(() => {
    const hydrate = async () => {
      try {
        const storedUser = await secureStorage.getUser();
        const storedToken = await secureStorage.getToken();

        if (storedUser && storedToken) {
          setCachedToken(storedToken);
          
          try {
            // Validate token against server
            const latestUser = await authApi.getMe();
            
            // Server returned valid user payload; session is healthy
            await setAuth(latestUser, storedToken);
            logger.setUserId(latestUser.id);
            logger.track("SESSION_RECOVERED", { role: latestUser.role });
            console.info("[Auth] Session validated securely with server.");
          } catch (serverError) {
            console.warn("[Auth] Server rejected token during hydration. Purging session.");
            logger.warn("SESSION_PURGED", { reason: "SERVER_REJECTED" });
            await secureStorage.clearAll();
            useAuthStore.getState().logout();
          }
        }
      } catch (e) {
        logger.error("HYDRATION_FAILED", e);
        console.error("[Auth] Local hydration failed:", e);
      } finally {
        setIsHydrated(true);
      }
    };

    hydrate();
  }, []);

  // 2. Navigation Guard Root Logic
  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isAuthenticated = !!token && !!user;

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated and in auth group
      router.replace("/(tabs)");
    }
  }, [user, token, isHydrated, segments]);

  return (
    <AuthContext.Provider value={{ isHydrated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
