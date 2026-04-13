import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/stores";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If user doesn't have permission, send them back to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
