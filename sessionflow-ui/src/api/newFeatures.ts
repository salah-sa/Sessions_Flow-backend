import { fetchWithAuth } from "./client";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface ResourceUsage {
  used: number;
  limit: number;     // -1 = unlimited
  remaining: number; // -1 = unlimited
}

export interface UsageSummary {
  messages: ResourceUsage;
  images: ResourceUsage;
  videos: ResourceUsage;
  files: ResourceUsage;
  attendance: ResourceUsage;
  groups: ResourceUsage;
  tier: string;
  isAdmin: boolean;
}

export interface WalletEligibility {
  eligible: boolean;
  balanceEgp: number;
  requiredEgp: number;
  shortfallEgp: number;
  error?: string;
}

export interface WalletCheckoutResult {
  success: boolean;
  newBalanceEgp?: number;
  tier?: string;
  error?: string;
}

export interface AttendanceHistoryItem {
  id: string;
  sessionId: string;
  groupName: string;
  sessionNumber: number;
  status: "Present" | "Absent" | "Late" | "Unmarked";
  markedAt: string;
  scheduledAt?: string;
  studentId?: string;
  engineerId?: string;
}

export interface AttendanceHistoryPage {
  items: AttendanceHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AttendanceSummary {
  totalSessions: number;
  attended: number;
  present: number;
  lateCount: number;
  absent: number;
  attendanceRate: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Usage
// ─────────────────────────────────────────────────────────────────────────

export async function getTodayUsage(): Promise<UsageSummary> {
  return fetchWithAuth<UsageSummary>("/usage/today");
}

// ─────────────────────────────────────────────────────────────────────────
// Wallet Subscription
// ─────────────────────────────────────────────────────────────────────────

export async function checkWalletEligibility(
  tier: "Pro" | "Ultra" | "Enterprise",
  isAnnual: boolean
): Promise<WalletEligibility> {
  return fetchWithAuth<WalletEligibility>("/subscription/wallet-eligibility", {
    method: "POST",
    body: JSON.stringify({ tier, isAnnual }),
  });
}

export async function walletCheckout(
  tier: "Pro" | "Ultra" | "Enterprise",
  isAnnual: boolean
): Promise<WalletCheckoutResult> {
  return fetchWithAuth<WalletCheckoutResult>("/subscription/wallet-checkout", {
    method: "POST",
    body: JSON.stringify({ tier, isAnnual }),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Attendance History
// ─────────────────────────────────────────────────────────────────────────

export async function getAttendanceHistory(
  page = 1,
  pageSize = 20,
  status?: string
): Promise<AttendanceHistoryPage> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (status) params.set("status", status);
  return fetchWithAuth<AttendanceHistoryPage>(`/attendance/history?${params}`);
}

export async function getAttendanceSummary(): Promise<AttendanceSummary> {
  return fetchWithAuth<AttendanceSummary>("/attendance/summary");
}

// ─────────────────────────────────────────────────────────────────────────
// Admin Broadcast
// ─────────────────────────────────────────────────────────────────────────

export interface BroadcastResult {
  broadcastId: string;
  recipientCount: number;
  channel: string;
}

export async function sendBroadcast(
  subject: string,
  message: string,
  channel: "InApp" | "Email" | "Both"
): Promise<BroadcastResult> {
  return fetchWithAuth<BroadcastResult>("/admin/broadcast/", {
    method: "POST",
    body: JSON.stringify({ subject, message, channel }),
  });
}

export async function getBroadcastHistory(page = 1, pageSize = 20) {
  return fetchWithAuth<{ items: any[]; totalCount: number; totalPages: number }>(
    `/admin/broadcast/history?page=${page}&pageSize=${pageSize}`
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AI Center
// ─────────────────────────────────────────────────────────────────────────

export interface AIPreset {
  id: string;
  title: string;
  prompt: string;
  icon: string;
  category: "System" | "Custom";
  createdAt: string;
}

export interface AIUsage {
  used: number;
  limit: number;
  tier: string;
}

export const aiApi = {
  getPresets: () => fetchWithAuth<AIPreset[]>("/ai/presets"),
  savePreset: (data: { title: string; prompt: string; icon: string; category: string }) =>
    fetchWithAuth<AIPreset>("/ai/presets", { method: "POST", body: JSON.stringify(data) }),
  deletePreset: (id: string) => fetchWithAuth<void>(`/ai/presets/${id}`, { method: "DELETE" }),
  getLogs: (page = 1) => fetchWithAuth<unknown[]>(`/ai/logs?page=${page}`),
  getUsage: () => fetchWithAuth<AIUsage>("/ai/usage"),
};

// ─────────────────────────────────────────────────────────────────────────
// Analytics (Admin)
// ─────────────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsersToday: number;
  newUsersThisMonth: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  attendanceRateThisWeek: number;
}

export interface DauPoint { date: string; count: number }
export interface FeaturePoint { route: string; visits: number }
export interface SessionData { totalThisWeek: number; peakHours: { hour: number; count: number }[] }
export interface RolePoint { role: string; count: number }

export const analyticsApi = {
  overview: () => fetchWithAuth<AnalyticsOverview>("/analytics/admin/overview"),
  dau: (days = 30) => fetchWithAuth<DauPoint[]>(`/analytics/admin/dau?days=${days}`),
  featureUsage: (days = 30) => fetchWithAuth<FeaturePoint[]>(`/analytics/admin/feature-usage?days=${days}`),
  sessions: () => fetchWithAuth<SessionData>("/analytics/admin/sessions"),
  roles: () => fetchWithAuth<RolePoint[]>("/analytics/admin/roles"),
};

// ─────────────────────────────────────────────────────────────────────────
// Feature Flags (Admin)
// ─────────────────────────────────────────────────────────────────────────

export interface FlagRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  allowedTiers: string[];
  overrideUserIds: string[];
  updatedBy: string;
  updatedAt: string;
}

export const flagsApi = {
  getAll: () => fetchWithAuth<FlagRecord[]>("/admin/flags"),
  create: (data: Partial<FlagRecord>) =>
    fetchWithAuth<FlagRecord>("/admin/flags", { method: "POST", body: JSON.stringify(data) }),
  update: (key: string, data: Partial<FlagRecord>) =>
    fetchWithAuth<{ message: string }>(`/admin/flags/${key}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (key: string) =>
    fetchWithAuth<{ message: string }>(`/admin/flags/${key}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────────────
// AI Streaming (SSE) — helper for pages that need streaming (not via useQuery)
// ─────────────────────────────────────────────────────────────────────────

import { useAuthStore } from "../store/stores";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "") + "/api";

export async function streamAIChat(
  sessionId: string,
  message: string,
  history: { role: string; content: string }[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const { token } = useAuthStore.getState();
  const resp = await fetch(`${BASE_URL}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ sessionId, message, history }),
  });
  if (!resp.ok || !resp.body) throw new Error(`AI request failed: ${resp.status}`);
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        onChunk(data.replace(/\\n/g, "\n"));
      }
    }
  }
}
