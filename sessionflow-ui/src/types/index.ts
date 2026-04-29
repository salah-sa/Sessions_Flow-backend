export type UserRole = "Admin" | "Engineer" | "Student";
export type SubscriptionTier = "Free" | "Pro" | "Ultra" | "Enterprise";
export type SubscriptionStatus = "None" | "Active" | "PastDue" | "Canceled" | "Unpaid";

export interface User {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  username?: string; // For student login
  role: UserRole;
  isApproved: boolean;
  studentId?: string; // Unique student identifier
  engineerCode?: string; // Code used during registration
  avatarUrl?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  createdAt: string;
  subscriptionTier?: SubscriptionTier;
  paymobCustomerId?: string;
  // User Governance
  restrictedUntil?: string;
  restrictionReason?: string;
  blockedPages?: string[];
  googleId?: string;
  facebookId?: string;
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
  students?: Student[];
  attendance?: AttendanceRecord[];
  canStart?: boolean;
  isEditable?: boolean;
  isSkipped?: boolean;
  skipReason?: string;
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

export interface ReadByEntry {
  userId: string;
  userName: string;
  userRole: string;
  subscriptionTier?: SubscriptionTier;
  readAt: string;
}

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
  readBy?: ReadByEntry[];
  _usage?: {
    remaining: number;
    limit: number;
    imagesRemaining?: number;
    videosRemaining?: number;
    filesRemaining?: number;
  };
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

export interface GroupScheduleEntry {
  id: string;
  groupId: string;
  groupName: string;
  groupColorTag: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  updatedAt?: string;
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
  username?: string;
  groupName?: string;
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
  link?: string;
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
  attendanceByLevel: { level: number; rate: number }[];
  operatorDistribution: { level: number; count: number }[];
  sessionsByStatus: SessionsByStatus[];
  topGroups: TopGroup[];

  // Timeline
  todayTimeline: Session[];
  recentActivity: AuditLog[];
  nextUpcomingSession: Session | null;
}

// ═══════════════════════════════════════════════
// API Request/Response Interfaces
// ═══════════════════════════════════════════════

export interface LoginCredentials {
  identifier: string;
  password: string;
  portal: "Admin" | "Student";
  studentId?: string;
  engineerCode?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterEngineerData {
  name: string;
  email: string;
  password: string;
}

export interface RegisterStudentRequestData {
  name: string;
  username: string;
  email: string;
  password: string;
  groupName: string;
  studentId: string;
}

export interface GroupCreateData {
  name: string;
  description?: string;
  level: number;
  colorTag: string;
  numberOfStudents: number;
  startingSessionNumber: number;
  totalSessions: number;
  frequency: number;
  schedules?: {
    dayOfWeek: number;
    startTime: string;
    durationMinutes: number;
  }[];
  cadets?: {
    name: string;
    studentId?: string;
  }[];
}

export interface GroupUpdateData extends Partial<GroupCreateData> {
  status?: GroupStatus;
  engineerId?: string;
}

export interface AttendanceUpdateRecord {
  studentId: string;
  status: AttendanceStatus;
}

export interface StudentDashboardData {
  identity: {
    name: string;
    level: number;
    groupName: string;
    studentId: string;
    avatarUrl?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  progress: {
    completed: number;
    total: number;
    remaining: number;
    percentage: number;
  };
  todaySession: Session | null;
  nextSession: Session | null;
  primaryAction: {
    label: string;
  };
  timeline: (Session & { status: string })[];
  error?: {
    message: string;
  };
}

export interface ImportPreview {
  success: boolean;
  groupsFound: number;
  groups: Array<{
    id: string;
    name: string;
    level: number;
    studentCount: number;
  }>;
}

export interface ImportResult extends ImportPreview {
  groupsImported: number;
  studentsImported: number;
}

// ═══════════════════════════════════════════════
// Wallet
// ═══════════════════════════════════════════════

export interface Wallet {
  id: string;
  phoneNumber: string;
  balanceEgp: number;
  dailyTransferLimitEgp: number;
  dailyTransferredEgp: number;
  isActive: boolean;
}

export interface WalletTransaction {
  referenceCode: string;
  type: string;
  direction: "Sent" | "Received";
  amountEgp: number;
  counterpartyPhone: string;
  note?: string;
  status: string;
  createdAt: string;
}

export interface CreateWalletRequest {
  phoneNumber: string;
  pin: string;
}

export interface TransferRequest {
  toPhone: string;
  amountEgp: number;
  pin: string;
  note?: string;
  idempotencyKey: string;
}

export interface AdminTopUpRequest {
  targetPhone: string;
  amountEgp: number;
  note?: string;
}