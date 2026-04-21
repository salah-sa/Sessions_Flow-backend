<div align="center">

# SessionFlow

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/3c/sessionflow)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-0078D6.svg)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-9.0-512BD4.svg)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)

**A premium Windows desktop application for managing instructor sessions, timetables, and attendance.**

*Built by 3C*

</div>

---

## Features

| Feature | Description |
|---------|-------------|
| **Session Management** | Create, schedule, start, and end teaching sessions with full lifecycle tracking |
| **Live Attendance** | Real-time attendance marking with Present/Absent/Late statuses, synced via SignalR |
| **Group Management** | Organize students into groups with color-coded tags and level-based auto-scheduling |
| **Timetable View** | Week-view calendar with drag-positioned session blocks and conflict detection |
| **Student Profiles** | Track per-student attendance rates, history, and group assignments |
| **Team Chat** | Real-time group chat with presence indicators and message history |
| **Engineer Management** | Access-code registration, admin approval workflow, and performance stats |
| **Email Reminders** | Automated SMTP reminders 10 minutes before sessions + daily summary emails |
| **System Tray** | Minimize to tray with native Windows toast notifications |
| **Dark/Light Theme** | Premium esports-inspired dark mode with light mode option |
| **CSV Export** | Export attendance history to CSV files |
| **Self-Contained** | Single .exe, no external dependencies at runtime |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | C# WPF (.NET 9, x64) |
| Web View | Microsoft WebView2 |
| Frontend | React 18, TypeScript (strict), Vite 5 |
| Styling | Tailwind CSS v4, shadcn/ui |
| State | Zustand, TanStack Query |
| Real-time | ASP.NET Core SignalR |
| API | ASP.NET Core Minimal API (in-process Kestrel) |
| Database | MongoDB (Atlas or local) |
| Cache/Events | Redis (EventBus, distributed cache) |
| Auth | JWT (HS256, 7-day expiry) |
| Email | MailKit (SMTP) |
| Icons | Lucide React |
| Animations | Framer Motion, GSAP |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              WPF Shell (MainWindow.xaml)              │
│         WindowStyle=None, Custom Title Bar            │
│  ┌────────────────────────────────────────────────┐  │
│  │          WebView2 Control (full area)          │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │     React 18 SPA (Vite build, TS)        │  │  │
│  │  │   TopBar + Sidebar + Page Content        │  │  │
│  │  └──────────────┬───────────────────────────┘  │  │
│  └─────────────────┼──────────────────────────────┘  │
│                    │ HTTP/WS localhost:5180           │
│  ┌─────────────────▼──────────────────────────────┐  │
│  │   In-Process ASP.NET Core (Kestrel :5180)      │  │
│  │   ├── /api/* Minimal API Endpoints             │  │
│  │   ├── /hub   SignalR WebSocket Hub             │  │
│  │   ├── JWT Authentication Middleware            │  │
│  │   └── Embedded File Provider (React dist)      │  │
│  └──────────────┬───────────────┬─────────────────┘  │
│                 │               │                     │
│  ┌──────────────▼────┐  ┌──────▼──────────────────┐  │
│  │  MongoDB (Atlas)  │  │  Redis (EventBus/Cache) │  │
│  └───────────────────┘  └─────────────────────────┘  │
│  System Tray Icon (Hardcodet.NotifyIcon.Wpf)         │
└──────────────────────────────────────────────────────┘
```

## Prerequisites

- **Windows 10/11** (x64)
- **Node.js 18+** (for building frontend)
- **.NET 9 SDK** (for building backend)
- **WebView2 Runtime** (pre-installed on Windows 10 21H2+ and Windows 11)

## Quick Start

```powershell
# Clone the repository
git clone https://github.com/3c/sessionflow.git
cd sessionflow

# Build the application
.\build.ps1

# Run the application
.\dist\SessionFlow\SessionFlow.Desktop.exe
```

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@sessionflow.local` | `Admin1234!` |

## Initial Engineer Access Codes

Use these codes to register as an engineer:

| Code |
|------|
| `ENG1` |
| `ENG2` |
| `ENG3` |

## SMTP Configuration

1. Open Settings page in the app
2. Navigate to the SMTP section
3. Configure your SMTP server:
   - **Host**: e.g., `smtp.gmail.com`
   - **Port**: e.g., `587`
   - **Username**: your email
   - **Password**: your app password
4. Toggle **Enable** to activate email reminders
5. Click **Test Email** to verify

## API Reference

All endpoints are served at `http://localhost:5173/api/`.

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/register` | Register with access code | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Groups
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/groups` | List all groups | Yes |
| POST | `/api/groups` | Create group | Yes |
| PUT | `/api/groups/{id}` | Update group | Yes |
| DELETE | `/api/groups/{id}` | Soft-delete group | Yes |
| GET | `/api/groups/{id}/students` | List students in group | Yes |
| POST | `/api/groups/{id}/students` | Add student to group | Yes |

### Sessions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/sessions` | List sessions (filter by group/status/date) | Yes |
| GET | `/api/sessions/{id}` | Session detail with attendance | Yes |
| POST | `/api/sessions` | Create session | Yes |
| POST | `/api/sessions/{id}/start` | Start session | Yes |
| POST | `/api/sessions/{id}/end` | End session | Yes |
| PUT | `/api/sessions/{id}/attendance` | Update attendance | Yes |
| DELETE | `/api/sessions/{id}` | Cancel session | Yes |

### Students
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/students` | List students (search/filter) | Yes |
| GET | `/api/students/{id}` | Student detail | Yes |
| PUT | `/api/students/{id}` | Update student | Yes |
| DELETE | `/api/students/{id}` | Soft-delete student | Yes |
| GET | `/api/students/{id}/attendance` | Attendance history | Yes |

### Timetable
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/timetable` | Weekly schedule | Yes |
| PUT | `/api/timetable` | Update schedule | Yes |
| GET | `/api/timetable/availability` | Availability entries | Yes |
| PUT | `/api/timetable/availability` | Update availability | Yes |

### Chat
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/chat/{groupId}/messages` | Last 100 messages | Yes |
| POST | `/api/chat/{groupId}/messages` | Send message | Yes |

### Engineers (Admin)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/engineers` | List engineers with stats | Admin |
| GET | `/api/engineers/{id}/stats` | Engineer stats | Admin |
| GET | `/api/pending` | Pending registrations | Admin |
| PUT | `/api/pending/{id}/approve` | Approve engineer | Admin |
| PUT | `/api/pending/{id}/deny` | Deny engineer | Admin |
| GET | `/api/engineer-codes` | List access codes | Admin |
| POST | `/api/engineer-codes` | Generate new code | Admin |
| DELETE | `/api/engineer-codes/{id}` | Revoke code | Admin |

### Settings
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/settings` | All settings | Yes |
| PUT | `/api/settings` | Update settings | Admin |
| POST | `/api/settings/test-email` | Send test email | Admin |

### System
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | No |
| POST | `/api/export/history` | Export CSV to file | Yes |

## SignalR Events

Hub URL: `ws://localhost:5173/hub?access_token={JWT}`

### Client → Server
| Method | Parameters | Description |
|--------|-----------|-------------|
| `JoinSession` | sessionId | Join session group |
| `LeaveSession` | sessionId | Leave session group |
| `JoinChat` | groupId | Join chat group |
| `LeaveChat` | groupId | Leave chat group |
| `SendChatMessage` | groupId, text | Send chat message |
| `UpdatePresence` | isOnline | Update online status |

### Server → Client
| Event | Parameters | Description |
|-------|-----------|-------------|
| `AttendanceUpdated` | sessionId, records[] | Attendance changed |
| `SessionStatusChanged` | sessionId, newStatus | Session status changed |
| `NewChatMessage` | groupId, message | New chat message |
| `PresenceChanged` | userId, isOnline | User online/offline |
| `SessionReminder` | sessionId, minutesUntilStart | Upcoming session alert |

## Database Schema

| Table | Key Fields |
|-------|-----------|
| Users | Id, Name, Email, PasswordHash, Role, IsApproved |
| Groups | Id, Name, Level, ColorTag, EngineerId, IsDeleted |
| GroupSchedules | Id, GroupId, DayOfWeek, StartTime, DurationMinutes |
| Students | Id, Name, GroupId, IsDeleted |
| Sessions | Id, GroupId, EngineerId, ScheduledAt, Status, IsDeleted |
| AttendanceRecords | Id, SessionId, StudentId, Status, MarkedAt |
| ChatMessages | Id, GroupId, SenderId, Text, SentAt |
| TimetableEntries | Id, EngineerId, DayOfWeek, IsAvailable, StartTime, EndTime |
| Settings | Id, Key, Value, UpdatedAt |
| EngineerCodes | Id, Code, IsUsed, UsedByEngineerId |
| PendingEngineers | Id, Name, Email, PasswordHash, Status |

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ by 3C</sub>
</div>
