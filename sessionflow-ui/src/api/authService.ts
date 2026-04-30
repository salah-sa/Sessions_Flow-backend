/**
 * Centralized Auth Service
 * 
 * All authentication operations go through this module.
 * It wraps the raw API calls with state management and error handling.
 */

import { authApi } from "./resources";
import { useAuthStore } from "../store/stores";
import { clearSessionCaches } from "../lib/sessionCleanup";
import { User, LoginCredentials, PendingEngineer } from "../types";

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
  portal: "Admin" | "Student",
  studentId?: string,
  engineerCode?: string
): Promise<AuthResult> {
  try {
    // CRITICAL: Purge all caches from the previous session BEFORE authenticating.
    // This prevents stale TanStack Query data (groups, dashboard, students) from
    // a previous account from persisting across an account switch, which was
    // causing "Failed to create group" ghost errors.
    clearSessionCaches();

    const credentials: LoginCredentials = { identifier, password, portal };
    if (studentId) credentials.studentId = studentId;
    if (engineerCode) credentials.engineerCode = engineerCode;

    const response = await authApi.login(credentials);

    // Store auth state
    const store = useAuthStore.getState();
    store.setAuth(response.user, response.token);
    store.setRememberMe(rememberMe);

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
  groupName: string,
  studentId: string
): Promise<AuthResult> {
  try {
    await authApi.registerStudentQueue({ name, username, email, password, groupName, studentId });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Registration failed" };
  }
}

export async function getPendingStudentRequests(): Promise<PendingEngineer[]> {
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
  const { token, updateUser } = useAuthStore.getState();
  if (!token) return false;

  try {
    const user = await authApi.getMe();
    updateUser(user);
    return true;
  } catch (error: any) {
    // client.ts fetchWithAuth automatically handles 401 by logging out.
    // We shouldn't blindly logout here on transient network failures (like server starting).
    console.warn("[Session Validation] Network or transient error, keeping session alive.", error);
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
 * Forgot Password — Phase 1: Request Code
 */
export async function forgotPassword(email: string): Promise<AuthResult> {
  try {
    await authApi.forgotPassword(email);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send reset code" };
  }
}

/**
 * Forgot Password — Phase 2: Verify Code
 */
export async function verifyResetCode(email: string, code: string): Promise<{ success: boolean; tokenId?: string; error?: string }> {
  try {
    const res = await authApi.verifyResetCode(email, code);
    return { success: true, tokenId: res.tokenId };
  } catch (err: any) {
    return { success: false, error: err.message || "Invalid code" };
  }
}

/**
 * Forgot Password — Phase 3: Update Password
 */
export async function resetPassword(tokenId: string, newPassword: string): Promise<AuthResult> {
  try {
    await authApi.resetPassword(tokenId, newPassword);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reset password" };
  }
}

/**
 * Resend Credentials — Request a resend of sign-in details (Student ID / Engineer Code)
 */
export async function resendCredentials(email: string): Promise<{ success: boolean; message?: string; remaining?: number; error?: string }> {
  try {
    const res = await authApi.resendCredentials(email);
    return { success: true, message: res.message, remaining: res.remaining };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to resend credentials" };
  }
}

/**
 * Resend Welcome Email — Manually trigger the activation email for a specific user (Admin only)
 */
export async function resendWelcomeEmail(userId: string): Promise<AuthResult> {
  try {
    await authApi.resendWelcome(userId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to resend welcome email" };
  }
}
