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

export function formatDateTo12h(date: Date | string | null): string {
  if (!date) return "--:--";
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) return "--:--";

  // Enforce Africa/Cairo timezone to prevent local OS offset mismatch
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return formatter.format(d);
}

export function getCairoDateStr(): string {
  // Always query based on the active day in Cairo, bypassing local browser time.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "-----";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "-----";
  
  return d.toLocaleDateString("en-EG", {
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

