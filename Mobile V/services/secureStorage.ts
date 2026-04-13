/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Secure Storage Service
 * Phase 13: Hardware-Encrypted Credential Management
 * ═══════════════════════════════════════════════════════════
 */

import * as SecureStore from "expo-secure-store";
import { User } from "../shared/types";

const TOKEN_KEY = "sf_auth_token";
const REFRESH_TOKEN_KEY = "sf_refresh_token";
const USER_KEY = "sf_user_data";

export const secureStorage = {
  /**
   * Save JWT access token
   */
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  /**
   * Retrieve JWT access token
   */
  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  /**
   * Save JWT refresh token
   */
  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  /**
   * Retrieve JWT refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  /**
   * Save User profile data (stringified JSON)
   */
  async setUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  /**
   * Retrieve User profile data
   */
  async getUser(): Promise<User | null> {
    const data = await SecureStore.getItemAsync(USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as User;
    } catch {
      return null;
    }
  },

  /**
   * Clear all security-sensitive data
   */
  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};
