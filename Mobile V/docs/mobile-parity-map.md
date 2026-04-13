# SessionFlow Mobile ↔ Desktop Parity Map

> **Source of Truth**: `sessionflow-ui/src/` (Vite + React + TailwindCSS)
> **Target**: `Mobile V/` (Expo + React Native + Reanimated)

## Screen Mapping

| Desktop View | Desktop File | Mobile Screen | Mobile File | Status | Notes |
|---|---|---|---|---|---|
| Login | `LoginPage.tsx` | Login | `(auth)/login.tsx` | ⚠️ Partial | Missing glass/mesh/stagger |
| Register | `RegisterPage.tsx` | Register | `(auth)/register.tsx` | ⚠️ Partial | Style diverged |
| Dashboard (Admin) | `DashboardPage.tsx` | Dashboard | `(tabs)/index.tsx` → `AdminDashboard` | ⚠️ Partial | Desktop 62KB vs thin wrapper |
| Dashboard (Student) | `StudentDashboard.tsx` | Dashboard | `(tabs)/index.tsx` → `StudentDashboard` | ⚠️ Partial | Needs parity check |
| Groups | `GroupsPage.tsx` | Groups | `(tabs)/groups/index.tsx` | ⚠️ Partial | Missing create/edit modals |
| Group Sessions | `GroupSessionsPage.tsx` | — | *MISSING* | ❌ Missing | Needs sub-screen |
| Sessions List | `SessionsListPage.tsx` | Sessions | `(tabs)/sessions/index.tsx` | ⚠️ Partial | Interactions weak |
| Session Hub | `SessionPage.tsx` | Session Detail | `(tabs)/sessions/[id].tsx` | ⚠️ Partial | Motion dead |
| Timetable | `TimetablePage.tsx` | Timetable | `(tabs)/timetable.tsx` | ⚠️ Partial | Desktop 30KB vs 5.7KB |
| Students | `StudentsPage.tsx` | Students | `(tabs)/students.tsx` | ⛔ Skeleton | Desktop 38KB vs 3.5KB |
| History | `HistoryPage.tsx` | History | `(tabs)/history.tsx` | ⚠️ Partial | Desktop 34KB vs 5.3KB |
| Chat | `ChatPage.tsx` | Chat | `(tabs)/chat/[id].tsx` | ⚠️ Partial | Core works, polish needed |
| Admin | `AdminPage.tsx` | — | *DEFERRED* | 🔒 Desktop-only | Admin scope |
| Settings | `SettingsPage.tsx` | — | *DEFERRED* | 🔒 Desktop-only | Admin scope |
| Profile | `ProfilePage.tsx` | Profile | `(tabs)/profile.tsx` | ✅ Good | Most complete |
| Archive | `ArchivePage.tsx` | Archive | `(tabs)/archive.tsx` | ⛔ Skeleton | Needs rebuild |

## Component Mapping

| Desktop Component | Mobile Equivalent | Status |
|---|---|---|
| `Shell.tsx` (Sidebar + TopBar) | `GlassTabBar` + `AdaptiveHeader` | ⚠️ Partial |
| `Sidebar.tsx` | `GlassTabBar.tsx` | ⚠️ Partial |
| `TopBar.tsx` | `AdaptiveHeader.tsx` | ⚠️ Partial |
| `ConnectionBanner.tsx` | — | ❌ Missing |
| `NotificationCenter.tsx` | Push notifications | ⚠️ Partial |
| `ui/index.tsx` → Button | `ui/Button.tsx` | ⚠️ Partial |
| `ui/index.tsx` → Card | `ui/GlassView.tsx` | ⚠️ Partial |
| `ui/index.tsx` → Input | `ui/Input.tsx` | ⚠️ Partial |
| `ui/index.tsx` → Badge | `ui/Badge.tsx` | ✅ Good |
| `ui/index.tsx` → Modal | `ui/CinematicModal.tsx` | ⚠️ Partial |
| `ui/index.tsx` → Skeleton | `ui/Skeleton.tsx` | ✅ Good |
| `ui/index.tsx` → EmptyState | `ui/EmptyState.tsx` | ✅ Good |
| `ui/index.tsx` → ErrorState | `ui/ErrorFallback.tsx` | ✅ Good |
| `SplashScreen.tsx` | Expo SplashScreen | ✅ Good |

## Design Token Mapping

| Desktop Token | Value | Mobile Token | Match? |
|---|---|---|---|
| `--color-ui-bg` | `#020617` | `theme.colors.bg` | ✅ |
| `--color-brand-500` | `oklch(0.5 0.22 240)` ≈ `#3B82F6` | `theme.colors.primary` | ✅ |
| `--color-ui-accent` | `oklch(0.7 0.2 160)` ≈ `#10B981` | `theme.colors.success` | ⚠️ Used as success, not accent |
| `card-base` bg | `rgba(15,23,42,0.6)` | GlassView | ⚠️ Needs verify |
| `card-aero` bg | `rgba(15,23,42,0.75)` + emerald border | — | ❌ Missing variant |
| `--font-sora` | Sora headings | `theme.typography.h1.fontFamily` | ✅ |
| `btn-primary` | 11px, black weight, tracking-widest | Button title style | ⚠️ Needs fix |
