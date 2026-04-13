/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — API Configuration
 * Phase 7.A: Resolution and Environment Setup
 * ═══════════════════════════════════════════════════════════
 */

import { Platform } from "react-native";

// In production, this would be an environment variable.
// For Android emulators, use 10.0.2.2. For physical devices, use your computer's LAN IP.
export const BASE_LAN_IP = Platform.OS === 'android' ? "10.0.2.2" : "192.168.1.103"; 
export const BASE_PORT = "5180";

export const API_BASE_URL = "https://sessionsflow-backend-production.up.railway.app/api";

export const SIGNALR_URL = "https://sessionsflow-backend-production.up.railway.app/hub";

/**
 * Resolves media URLs from the backend.
 * Handles both absolute URLs and relative paths from the server.
 */
export const resolveMediaUrl = (path: string | null | undefined): string | null => {
  if (!path || path.trim() === "") return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  
  // Strip leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  
  // Extract base host from API_BASE_URL (removing /api or /anything path)
  const baseUrlParts = API_BASE_URL.split('/');
  const baseHost = baseUrlParts.slice(0, 3).join('/'); // "https://domain.com"
  
  return `${baseHost}/${cleanPath}`;
};

/**
 * Mobile Versioning Gate
 * Used by the client to refuse connection if the backend requires a newer app version.
 */
export const MOBILE_VERSION = "1.0.0";
export const PLATFORM = Platform.OS;
