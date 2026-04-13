# SessionFlow: Chat UI + Progress Logic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct progress/timeline logic for Station 5 starts and stabilize Chat UI with isolated scrolling and fixed positioning.

**Architecture:** Transition from global page scrolling to isolated component scrolling. Centralize progress calculations to handle historical offsets correctly.

**Tech Stack:** React, Tailwind CSS v4, GSAP, Lucide React, date-fns.

---

## Scope

- **In**: 
  - Isolated scrolling in `Shell.tsx` and `ChatPage.tsx`.
  - Emoji picker positioning fix in `Chat.tsx`.
  - Sender identity display in `MessageBubble`.
  - Progress math correction in `GroupSessionsPage.tsx` (Station 5 = 33%).
  - Timeline visual highlight for the "Current Session".
- **Out**: 
  - Backend logic changes (fixing in frontend first as requested).
  - New chat features (only fixing existing bugs).

---

## Action Items

### Task 1: Refactor Shell Layering
- **Files**: 
  - `sessionflow-ui/src/components/layout/Shell.tsx`
  - `sessionflow-ui/src/pages/DashboardPage.tsx`
- Remove global `overflow-y-auto` from `Shell.tsx`.
- Enable specific `overflow-y-auto` on `DashboardPage.tsx` to preserve its scrollable nature while freeing ChatPage.

### Task 2: Chat Layout Isolation
- **Files**: 
  - `sessionflow-ui/src/pages/ChatPage.tsx`
- Wrap the `ChatWindow` in a `flex-1 min-h-0` container with `overflow-hidden`.
- Ensure the root div is `h-full` to prevent page-level jumping.

### Task 3: Chat Component Polish
- **Files**: 
  - `sessionflow-ui/src/components/chat/Chat.tsx`
- Anchor the Emoji picker to `right-0` (prevent clipping).
- Update `MessageBubble` to always reveal the sender's name/avatar for incoming traffic.

### Task 4: Progress Logic Correction
- **Files**: 
  - `sessionflow-ui/src/pages/GroupSessionsPage.tsx`
- Hardcode Level 2 total sessions to 12.
- Set `completedCount = currentSessionNumber - 1` (Station 5 → 4).
- Calculate `progressPercent = (4 / 12) * 100`.

### Task 5: Timeline Visual Anchor
- **Files**: 
  - `sessionflow-ui/src/pages/GroupSessionsPage.tsx`
- Identify the session where `logicalNumber === currentSessionNumber`.
- Apply the "**Active Node**" aesthetic: `border-emerald-500/50`, `bg-emerald-500/[0.05]`, and an "Active" badge.

---

## Validation

- **Verify Chat**: Send multiple long messages; only the chat list should scroll. Footer remains fixed.
- **Verify Emoji**: Panel shows up on the right side of the screen, fully visible.
- **Verify Progress**: Group starting at Station 5 shows "4 / 12 Completed" and a 33% bar.
- **Verify Build**: `dotnet build` and `npm run build` (or `tsc --noEmit`).

---

## Open Questions
- **Station 5 Logic**: I've assumed `currentSessionNumber = 5` means 4 are historically done. If "5" means 5 are done, please specify.
