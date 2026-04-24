import { fetchWithAuth, fetchPublic } from "./client";
import { User, Group, Student, Session, PendingEngineer, PaginatedResponse, LoginCredentials, AuthResponse, RegisterEngineerData, RegisterStudentRequestData, GroupCreateData, GroupUpdateData } from "../types";

// Auth Module
export const authApi = {
  login: (credentials: LoginCredentials) => 
    fetchPublic<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  register: (data: RegisterEngineerData) =>
    fetchPublic<{ message: string; id: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  registerStudentQueue: (data: RegisterStudentRequestData) =>
    fetchPublic<{ message: string; id: string }>("/auth/register-student-request", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getPendingStudentRequests: () => fetchWithAuth<PendingEngineer[]>("/auth/pending-student-requests"),
  discoverGroup: async (name: string) => {
    const headers = new Headers({ "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" });
    const BASE = (import.meta.env.VITE_API_URL ?? "") + "/api";
    const response = await fetch(`${BASE}/auth/discover-group?name=${encodeURIComponent(name)}`, { headers });
    const data = await response.json().catch(() => ({}));
    // 404 with suggestions is a valid "partial match" response, not an error
    if (response.ok || response.status === 404) {
      return data as { groupName?: string; engineerName?: string; level?: number; students?: { id: string; name: string; status: string }[]; suggestions?: string[]; error?: string };
    }
    throw new Error(data.error || `Request failed with status ${response.status}`);
  },
  approveStudentRequest: (id: string) =>
    fetchWithAuth<{ message: string; user: User }>(`/auth/approve-student-request/${id}`, { method: "POST" }),
  denyStudentRequest: (id: string) =>
    fetchWithAuth<{ message: string }>(`/auth/deny-student-request/${id}`, { method: "POST" }),
  getMe: () => fetchWithAuth<User>("/auth/me"),
  updateAvatar: (avatarUrl: string) =>
    fetchWithAuth<{ avatarUrl: string }>("/auth/profile/avatar", {
      method: "PUT",
      body: JSON.stringify({ avatarUrl }),
    }),
  updatePassword: (currentPassword: string, newPassword: string) =>
    fetchWithAuth<{ message: string }>("/auth/profile/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  forgotPassword: (email: string) =>
    fetchPublic<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyResetCode: (email: string, code: string) =>
    fetchPublic<{ tokenId: string }>("/auth/verify-reset-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  resetPassword: (tokenId: string, newPassword: string) =>
    fetchPublic<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ tokenId, newPassword }),
    }),
  resendCredentials: (email: string) =>
    fetchPublic<{ message: string; remaining: number }>("/auth/resend-credentials", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

// Groups Module
export const groupsApi = {
  getAll: (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
    const p = new URLSearchParams();
    if (params?.page) p.set("page", String(params.page));
    if (params?.pageSize) p.set("pageSize", String(params.pageSize));
    if (params?.search) p.set("search", params.search);
    if (params?.status) p.set("status", params.status);
    return fetchWithAuth<PaginatedResponse<Group>>(`/groups?${p.toString()}`);
  },
  getById: (id: string) => fetchWithAuth<Group>(`/groups/${id}`),
  checkName: (name: string) =>
    fetchWithAuth<{ available: boolean }>(`/groups/check-name?name=${encodeURIComponent(name)}`),
  create: (data: GroupCreateData) =>
    fetchWithAuth<Group>("/groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: GroupUpdateData) =>
    fetchWithAuth<Group>(`/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchWithAuth<void>(`/groups/${id}`, { method: "DELETE" }),
  deleteAll: () =>
    fetchWithAuth<{message: string}>(`/groups/all`, { method: "DELETE" }),
  addStudent: (groupId: string, name: string) =>
    fetchWithAuth<Student>(`/groups/${groupId}/students`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
};
