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
  message: string,
  channel: "InApp" | "Email" | "Both"
): Promise<BroadcastResult> {
  return fetchWithAuth<BroadcastResult>("/admin/broadcast/", {
    method: "POST",
    body: JSON.stringify({ message, channel }),
  });
}

export async function getBroadcastHistory(page = 1, pageSize = 20) {
  return fetchWithAuth<{ items: any[]; totalCount: number; totalPages: number }>(
    `/admin/broadcast/history?page=${page}&pageSize=${pageSize}`
  );
}
