import { fetchWithAuth } from "./client";
import { User, Group, Student, Session, PendingEngineer, PaginatedResponse } from "../types";

// Auth Module
export const authApi = {
  login: (credentials: { identifier: string; password: string; studentId?: string; engineerCode?: string }) => 
    fetchWithAuth<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  register: (data: any) =>
    fetchWithAuth<{ message: string; id: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  registerStudentQueue: (data: { name: string; username: string; email: string; password: string; groupName: string }) =>
    fetchWithAuth<{ message: string; id: string }>("/auth/register-student-request", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getPendingStudentRequests: () => fetchWithAuth<any[]>("/auth/pending-student-requests"),
  approveStudentRequest: (id: string) =>
    fetchWithAuth<{ message: string; user: any }>(`/auth/approve-student-request/${id}`, { method: "POST" }),
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
};

// Groups Module
export const groupsApi = {
  getAll: (params?: any) => {
    const p = new URLSearchParams();
    if (params?.page) p.set("page", String(params.page));
    if (params?.pageSize) p.set("pageSize", String(params.pageSize));
    if (params?.search) p.set("search", params.search);
    if (params?.status) p.set("status", params.status);
    return fetchWithAuth<PaginatedResponse<Group>>(`/groups?${p.toString()}`);
  },
  getById: (id: string) => fetchWithAuth<Group>(`/groups/${id}`),
  create: (data: any) =>
    fetchWithAuth<Group>("/groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
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
