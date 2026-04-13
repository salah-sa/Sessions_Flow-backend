import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/stores";

interface GuestGuardProps {
  children: React.ReactNode;
}

const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { token } = useAuthStore();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default GuestGuard;
