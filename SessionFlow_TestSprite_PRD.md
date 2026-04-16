# SessionFlow Product Requirements Document (PRD)

## 1. Product Overview
SessionFlow is a premium desktop and cloud-native application designed to manage instructor sessions, timetables, and attendance. Built on a stack utilizing ASP.NET Core (for API and SignalR endpoints), React (for frontend WebViews), and a robust backend database (SQLite/MongoDB). Ensure smooth and fault-tolerant operations for group scheduling, real-time attendance, live team chat, and administrative workflows.

## 2. TestSprite Dashboard Configuration Guide
Use the following inputs when configuring the test in the TestSprite dashboard:

*   **Mode:** Backend
*   **Scope:** Codebase
*   **Authentication Type:** Basic (The system uses JWT behind the scenes but starts with basic login auth)
*   **Username:** `admin@sessionflow.local`
*   **Password:** `Admin1234!`
*   **Port:** `5180`
*   **Path:** `/`

---

## 3. Core Features & Functional Requirements

### 3.1. Session Lifecycle Management
*   **Create & Schedule:** Ability to create teaching sessions tied to specific groups and engineers.
*   **State Machine:** Sessions transition through lifecycle states (e.g., Scheduled, Started, Ended, Cancelled).
*   **Reminders:** Emit early alerts and email reminders via backend Background Services prior to session start.

### 3.2. Attendance System
*   **Real-time Tracking:** Endpoints require the capability to mark attendance (Present, Absent, Late).
*   **Live Broadcast:** Syncs and broadcasts attendance changes instantly across connected clients using SignalR WebSockets.

### 3.3. Students & Groups
*   **Group Management:** Organize cohorts with tags, dynamic levels, and active engineer assignments.
*   **Student Profiling:** Maintain histories of attendance and individual connection to grouped schedules.

### 3.4. Team Chat & Real-Time Presence
*   **Messaging:** Centralized REST API for sending group chat messages, integrated alongside SignalR for real-time delivery (`NewChatMessage`).
*   **Presence Flags:** Users toggling online/offline states dynamically broadcast across the hub (`UpdatePresence` / `PresenceChanged`).

### 3.5. Engineer & Admin Workflow
*   **Registration Rules:** Engineers register using strict offline access codes (e.g. `ENG1`).
*   **Approvals:** Admins possess authority to approve or deny pending engineer registrations.
*   **Timetable Resolution:** Handle conflict checking on drag-and-drop weekly timetable structures.

---

## 4. API Surface & Integrations

**Base URL:** `http://localhost:5180/api/`

### 4.1. Access & Auth (`/api/auth`)
*   `POST /login` (Requires JSON body with `{"Identifier": "...", "Password": "..."}` where Identifier is the user email; returns JWT token)
*   `POST /register` (Signup utilizing specific access codes)
*   `GET /me` (Decodes bearer token and loads current session context)

### 4.2. Core Entities (`/api/groups`, `/api/sessions`, `/api/students`)
*   Full CRUD capabilities supported. All data mutations heavily rely on Authorization boundaries. Engineers manage their own sessions, Admins own global config.
*   **CRITICAL Pagination Envelope:** ALL list endpoints (`GET /api/groups`, `GET /api/sessions`) return a **paginated envelope object**, NOT a raw array. The response structure is: `{"items": [...], "totalCount": int, "page": int, "pageSize": int, "hasMore": bool}`. Always access the `items` key to get the list data.
*   **CRITICAL Pending Account Login:** When a newly registered engineer (status=Pending) attempts to login, the backend returns **400 Bad Request** (NOT 401). The response contains `{"error": "..."}` with a message about pending approval.
*   **Groups Payload Rules:** When invoking `POST /api/groups`, you MUST provide a strict struct: `{"Name": string, "Description": string, "Level": int (1-4), "Frequency": int (1-3), "NumberOfStudents": int, "StartingSessionNumber": int, "Schedules": array}`. 
    *   **CRITICAL CONSTRAINT:** The length of the `Schedules` array MUST EXACTLY match the number provided in `Frequency`. 
    *   **Schedule Object:** Each array element MUST explicitly contain: `{"DayOfWeek": int (0-6), "StartTime": string (e.g. "14:30:00"), "DurationMinutes": int}`.
    *   **Level Constraint:** Must be between 1 and 4.
    *   **CRITICAL NumberOfStudents Constraint:** `NumberOfStudents` MUST NOT exceed the curriculum maximum: Level 1-3 allows max **4** students, Level 4 allows max **2** students. Sending values above these limits will return a 400 error. Always use `NumberOfStudents: 4` for Levels 1-3 and `NumberOfStudents: 2` for Level 4.
*   **Sessions Payload Rules:** When invoking `POST /api/sessions`, payload MUST strictly be: `{"GroupId": string, "ScheduledAt": string (ISO 8601 UTC)}`. Groups automatically mandate session limits based on `Level` (Level 2 limits 12, Level 1 limits 13).
    *   **CRITICAL ScheduledAt Format:** The `ScheduledAt` value MUST be a clean UTC ISO string like `"2026-04-16T14:30:00Z"`. Do NOT use timezone offset format like `+00:00Z` — this will cause a 400 model binding error with an empty response body.
    *   **CRITICAL ScheduledAt Constraint:** To test session state transitions, `ScheduledAt` MUST be set to current UTC time (or within 30 minutes in the future). Sessions scheduled further ahead will trigger a `400` security restriction when calling the `/start` endpoint.
*   **CRITICAL Session Lifecycle:** Sessions are created in `Scheduled` state. To update attendance, the session MUST first be transitioned to `Started` state by calling `POST /api/sessions/{id}/start`. Attendance updates (`PUT /api/sessions/{id}/attendance`) will be **rejected** for sessions still in `Scheduled` state.
*   **CRITICAL Auto-Generated Sessions:** When a group is created, the backend auto-generates sessions based on the group's schedule. To test attendance, instead of creating a manual session, fetch the auto-generated Session 1 via `GET /api/sessions?groupId={id}` and find the item where `sessionNumber == 1`. This avoids sequential validation errors.
*   **Groups PUT Response:** The `PUT /api/groups/{id}` endpoint returns the updated group object with fields: `id`, `name`, `description`, `level`, `frequency`, `numberOfStudents`.

### 4.3. Admin & Configuration (`/api/engineers`, `/api/settings`)
*   Only accessible via `AdminOnly` claims to mint engineer codes, approve pending queues, and tweak platform SMTP data.

### 4.4. SignalR Hub (`/hub`)
*   Listens on `ws://localhost:5180/hub`
*   Accepts `access_token` query parameter mapping to the JWT auth handler.

## 5. Non-Functional & Testing Focus
*   **Access Control & Roles:** Validate that routes prefixed under Admin privileges strictly reject standard users.
*   **Graceful Degradation:** Check fault tolerances such as missing Redis/database dependencies gracefully skipping initialization vs catastrophic booting failure.
*   **Event Concurrency:** SignalR connections mimicking multi-client updates must cleanly isolate to their respective groups (e.g. `JoinSession` filtering).
