/**
 * Phase 4: Premium Features (#21–#30) — API Layer
 * All data access centralized here. Components use TanStack Query hooks.
 */
import { fetchWithAuth } from "./client";

// ─────────────────────────────────────────────────────────────────────────
// #21 AI Study Path Generator
// ─────────────────────────────────────────────────────────────────────────

export interface StudyPathMilestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: "completed" | "current" | "upcoming";
  aiNotes: string;
  progress: number; // 0–100
}

export interface StudyPath {
  milestones: StudyPathMilestone[];
  generatedAt: string;
}

export const studyPathApi = {
  get: (studentId: string) =>
    fetchWithAuth<StudyPath>(`/ai/study-path/${studentId}`),
  generate: (studentId: string) =>
    fetchWithAuth<StudyPath>(`/ai/study-path/${studentId}`, { method: "POST" }),
};

// ─────────────────────────────────────────────────────────────────────────
// #22 Deep Analytics Engine
// ─────────────────────────────────────────────────────────────────────────

export interface CohortCell { enrollmentMonth: string; activityMonth: string; rate: number; count: number }
export interface RetentionStage { stage: string; count: number; percentage: number }
export interface ForecastPoint { date: string; value: number; projected: boolean }
export interface CustomDataPoint { label: string; value: number }

export const deepAnalyticsApi = {
  cohort: (months = 6) =>
    fetchWithAuth<CohortCell[]>(`/analytics/deep/cohort?months=${months}`),
  retention: (range = "90d") =>
    fetchWithAuth<RetentionStage[]>(`/analytics/deep/retention?range=${range}`),
  forecast: (metric: string, range = "30d") =>
    fetchWithAuth<ForecastPoint[]>(`/analytics/deep/forecast?metric=${metric}&range=${range}`),
  custom: (params: { metric: string; groupId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return fetchWithAuth<CustomDataPoint[]>(`/analytics/deep/custom?${qs}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────
// #23 Smart Note Transcription
// ─────────────────────────────────────────────────────────────────────────

export const transcriptionApi = {
  upload: (sessionId: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    return fetchWithAuth<{ text: string }>(`/sessions/${sessionId}/transcribe`, {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for multipart
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────
// #24 Attendance Streak Rewards
// ─────────────────────────────────────────────────────────────────────────

export interface StreakBadge { type: string; achievedAt: string }
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  badges: StreakBadge[];
  nextMilestone: number;
}
export interface LeaderboardEntry {
  studentId: string;
  name: string;
  avatarUrl: string;
  streak: number;
  rank: number;
}

export const streaksApi = {
  get: (studentId: string) =>
    fetchWithAuth<StreakData>(`/streaks/${studentId}`),
  leaderboard: (groupId: string) =>
    fetchWithAuth<{ students: LeaderboardEntry[] }>(`/streaks/leaderboard/${groupId}`),
};

// ─────────────────────────────────────────────────────────────────────────
// #25 Session Recording & Playback
// ─────────────────────────────────────────────────────────────────────────

export interface SessionRecording {
  id: string;
  duration: number;
  createdAt: string;
  mediaUrl: string;
}

export const recordingApi = {
  start: (sessionId: string) =>
    fetchWithAuth<void>(`/sessions/${sessionId}/recording/start`, { method: "POST" }),
  upload: (sessionId: string, audioBlob: Blob) => {
    const fd = new FormData();
    fd.append("audio", audioBlob, "session-recording.webm");
    return fetchWithAuth<void>(`/sessions/${sessionId}/recording/upload`, {
      method: "POST",
      body: fd,
      headers: {},
    });
  },
  stop: (sessionId: string) =>
    fetchWithAuth<void>(`/sessions/${sessionId}/recording/stop`, { method: "POST" }),
  list: (sessionId: string) =>
    fetchWithAuth<{ recordings: SessionRecording[] }>(`/sessions/${sessionId}/recordings`),
};

// ─────────────────────────────────────────────────────────────────────────
// #26 Intelligent Schedule Optimizer
// ─────────────────────────────────────────────────────────────────────────

export interface ScheduleSuggestion {
  id: string;
  scheduleId: string;
  currentSlot: { dayOfWeek: number; startTime: string; duration: number };
  suggestedSlot: { dayOfWeek: number; startTime: string; duration: number };
  confidence: "high" | "medium" | "low";
  reason: string;
}

export const scheduleOptimizerApi = {
  getSuggestions: (engineerId: string) =>
    fetchWithAuth<{ suggestions: ScheduleSuggestion[] }>("/ai/optimize-schedule", {
      method: "POST",
      body: JSON.stringify({ engineerId }),
    }),
  apply: (suggestionIds: string[]) =>
    fetchWithAuth<void>("/ai/apply-optimization", {
      method: "POST",
      body: JSON.stringify({ suggestionIds }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────
// #27 Custom Report Builder
// ─────────────────────────────────────────────────────────────────────────

export interface ReportBlock {
  source: "attendance" | "revenue" | "students" | "sessions";
  metric: string;
  filter?: Record<string, string>;
  chartType: "bar" | "line" | "donut" | "table";
  groupBy?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  schema: { blocks: ReportBlock[] };
  createdAt: string;
}

export interface ReportData {
  blockResults: { blockIndex: number; data: Record<string, unknown>[] }[];
}

export const reportsApi = {
  generate: (schema: { blocks: ReportBlock[] }) =>
    fetchWithAuth<ReportData>("/reports/generate", {
      method: "POST",
      body: JSON.stringify({ schema }),
    }),
  getTemplates: () =>
    fetchWithAuth<ReportTemplate[]>("/reports/templates"),
  saveTemplate: (name: string, schema: { blocks: ReportBlock[] }) =>
    fetchWithAuth<ReportTemplate>("/reports/templates", {
      method: "POST",
      body: JSON.stringify({ name, schema }),
    }),
  deleteTemplate: (id: string) =>
    fetchWithAuth<void>(`/reports/templates/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────────────
// #28 Multi-Group Student Transfer
// ─────────────────────────────────────────────────────────────────────────

export interface TransferCheck {
  compatible: boolean;
  conflicts: string[];
  warnings: string[];
}

export const transferApi = {
  check: (studentId: string, targetGroupId: string) =>
    fetchWithAuth<TransferCheck>(`/students/${studentId}/transfer-check/${targetGroupId}`),
  execute: (studentId: string, targetGroupId: string) =>
    fetchWithAuth<void>(`/students/${studentId}/transfer`, {
      method: "POST",
      body: JSON.stringify({ targetGroupId }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────
// #29 Focus Timer with Pomodoro
// ─────────────────────────────────────────────────────────────────────────

export interface FocusStats {
  totalMinutes: number;
  sessions: number;
  dailyBreakdown: { date: string; minutes: number }[];
}

export const focusApi = {
  start: (durationMinutes: number) =>
    fetchWithAuth<void>("/focus/start", {
      method: "POST",
      body: JSON.stringify({ durationMinutes }),
    }),
  complete: (focusMinutes: number, breakMinutes: number) =>
    fetchWithAuth<void>("/focus/complete", {
      method: "POST",
      body: JSON.stringify({ focusMinutes, breakMinutes }),
    }),
  stats: (studentId: string, range = "7d") =>
    fetchWithAuth<FocusStats>(`/focus/stats/${studentId}?range=${range}`),
  groupStats: (groupId: string) =>
    fetchWithAuth<FocusStats>(`/focus/group-stats/${groupId}`),
};

// ─────────────────────────────────────────────────────────────────────────
// #30 Encrypted Private Notes
// ─────────────────────────────────────────────────────────────────────────

export interface EncryptedNote {
  encryptedBlob: string;
  iv: string;
  updatedAt: string;
}

export interface NoteRef {
  entityType: string;
  entityId: string;
  updatedAt: string;
}

export const encryptedNotesApi = {
  get: (entityType: string, entityId: string) =>
    fetchWithAuth<EncryptedNote>(`/notes/${entityType}/${entityId}`),
  save: (entityType: string, entityId: string, data: { encryptedBlob: string; iv: string }) =>
    fetchWithAuth<void>(`/notes/${entityType}/${entityId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  list: () =>
    fetchWithAuth<NoteRef[]>("/notes/all"),
};
