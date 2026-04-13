/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Role Guard Component
 * PARITY: 1:1 mirror of desktop RoleGuard.tsx
 * Adaptations: Uses Expo Router instead of react-router-dom
 * ═══════════════════════════════════════════════════════════
 */

import React from "react";
import { router } from "expo-router";
import { useAuthStore } from "../../shared/store/stores";
import { UserRole } from "../../shared/types";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * Wraps any view/screen to enforce role-based access.
 * If the user is not authenticated → redirect to login.
 * If the user doesn't have the required role → redirect to dashboard.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback }) => {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    // Not authenticated — redirect to login
    if (router.canGoBack()) {
      router.replace("/(auth)/login");
    }
    return fallback ?? null;
  }

  if (!allowedRoles.includes(user.role)) {
    // Unauthorized role — redirect to dashboard
    if (router.canGoBack()) {
      router.replace("/(tabs)");
    }
    return fallback ?? null;
  }

  return <>{children}</>;
};

/**
 * Hook for role-based visibility checks in tab bar and components.
 * Returns utilities to check if the current user has access to specific features.
 */
export const useRoleAccess = () => {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  return {
    isAdmin: role === "Admin",
    isEngineer: role === "Engineer",
    isStudent: role === "Student",
    isAdminOrEngineer: role === "Admin" || role === "Engineer",
    hasRole: (roles: UserRole[]) => !!role && roles.includes(role),
    role,
  };
};
