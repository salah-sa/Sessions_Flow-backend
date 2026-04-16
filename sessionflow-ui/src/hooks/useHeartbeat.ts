import { useEffect, useRef, useCallback } from "react";
import { useSignalR } from "../providers/SignalRProvider";
import { usePresenceStore } from "../store/presenceStore";
import { useAuthStore, useAppStore } from "../store/stores";

// ═══════════════════════════════════════════════════════════
// Client Heartbeat + Adaptive Presence Engine
// ═══════════════════════════════════════════════════════════
//
// LAYER 1 (Server): Sends "Heartbeat" to SignalR every 30s
// LAYER 2 (Client): Monitors visibility, focus, idle, network
// LAYER 3 (Anti-Ghost): Detects stale connections and self-corrects
//
// This hook should be activated ONCE in Shell.tsx.
// ═══════════════════════════════════════════════════════════

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const IDLE_TIMEOUT = 90_000; // 90 seconds of no interaction → "away"

export function useHeartbeat() {
  const { invoke, state: hubState } = useSignalR();
  const user = useAuthStore((s) => s.user);
  const setSelfStatus = usePresenceStore((s) => s.setSelfStatus);
  const setClientOnline = usePresenceStore((s) => s.setClientOnline);
  const setClientOffline = usePresenceStore((s) => s.setClientOffline);
  const setServerHealth = usePresenceStore((s) => s.setServerHealth);

  const lastActivityRef = useRef(Date.now());
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval>>();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const userId = user?.id;

  // ── Reset idle timer on user activity ─────────────
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSelfStatus("active");

    if (userId) {
      setClientOnline(userId);
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setSelfStatus("idle");
    }, IDLE_TIMEOUT);
  }, [userId, setSelfStatus, setClientOnline]);

  // ── Server Heartbeat Loop (Layer 1) ───────────────
  useEffect(() => {
    if (!userId) return;

    // Mark self as online on mount
    setClientOnline(userId);
    setSelfStatus("active");

    // Try to send initial heartbeat
    invoke("Heartbeat").catch(() => {
      // Backend may not support this yet — graceful degradation
      setServerHealth(false);
    });

    heartbeatTimerRef.current = setInterval(() => {
      // Visibility Guard: Skip intensive heartbeats if tab is hidden
      // The server already knows we are away via the visibilitychange event
      if (document.hidden) return;

      invoke("Heartbeat")
        .then(() => {
          setServerHealth(true);
        })
        .catch(() => {
          setServerHealth(false);
        });
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);

      // Notify server we're going offline
      invoke("GoOffline").catch(() => {});
      setClientOffline(userId);
      setSelfStatus("offline");
    };
  }, [userId, invoke, setClientOnline, setClientOffline, setSelfStatus, setServerHealth]);

  // ── Client Signals (Layer 2) ──────────────────────
  useEffect(() => {
    if (!userId) return;

    // Visibility change detection (tab switching, minimizing)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setSelfStatus("hidden");
        // Signal "away" to the server so all group members see the status change
        invoke("SetAway").catch(() => {});
      } else {
        resetIdleTimer();
        // Send heartbeat on tab return to restore "online" status
        invoke("Heartbeat").catch(() => {});
        invoke("UpdatePresence", true).catch(() => {});
      }
    };

    // Window focus/blur
    const handleFocus = () => {
      resetIdleTimer();
    };

    const handleBlur = () => {
      // Start idle countdown on blur
      lastActivityRef.current = Date.now();
    };

    // Network status
    const handleOnline = () => {
      setClientOnline(userId);
      setSelfStatus("active");
      useAppStore.getState().setOnline(true);
      // Reconnection intelligence: request bulk presence snapshot
      invoke("RequestPresenceSnapshot").catch(() => {});
    };

    const handleOffline = () => {
      setClientOffline(userId);
      setSelfStatus("offline");
      setServerHealth(false);
      useAppStore.getState().setOnline(false);
    };

    // User activity tracking (mouse, keyboard, touch)
    const handleActivity = () => {
      resetIdleTimer();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("mousemove", handleActivity, { passive: true });
    document.addEventListener("keydown", handleActivity, { passive: true });
    document.addEventListener("touchstart", handleActivity, { passive: true });

    // Initial idle timer
    resetIdleTimer();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("mousemove", handleActivity);
      document.removeEventListener("keydown", handleActivity);
      document.removeEventListener("touchstart", handleActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [userId, invoke, resetIdleTimer, setSelfStatus, setClientOnline, setClientOffline, setServerHealth]);

  // ── SignalR State Monitoring (Anti-Ghost) ─────────
  useEffect(() => {
    if (hubState === "Connected") {
      setServerHealth(true);
    } else if (hubState === "Disconnected") {
      setServerHealth(false);
    }
  }, [hubState, setServerHealth]);
}
