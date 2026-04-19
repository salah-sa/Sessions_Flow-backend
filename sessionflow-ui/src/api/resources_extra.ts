import { fetchWithAuth } from "./client";
import { Session, Student, User, AttendanceRecord, ChatMessage, MessageMention, TimetableEntry, GroupScheduleEntry, Setting, EngineerCode, PendingEngineer, Station, Notification, AuditLog, PaginatedResponse, DashboardSummary, AttendanceUpdateRecord, MessageBlock, ImportPreview, ImportResult, StudentDashboardData } from "../types";

// Dashboard Module
export const dashboardApi = {
  getSummary: () => fetchWithAuth<DashboardSummary>("/dashboard/summary")
};

// Sessions Module
export const sessionsApi = {
  getAll: (params?: { page?: number; pageSize?: number; groupId?: string; status?: string; date?: string; startDate?: string; endDate?: string }) => {
    const p = new URLSearchParams();
    if (params?.page) p.set("page", String(params.page));
    if (params?.pageSize) p.set("pageSize", String(params.pageSize));
    if (params?.groupId) p.set("groupId", params.groupId);
    if (params?.status) p.set("status", params.status);
    if (params?.date) p.set("date", params.date);
    if (params?.startDate) p.set("startDate", params.startDate);
    if (params?.endDate) p.set("endDate", params.endDate);
    return fetchWithAuth<PaginatedResponse<Session>>(`/sessions?${p.toString()}`);
  },
  getById: (id: string) => fetchWithAuth<Session>(`/sessions/${id}`),
  create: (data: { groupId: string; scheduledAt: string }) =>
    fetchWithAuth<Session>("/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  start: (id: string) => fetchWithAuth<Session>(`/sessions/${id}/start`, { method: "POST" }),
  end: (id: string, notes?: string) =>
    fetchWithAuth<Session>(`/sessions/${id}/end`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
  updateAttendance: (sessionId: string, records: AttendanceUpdateRecord[]) =>
    fetchWithAuth<void>(`/sessions/${sessionId}/attendance`, {
      method: "PUT",
      body: JSON.stringify(records),
    }),
  getAttendance: (id: string) => fetchWithAuth<AttendanceRecord[]>(`/sessions/${id}/attendance`),
};

// Students Module
export const studentsApi = {
  getAll: (params?: { page?: number; pageSize?: number; search?: string; groupId?: string }) => {
    const p = new URLSearchParams();
    if (params?.page) p.set("page", String(params.page));
    if (params?.pageSize) p.set("pageSize", String(params.pageSize));
    if (params?.search) p.set("search", params.search);
    if (params?.groupId) p.set("groupId", params.groupId);
    return fetchWithAuth<PaginatedResponse<Student>>(`/students?${p.toString()}`);
  },
  getById: (id: string) => fetchWithAuth<Student>(`/students/${id}`),
  update: (id: string, name: string) =>
    fetchWithAuth<Student>(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  delete: (id: string) =>
    fetchWithAuth<void>(`/students/${id}`, { method: "DELETE" }),
  getAttendance: (id: string) => fetchWithAuth<AttendanceRecord[]>(`/students/${id}/attendance`),
};

// Timetable Module
export const timetableApi = {
  getEntries: () => fetchWithAuth<{ sessions: Session[]; groupSchedules: GroupScheduleEntry[]; availability: TimetableEntry[]; weekStart: string; weekEnd: string }>("/timetable"),
  getAvailability: () => fetchWithAuth<TimetableEntry[]>("/timetable/availability"),
  updateAvailability: (entries: TimetableEntry[]) =>
    fetchWithAuth<void>("/timetable/availability", {
      method: "PUT",
      body: JSON.stringify(entries),
    }),
  getFreeSlots: (engineerId: string, date: string, duration: number) =>
    fetchWithAuth<string[]>(`/timetable/free-slots?engineerId=${engineerId}&date=${date}&duration=${duration}`),
  autoFill: () => fetchWithAuth<void>("/timetable/auto-fill", { method: "POST" }),
};

// Chat Module
export const chatApi = {
  getMessages: (groupId: string, before?: string, limit?: number) => {
    const p = new URLSearchParams();
    if (before) p.set("before", before);
    if (limit) p.set("limit", String(limit));
    const query = p.toString();
    return fetchWithAuth<ChatMessage[]>(`/chat/${groupId}/messages${query ? `?${query}` : ""}`);
  },
  sendMessage: (groupId: string, text: string, blocks?: MessageBlock[], mentions?: MessageMention[], id?: string) =>
    fetchWithAuth<ChatMessage>(`/chat/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify({ id, text, blocks, mentions }),
    }),
  sendMessageWithFile: (groupId: string, text: string, file: File, blocks?: MessageBlock[], mentions?: MessageMention[], id?: string) => {
    const formData = new FormData();
    if (id) formData.append("id", id);
    formData.append("text", text);
    if (blocks) formData.append("blocks", JSON.stringify(blocks));
    if (mentions) formData.append("mentions", JSON.stringify(mentions));
    formData.append("file", file);
    return fetchWithAuth<ChatMessage>(`/chat/${groupId}/messages`, {
      method: "POST",
      body: formData,
    });
  }
};

// Engineers Module
export const engineersApi = {
  getAll: () => fetchWithAuth<User[]>("/engineers"),
  getPending: () => fetchWithAuth<PendingEngineer[]>("/pending"),
  approve: (id: string) => fetchWithAuth<void>(`/pending/${id}/approve`, { method: "PUT" }),
  deny: (id: string) => fetchWithAuth<void>(`/pending/${id}/deny`, { method: "PUT" }),
  getCodes: () => fetchWithAuth<EngineerCode[]>("/engineer-codes"),
  generateCode: () => fetchWithAuth<EngineerCode>("/engineer-codes", { method: "POST" }),
  revokeCode: (id: string) => fetchWithAuth<void>(`/engineer-codes/${id}`, { method: "DELETE" }),
};

// Stations Module
export const stationsApi = {
  getAll: () => fetchWithAuth<Station[]>("/stations"),
  getById: (id: string) => fetchWithAuth<Station>(`/stations/${id}`),
  create: (data: { name: string; location: string; capacity: number }) =>
    fetchWithAuth<Station>("/stations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Station>) =>
    fetchWithAuth<Station>(`/stations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => fetchWithAuth<void>(`/stations/${id}`, { method: "DELETE" }),
};

// Settings Module
export const settingsApi = {
  getAll: () => fetchWithAuth<Setting[]>("/settings"),
  update: (settings: Setting[]) =>
    fetchWithAuth<void>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  testEmail: (email: string) =>
    fetchWithAuth<void>("/settings/test-email", {
      method: "POST",
      body: JSON.stringify({ to: email }),
    }),
};

// Notifications Module
export const notificationsApi = {
  getRecent: () => fetchWithAuth<{ notifications: Notification[]; unreadCount: number }>("/notifications"),
  markAsRead: (id: string) => fetchWithAuth<void>(`/notifications/${id}/read`, { method: "PUT" }),
  markAllAsRead: () => fetchWithAuth<void>("/notifications/read-all", { method: "PUT" }),
};

// Audit Module (Admin Only)
export const auditApi = {
  getLogs: () => fetchWithAuth<AuditLog[]>("/admin/audit-logs"),
};

// 3C School Import Module
export const importApi = {
  testConnection: (email: string, password: string) =>
    fetchWithAuth<{ success: boolean; message: string }>("/import/3cschool/test", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  preview: (email: string, password: string) =>
    fetchWithAuth<ImportPreview>("/import/3cschool/preview", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  execute: (email: string, password: string) =>
    fetchWithAuth<ImportResult>("/import/3cschool/execute", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// Gmail API Module
export const gmailApi = {
  getStatus: () => fetchWithAuth<{ connected: boolean; authorizedEmail: string | null }>("/admin/gmail/status"),
  authorize: () => fetchWithAuth<{ message: string }>("/admin/gmail/authorize", { method: "POST" }),
};

// Reporting Module
export const reportsApi = {
  downloadSessionReport: (sessionId: string) => fetchWithAuth<Blob>(`/reports/session/${sessionId}`, { method: "GET" }, true)
};

// Student Dashboard Module
export const studentApi = {
  getDashboard: () => fetchWithAuth<StudentDashboardData>("/student/dashboard")
};

// Student Location Module
export const studentLocationApi = {
  getAll: () => fetchWithAuth<{ id: string; name: string; lat: number; lng: number; city: string; level: number; role: string; avatarUrl?: string; isOnline: boolean }[]>("/students/locations"),
  update: (data: { lat: number; lng: number; city: string }) =>
    fetchWithAuth<void>("/student/location", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

