/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Client Heartbeat + Adaptive Presence
 * PARITY: 1:1 mirror of desktop hooks/useHeartbeat.ts
 * Adaptations: AppState instead of DOM visibility/focus/blur,
 *              NetInfo instead of navigator.onLine
 * ═══════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useSignalR } from "../providers/SignalRProvider";
import { usePresenceStore } from "../shared/store/presenceStore";
import { useAuthStore, useAppStore } from "../shared/store/stores";

// ═══════════════════════════════════════════════════════════
// LAYER 1 (Server): Sends "Heartbeat" to SignalR every 30s
// LAYER 2 (Client): Monitors AppState (foreground/background)
// LAYER 3 (Anti-Ghost): Detects stale connections and self-corrects
//
// This hook should be activated ONCE in the tabs layout.
// ═══════════════════════════════════════════════════════════

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const IDLE_TIMEOUT = 90_000; // 90 seconds of no interaction → "away"

export function useHeartbeat() {
  const { invoke, state: hubState } = useSignalR();
  const { user } = useAuthStore();
  const setSelfStatus = usePresenceStore((s) => s.setSelfStatus);
  const setClientOnline = usePresenceStore((s) => s.setClientOnline);
  const setClientOffline = usePresenceStore((s) => s.setClientOffline);
  const setServerHealth = usePresenceStore((s) => s.setServerHealth);

  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const userId = user?.id;

  // ── Reset idle timer on user activity ─────────────
  const resetIdleTimer = useCallback(() => {
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

  // ── Client Signals (Layer 2) — Mobile: AppState ──────
  useEffect(() => {
    if (!userId) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        // App returned to foreground
        resetIdleTimer();
        setClientOnline(userId);
        useAppStore.getState().setOnline(true);
        // Send heartbeat on foreground return
        invoke("Heartbeat").catch(() => {});
        // Request bulk presence snapshot on return
        invoke("RequestPresenceSnapshot").catch(() => {});
      } else if (nextState === "background" || nextState === "inactive") {
        // App went to background
        setSelfStatus("hidden");
        // Don't immediately mark as offline — user might return quickly
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    // Initial idle timer
    resetIdleTimer();

    return () => {
      subscription.remove();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [userId, invoke, resetIdleTimer, setSelfStatus, setClientOnline]);

  // ── SignalR State Monitoring (Anti-Ghost) ─────────
  useEffect(() => {
    if (hubState === "Connected") {
      setServerHealth(true);
    } else if (hubState === "Disconnected") {
      setServerHealth(false);
    }
  }, [hubState, setServerHealth]);
}
