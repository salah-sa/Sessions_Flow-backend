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

### 4.3. Admin & Configuration (`/api/engineers`, `/api/settings`)
*   Only accessible via `AdminOnly` claims to mint engineer codes, approve pending queues, and tweak platform SMTP data.

### 4.4. SignalR Hub (`/hub`)
*   Listens on `ws://localhost:5180/hub`
*   Accepts `access_token` query parameter mapping to the JWT auth handler.

## 5. Non-Functional & Testing Focus
*   **Access Control & Roles:** Validate that routes prefixed under Admin privileges strictly reject standard users.
*   **Graceful Degradation:** Check fault tolerances such as missing Redis/database dependencies gracefully skipping initialization vs catastrophic booting failure.
*   **Event Concurrency:** SignalR connections mimicking multi-client updates must cleanly isolate to their respective groups (e.g. `JoinSession` filtering).
