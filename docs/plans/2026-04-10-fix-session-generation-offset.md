# Fix Session Generation for Mid-Level Starting Groups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct the session generation logic so that groups starting from a session offset (e.g., Level 2 starting at session 4) only generate the remaining sessions with correct session numbers, and update the UI to reflect this progress accurately.

**Architecture:** 
1. Modify `ScheduleEngine.GenerateTimeline` to accept a `startingSessionNumber` and calculate the session count and numbering based on it.
2. Update `GroupsPage.tsx` logic to calculate progress based on `(current - start) / (total - start + 1)` and add "Sessions Remaining" info to the creation wizard.

**Tech Stack:** C# (.NET 8), MongoDB, React (TypeScript), Tailwind CSS.

---

### Task 1: Backend - Add Test Case for Offset Generation
**Files:**
- Modify: `d:\Work\assets outer\test\SessionFlow\SessionFlow.Desktop.Tests\Services\ScheduleEngineTests.cs`

**Step 1: Write failing test**
Create a test that verifies `GenerateTimeline` with `totalSessions=12` and `startingSessionNumber=4` returns 9 sessions numbered 4 through 12.

**Step 2: Run test to verify it fails**
Run: `dotnet test --filter Name~GenerateTimeline_WithOffset`

### Task 2: Backend - Update ScheduleEngine Logic
**Files:**
- Modify: `d:\Work\assets outer\test\SessionFlow\SessionFlow.Desktop\Services\ScheduleEngine.cs`

**Step 1: Update GenerateTimeline signature**
Update the signature at line 16 to include `int startingSessionNumber = 1`.

**Step 2: Update loop logic**
Update the loop at line 59 and the numbering at line 70.

**Step 3: Update GenerateFromGroup**
Update line 91 to pass the session offset.

**Step 4: Run tests to verify the fix**
Expected: PASS

### Task 3: Frontend - Fix Progress Bar Calculation
**Files:**
- Modify: `d:\Work\assets outer\test\SessionFlow\sessionflow-ui\src\pages\GroupsPage.tsx`

**Step 1: Update progress bar width**
Update the `style={{ width: ... }}` at line 515.

### Task 4: Frontend - Enhance Wizard UX
**Files:**
- Modify: `d:\Work\assets outer\test\SessionFlow\sessionflow-ui\src\pages\GroupsPage.tsx`

**Step 1: Add "Sessions Remaining" display**
Insert the labels after line 835.

### Task 5: Manual Verification
**Action:**
1. Create a Level 2 group (Total 12) starting at Session 4.
2. Verify in the UI that the sessions list shows #4 as the first session.
