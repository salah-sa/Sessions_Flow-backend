# SessionFlow Dashboard & Group Management Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the Engineer Dashboard with comprehensive statistics, add opening sound, fix group session numbering logic, and restrict student name editing in group management.

**Architecture:** 
- **Backend:** Expand `DashboardEndpoints` to return student and session aggregates.
- **Frontend:** Update `DashboardPage`, `GroupSessionsPage`, and `GroupsPage` (Wizard) for better data visibility and restricted editing.
- **UX:** Implement a Web Audio API synthesizer in `SplashScreen` for a cinematic entrance.

**Tech Stack:** C# (.NET 8), MongoDB, React (TypeScript), Web Audio API, GSAP.

---

### Task 1: Backend - Enrich Dashboard Statistics
**Files:**
- Modify: `d:\Work\assets outer\test\SessionFlow\SessionFlow.Desktop\Api\Endpoints\DashboardEndpoints.cs`

**Step 1: Implement new statistic counters**
Add `totalStudents`, `completedSessionsAllTime`, `upcomingSessions`, and `completedGroups` to the `/summary` response. Use efficient MongoDB `CountDocumentsAsync` with appropriate filters (Role-based).

**Step 2: Verify API response**
Run: `dotnet build`
Verification: Ensure the endpoint returns the new fields.

---

### Task 2: Backend - Session Generation Logic (Offset Fix)
**Files:**
- Modify: `d:\Work\assets outer\test\SessionFlow\SessionFlow.Desktop\Services\ScheduleEngine.cs`

**Step 1: Update GenerateTimeline**
Modify the loop at line 59 to respect `startingSessionNumber` so starting Level 2 at session 4 only generates sessions 4-12 (9 total).

---

### Task 3: Frontend - Dashboard Stat Cards
**Files:**
- Modify: `d:\Work\assets outer\test\SessionFlow\sessionflow-ui\src\pages\DashboardPage.tsx`

**Step 1: Update stats array**
Display 6 cards instead of 3. Include: Total Groups, Total Students, Today's Sessions, Active Now, Upcoming, and Completed (All Time).

**Step 2: Update UI Layout**
Adjust the grid from `sm:grid-cols-3` to `sm:grid-cols-3 lg:grid-cols-6` and update icons/colors for new categories.

---

### Task 4: Frontend - Group Management UI Fixes
**Files:**
- Modify: `d:\Work\assets outer\test\SessionFlow\sessionflow-ui\src\pages\GroupSessionsPage.tsx`
- Modify: `d:\Work\assets outer\test\SessionFlow\sessionflow-ui\src\pages\GroupsPage.tsx`

**Step 1: Fix Session Numbering**
In `GroupSessionsPage.tsx`, change the label from `Session {index + 1}` to `Session {session.sessionNumber}` to reflect actual session IDs (important for starting at session 4).

**Step 2: Restrict Student Editing in Wizard**
In `GroupsPage.tsx`, modify the Edit Group flow to:
- Load existing students.
- Make student name inputs **read-only** in the wizard.
- Add a hint that students can be added or removed via the dedicated management buttons.

---

### Task 5: UX - Opening Sound Effects
**Files:**
- Modify: `d:\Work\assets outer\test\SessionFlow\sessionflow-ui\src\components\SplashScreen.tsx`

**Step 1: Add Web Audio API Synth**
Implement a `playSplashSound` function that uses `AudioContext` to generate a sine-wave digital chime when the logo scales up (`logoRef`).

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-04-10-dashboard-and-logic-fixes.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration.

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints.

**Which approach?**
