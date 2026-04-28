import { createBrowserRouter, Navigate } from "react-router-dom";
import React, { lazy, Suspense } from "react";
import Shell from "./components/layout/Shell";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import GuestGuard from "./components/auth/GuestGuard";

// Lazy load pages for performance
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const GroupsPage = lazy(() => import("./pages/GroupsPage"));
const GroupSessionsPage = lazy(() => import("./pages/GroupSessionsPage"));
const SessionsListPage = lazy(() => import("./pages/SessionsListPage"));
const SessionPage = lazy(() => import("./pages/SessionPage"));
const TimetablePage = lazy(() => import("./pages/TimetablePage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const StaffPortalPage = lazy(() => import("./pages/StaffPortalPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));

const PageLoader = () => (
  <div className="h-full w-full flex items-center justify-center bg-slate-950/50 backdrop-blur-md animate-fade-in">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Loading Resources</p>
    </div>
  </div>
);

import RoleGuard from "./components/auth/RoleGuard";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <GuestGuard>
        <LoginPage />
      </GuestGuard>
    ),
  },
  {
    path: "/register",
    element: (
      <GuestGuard>
        <RegisterPage />
      </GuestGuard>
    ),
  },
  {
    path: "/",
    element: <Shell />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "student-dashboard",
        element: (
          <RoleGuard allowedRoles={["Student"]}>
            <Suspense fallback={<PageLoader />}>
              <StudentDashboard />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "dashboard",
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: "groups",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <GroupsPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "groups/:groupId/sessions",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <GroupSessionsPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "sessions",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <SessionsListPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "sessions/:id",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <SessionPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "timetable",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <TimetablePage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "attendance",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <AttendancePage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "students",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <StudentsPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "history",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer", "Student"]}>
            <Suspense fallback={<PageLoader />}>
              <HistoryPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "chat",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer", "Student"]}>
            <Suspense fallback={<PageLoader />}>
              <ChatPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "admin",
        element: (
          <RoleGuard allowedRoles={["Admin"]}>
            <Suspense fallback={<PageLoader />}>
              <AdminPage />
            </Suspense>
          </RoleGuard>
        )
      },
      {
        path: "staff",
        element: (
          <RoleGuard allowedRoles={["Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <StaffPortalPage />
            </Suspense>
          </RoleGuard>
        )
      },
      {
        path: "settings",
        element: (
          <RoleGuard allowedRoles={["Admin"]}>
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "profile",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer", "Student"]}>
            <Suspense fallback={<PageLoader />}>
              <ProfilePage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "archive",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <ArchivePage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "plans",
        element: (
          <RoleGuard allowedRoles={["Admin", "Engineer"]}>
            <Suspense fallback={<PageLoader />}>
              <PricingPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "users",
        element: (
          <RoleGuard allowedRoles={["Admin"]}>
            <Suspense fallback={<PageLoader />}>
              <UsersPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "*",
        element: (
          <div className="h-full w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[var(--ui-accent)] to-purple-500">404</div>
              <h2 className="text-xl font-bold text-white">Page Not Found</h2>
              <p className="text-sm text-slate-400 max-w-xs">The page you're looking for doesn't exist or has been moved.</p>
              <a href="/dashboard" className="mt-2 px-6 py-2.5 rounded-xl bg-[var(--ui-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Back to Dashboard
              </a>
            </div>
          </div>
        ),
      },
    ],
  },
]);
