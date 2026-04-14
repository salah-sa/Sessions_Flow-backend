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
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const EngineerControlTowerPage = lazy(() => import("./pages/EngineerControlTowerPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));

const PageLoader = () => (
  <div className="h-full w-full flex items-center justify-center bg-slate-950/50 backdrop-blur-md animate-fade-in">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
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
        path: "control-tower",
        children: [
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
            path: "engineer",
            element: (
              <RoleGuard allowedRoles={["Engineer"]}>
                <Suspense fallback={<PageLoader />}>
                  <EngineerControlTowerPage />
                </Suspense>
              </RoleGuard>
            )
          }
        ]
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
    ],
  },
]);
