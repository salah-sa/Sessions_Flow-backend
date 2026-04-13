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

