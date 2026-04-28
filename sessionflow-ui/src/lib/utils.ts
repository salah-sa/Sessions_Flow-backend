import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime12h(time: string | null) {
  if (!time) return "--:--";
  // Handle both HH:mm and HH:mm:ss
  const parts = time.split(":");
  if (parts.length < 2) return time;
  
  const hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  
  return `${h12}:${minutes} ${ampm}`;
}

export function formatDateTo12h(date: Date): string {
  // Enforce Africa/Cairo timezone to prevent local OS offset mismatch
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return formatter.format(date);
}

export function getCairoDateStr(): string {
  // Always query based on the active day in Cairo, bypassing local browser time.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Host object bridge for WebView2.
 */
export async function getHost() {
  try {
    // @ts-ignore
    if (window.chrome?.webview?.hostObjects?.sessionFlowHost) {
      // @ts-ignore
      return window.chrome.webview.hostObjects.sessionFlowHost;
    }
  } catch (e) {
    // Not in WebView2
  }
  return null;
}

/**
 * Returns the CSS class for subscription tier visual border.
 */
export function getTierBorderClass(tier?: string): string {
  switch (tier?.toLowerCase()) {
    case "pro":
      return "tier-border-pro";
    case "ultra":
      return "tier-border-ultra";
    case "enterprise":
      return "tier-border-enterprise";
    default:
      return "tier-border-free";
  }
}

/**
 * Returns badge label + CSS class for subscription tier pill, or null for Free.
 */
export function getTierBadge(tier?: string): { label: string; className: string } | null {
  switch (tier?.toLowerCase()) {
    case "pro":
      return { label: "💎 PRO", className: "tier-badge-pro" };
    case "ultra":
      return { label: "⚡ ULTRA", className: "tier-badge-ultra" };
    case "enterprise":
      return { label: "🏢 ENT", className: "tier-badge-enterprise" };
    default:
      return null;
  }
}
