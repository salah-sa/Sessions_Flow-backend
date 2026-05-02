/**
 * useAnalytics — Lightweight hook for tracking frontend page views and events.
 * Events are batched and sent to /api/analytics/events/batch every 10s or on
 * page unload (whichever comes first). Respects the session ID for grouping.
 */
import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

interface AnalyticsEvent {
  eventType: string;
  route: string;
  browserSessionId: string;
  metadata?: Record<string, unknown>;
}

// Single browser session ID for this tab
const BROWSER_SESSION_ID = crypto.randomUUID();

// Flush queue using sendBeacon (fire-and-forget; no auth header needed for analytics)
function flushQueue(queue: AnalyticsEvent[]): void {
  if (queue.length === 0) return;
  // sendBeacon is reliable across page transitions and doesn't block
  const blob = new Blob([JSON.stringify({ events: queue })], { type: "application/json" });
  navigator.sendBeacon("/api/analytics/events/batch", blob);
}

let globalQueue: AnalyticsEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(async () => {
    const toFlush = [...globalQueue];
    globalQueue = [];
    flushTimeout = null;
    await flushQueue(toFlush);
  }, 10_000); // flush every 10s
}

function enqueue(event: AnalyticsEvent) {
  globalQueue.push(event);
  if (globalQueue.length >= 10) {
    // Flush immediately when batch is large
    if (flushTimeout) { clearTimeout(flushTimeout); flushTimeout = null; }
    const toFlush = [...globalQueue];
    globalQueue = [];
    flushQueue(toFlush);
  } else {
    scheduleFlush();
  }
}

// On page unload, flush whatever's left
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (globalQueue.length === 0) return;
    // Use sendBeacon for reliability
    const blob = new Blob(
      [JSON.stringify({ events: globalQueue })],
      { type: "application/json" }
    );
    navigator.sendBeacon("/api/analytics/events/batch", blob);
    globalQueue = [];
  });
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useAnalytics() {
  const location = useLocation();
  const lastRoute = useRef<string>("");

  // Track page views on route change
  useEffect(() => {
    const route = location.pathname;
    if (route === lastRoute.current) return;
    lastRoute.current = route;

    enqueue({
      eventType: "page_view",
      route,
      browserSessionId: BROWSER_SESSION_ID,
      metadata: { search: location.search || undefined }
    });
  }, [location.pathname]);

  // Manual event tracking
  const track = useCallback((eventType: string, metadata?: Record<string, unknown>) => {
    enqueue({
      eventType,
      route: window.location.pathname,
      browserSessionId: BROWSER_SESSION_ID,
      metadata
    });
  }, []);

  return { track };
}
