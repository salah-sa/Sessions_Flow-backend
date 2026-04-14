import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/stores";

interface GuestGuardProps {
  children: React.ReactNode;
}

const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  // Don't redirect until hydration is complete — prevents flash-redirect race
  if (hydrated && token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default GuestGuard;
