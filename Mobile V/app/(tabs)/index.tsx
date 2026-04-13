/**
 * ═══════════════════════════════════════════════════════════════
 * SessionFlow Mobile — Dashboard Entry
 * Phase 19: Dashboard Switcher (Admin/Engineer vs Student)
 * ═══════════════════════════════════════════════════════════════
 */

import React from "react";
import { useAuthStore } from "../../shared/store/stores";
import { AdminDashboard } from "../../components/dashboard/AdminDashboard";
import { StudentDashboard } from "../../components/dashboard/StudentDashboard";

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  
  if (!user) return null;

  // Render Role-Specific Dashboard
  if (user.role === "Student") {
    return <StudentDashboard />;
  }

  return <AdminDashboard />;
}
