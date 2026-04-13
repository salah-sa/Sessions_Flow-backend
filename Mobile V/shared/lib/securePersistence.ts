import * as SecureStore from "expo-secure-store";
import { StateStorage } from "zustand/middleware";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Secure Persistence Bridge
 * Phase 14.A: Advanced Security Hardening
 * ═══════════════════════════════════════════════════════════
 */

export const securePersistence: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await SecureStore.getItemAsync(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};
