export type UserRole = "Admin" | "Engineer" | "Student";

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string; // For student login
  role: UserRole;
  isApproved: boolean;
  studentId?: string; // Unique student identifier
  engineerCode?: string; // Code used during registration
  avatarUrl?: string;
  createdAt: string;
}

export type GroupStatus = "Active" | "Completed" | "Archived";

export interface Group {
  id: string;
  name: string;
  description: string;
  level: number;
  colorTag: string;
  status: GroupStatus;
  completedAt?: string;
  engineerId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  engineer?: User;
  engineerName?: string;
  students?: Student[];
  sessions?: Session[];
  schedules?: GroupSchedule[];
  studentCount?: number;
  numberOfStudents: number;
  currentSessionNumber: number;
  startingSessionNumber: number;
  totalSessions: number;
  completedSessions?: number;
  nextSession?: string;
  frequency?: number;
}

export interface GroupSchedule {
  id: string;
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
}

export interface Student {
  id: string;
  name: string;
  groupId: string;
  studentId?: string;
  uniqueStudentCode?: string;
  userId?: string; // Links to User account
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  group?: Group;
}

export type SessionStatus = "Scheduled" | "Active" | "Ended" | "Cancelled";

export interface Session {
  id: string;
  groupId: string;
  groupName?: string;
  groupColorTag?: string;
  groupLevel?: number;
  engineerId: string;
  engineerName?: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  status: SessionStatus;
  notes?: string;
  isDeleted: boolean;
  updatedAt: string;
  group?: Group;
  engineer?: User;
  sessionNumber?: number;
  durationMinutes?: number;
  stampedRevenue?: number;
  presentCount?: number;
  absentCount?: number;
  totalStudents?: number;
  attendanceRate?: number;
  attendanceRecords?: AttendanceRecord[];
}

export type AttendanceStatus = "Unmarked" | "Absent" | "Present" | "Late";

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  markedAt: string;
  student?: Student;
}

export interface MessageMention {
  userId: string;
  name: string; // The display name at the time of sending (fallback)
  indices: [number, number]; // Legacy: [startOffset, endOffset] in the text string
  role: "Engineer" | "Student" | "Admin";
}

export type MessageBlock =
  | { type: "text"; content: string }
  | { type: "mention"; userId: string; name: string; role: string };

export interface ChatMessage {
  id: string; // UUID for deduplication
  groupId: string;
  senderId: string;
  senderName?: string;
  text: string;
  blocks?: MessageBlock[]; // Primary source for modern rendering
  mentions?: MessageMention[];
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  sentAt: string;
  sender?: User;
  status?: "pending" | "sent" | "delivered" | "read";
  isRead?: boolean;
}

export interface TimeSegment {
  startTime: string;
  endTime: string;
}

export interface TimetableEntry {
  id: string;
  engineerId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  segments?: TimeSegment[];
  startTime?: string;
  endTime?: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface EngineerCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedByEngineerId?: string;
  usedByEngineerName?: string;
  createdAt: string;
}

export interface PendingEngineer {
  id: string;
  name: string;
  email: string;
  requestedAt: string;
  status: "Pending" | "Approved" | "Denied";
}

export interface Station {
  id: string;
  name: string;
  location: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = "Info" | "Success" | "Warning" | "Error";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ═══════════════════════════════════════════════
// Dashboard Analytics Types
// ═══════════════════════════════════════════════

export interface MonthlyAttendance {
  present: number;
  absent: number;
  totalStudents: number;
  sessionCount: number;
  attendanceRate: number;
  revenue: number;
}

export interface RevenueByLevel {
  level: number;
  total: number;
  count: number;
}

export interface SessionsByStatus {
  status: string;
  count: number;
}

export interface TopGroup {
  id: string;
  name: string;
  level: number;
  colorTag: string;
  sessionsCompleted: number;
  totalSessions: number;
  attendanceRate: number;
  revenue: number;
  studentCount: number;
}

export interface DashboardSummary {
  // Core counts
  totalGroups: number;
  totalStudents: number;
  totalRevenue: number;
  activeSessions: number;
  todaySessions: number;
  upcomingSessions: number;
  completedSessionsAllTime: number;
  completedGroups: number;
  pendingApprovals: number;

  // Analytics
  attendanceRateOverall: number;
  avgSessionDuration: number;
  completionRate: number;

  // Monthly attendance balance
  monthlyAttendance: MonthlyAttendance;

  // Trend data (8 points each)
  weeklyTrend: number[];
  attendanceTrend: number[];
  studentGrowth: number[];

  // Breakdowns
  revenueByLevel: RevenueByLevel[];
  sessionsByStatus: SessionsByStatus[];
  topGroups: TopGroup[];

  // Timeline
  todayTimeline: any[];
  recentActivity: any[];
  nextUpcomingSession: any;
}