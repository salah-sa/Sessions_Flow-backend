# SessionFlow: System Architecture & Technical Specification

## 1. System Overview
SessionFlow is a premium, high-performance application designed for managing instructor sessions, student timetables, and live attendance. Originally conceived as a local-first desktop application, it features a highly modular **hybrid architecture** that runs identically as a standalone cloud SaaS or as an in-process desktop shell.

## 2. Backend Architecture
Built on **.NET 9 ASP.NET Core**, the backend is engineered for high concurrency and real-time data sync.
*   **Hosting Model**: Runs via Kestrel. In desktop mode, it is hosted **in-process** within the WPF shell (`App.xaml.cs`). In SaaS mode, it is containerized via Docker.
*   **API Paradigm**: Utilizes **Minimal APIs** (`ApiHost.cs`, `SubscriptionEndpoints.cs`, etc.) for lightweight, high-performance routing.
*   **Real-time Engine**: **SignalR** is the backbone of the application. WebSockets (`ws://localhost:5180/hub`) push state changes (e.g., `AttendanceUpdated`, `NewChatMessage`, `SessionStatusChanged`) to connected clients instantly.
*   **Background Services**: Runs asynchronous tasks like automated SMTP email reminders and session health checks.

## 3. Frontend Structure
The client is a **React 18 Single Page Application (SPA)** built with Vite, prioritizing a premium "esports-inspired" dark aesthetic.
*   **UI/UX**: Powered by **Tailwind CSS v4** and `shadcn/ui`. Fully responsive and supports heavy visual features (animations, gradients) which can be toggled off for performance (`adaptiveStore.ts`).
*   **Data Flow (Strict Architecture)**: 
    *   *Rule*: Components never fetch data directly. 
    *   *Path*: `Backend API → fetchWithAuth → TanStack Query Hooks → React Components`.
    *   *Caching*: Server state is cached via TanStack Query and persisted locally (`query-sync-storage-persister`).
*   **State Management**: **Zustand** handles transient UI state (e.g., adaptive settings, sidebar toggles).

## 4. Database Design
The persistence layer utilizes **MongoDB** (Atlas for Cloud, local for Desktop), completely abstracting away legacy relational constraints.
*   **Core Collections**: 
    *   `Users` (Admins and Engineers)
    *   `Groups` (Cohorts with specific schedules and Levels)
    *   `Students` (Linked to groups via IDs and `UniqueStudentCode`)
    *   `Sessions` (Discrete instances generated from Group schedules)
    *   `AttendanceRecords` (Embedded or linked records of student presence)
    *   `ChatMessages` (Time-series messaging data)
*   **Data Access**: Centralized through `MongoService.cs` using the official C# Driver, heavily utilizing asynchronous LINQ queries and index optimization.

## 5. Comprehensive Feature Set
*   **Session & Attendance Engine**: Granular lifecycle tracking (Scheduled → Started → Ended). Real-time attendance marking (Present, Absent, Late) that broadcasts instantly to all viewers.
*   **Live Team Chat**: Integrated messaging platform per group with real-time online/offline presence indicators.
*   **Algorithmic Scheduling**: Groups auto-generate sessions based on Level limits (e.g., Level 4 maxes at 2 students) and predefined weekly frequency.
*   **Visual Timetable**: Drag-and-drop weekly calendar with conflict resolution and availability management.
*   **SaaS Subscriptions**: Multi-tier architecture (Free, Pro, Ultra, Enterprise) strictly enforcing limits on groups, messages, and assets.
*   **Admin & Analytics Panel**: Deep insights into engineer performance, attendance trends, and pending account approvals.

## 6. Security Measures
*   **Authentication**: Stateless **JWT (JSON Web Tokens)** utilizing HS256 signatures with 7-day expiration.
*   **Authorization Boundary**: Strict Role-Based Access Control (RBAC). Admin endpoints strictly reject Engineer tokens.
*   **Registration Gate**: New engineers cannot freely join; they must possess an offline, pre-generated **Access Code** (e.g., `ENG1`), and even then, remain in a `Pending` state until an Admin explicitly approves them.
*   **Data Isolation**: API responses are tenant/user-scoped. Engineers only interact with their assigned groups and sessions.

## 7. How Everything Connects (The Data Flow)
1.  **User Action**: An engineer clicks "Mark Present" on the React UI.
2.  **API Call**: TanStack Query triggers a `PUT /api/sessions/{id}/attendance` request.
3.  **Backend Processing**: ASP.NET Core validates the JWT, ensures the session is 'Started', and mutates the document in MongoDB.
4.  **Event Broadcast**: The backend fires `Clients.Group(sessionId).SendAsync("AttendanceUpdated", ...)` via the SignalR Hub.
5.  **Client Sync**: The React SignalR provider catches the event and triggers `queryClient.invalidateQueries()`.
6.  **UI Update**: TanStack Query refetches the delta from the cache/server, updating the UI in under 50ms without a page reload.
