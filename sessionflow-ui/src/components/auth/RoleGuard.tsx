import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/stores";
import { toast } from "sonner";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If user doesn't have permission, send them back to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Page-level blocking enforcement
  let currentPage = location.pathname.split("/")[1]; // e.g. "chat", "groups"
  if (currentPage === "plans") currentPage = "pricing";
  
  if (user.blockedPages?.includes(currentPage)) {
    const reason = user.restrictionReason ? ` Reason: ${user.restrictionReason}` : "";
    toast.error(`Access to this page has been restricted by an administrator.${reason}`, { id: "page-blocked" });
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
