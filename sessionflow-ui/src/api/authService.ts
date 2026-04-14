/**
 * Centralized Auth Service
 * 
 * All authentication operations go through this module.
 * It wraps the raw API calls with state management and error handling.
 */

import { authApi } from "./resources";
import { useAuthStore } from "../store/stores";
import { User } from "../types";

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

/**
 * Login — Calls backend, stores token + user, returns result.
 */
export async function loginUser(
  identifier: string,
  password: string,
  rememberMe: boolean,
  studentId?: string,
  engineerCode?: string
): Promise<AuthResult> {
  try {
    const credentials: any = { identifier, password };
    if (studentId) credentials.studentId = studentId;
    if (engineerCode) credentials.engineerCode = engineerCode;

    const response = await authApi.login(credentials);

    // Store auth state
    const store = useAuthStore.getState();
    store.setAuth(response.user, response.token);
    store.setRememberMe(rememberMe);

    // If not remembering, clear on browser close
    if (!rememberMe) {
      window.addEventListener("beforeunload", handleSessionCleanup, { once: true });
    }

    return { success: true, user: response.user };
  } catch (err: any) {
    return { success: false, error: err.message || "Login failed" };
  }
}

/**
 * Register Engineer — Creates pending engineer request.
 */
export async function registerEngineer(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    await authApi.register({ name, email, password });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Registration failed" };
  }
}

/**
 * Register Student — Creates a pending student request for the engineer to approve.
 */
export async function registerStudentQueue(
  name: string,
  username: string,
  email: string,
  password: string,
  groupName: string
): Promise<AuthResult> {
  try {
    await authApi.registerStudentQueue({ name, username, email, password, groupName });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Registration failed" };
  }
}

export async function getPendingStudentRequests(): Promise<any[]> {
  try {
    return await authApi.getPendingStudentRequests();
  } catch (err: any) {
    console.error("Failed to fetch pending requests", err);
    return [];
  }
}

export async function approveStudentRequest(id: string): Promise<AuthResult> {
  try {
    const res = await authApi.approveStudentRequest(id);
    return { success: true, user: res.user };
  } catch (err: any) {
    return { success: false, error: err.message || "Approval failed" };
  }
}

export async function denyStudentRequest(id: string): Promise<AuthResult> {
  try {
    await authApi.denyStudentRequest(id);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Deny failed" };
  }
}

/**
 * Validate Session — Checks stored token against backend.
 * Returns true if session is valid, false otherwise.
 */
export async function validateSession(): Promise<boolean> {
  const { token, logout, updateUser } = useAuthStore.getState();
  if (!token) return false;

  try {
    const user = await authApi.getMe();
    updateUser(user);
    return true;
  } catch {
    logout();
    return false;
  }
}

/**
 * Logout — Clears all auth state.
 */
export function logoutUser(): void {
  useAuthStore.getState().logout();
}

/**
 * Session cleanup handler — clears persistent auth when rememberMe is false.
 */
function handleSessionCleanup(): void {
  const { rememberMe } = useAuthStore.getState();
  if (!rememberMe) {
    localStorage.removeItem("sf_token");
    localStorage.removeItem("sf-auth-storage");
  }
}
