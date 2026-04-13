/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — SignalR Provider
 * PARITY: 1:1 mirror of desktop SignalRProvider.tsx
 * Adaptations: Uses SIGNALR_URL config, AppState instead of DOM APIs
 * ═══════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore, useAppStore, useChatStore } from "../shared/store/stores";
import { usePresenceStore } from "../shared/store/presenceStore";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../shared/queries/keys";
import { SIGNALR_URL } from "../shared/api/config";

interface SignalRContextValue {
  on: (eventName: string, callback: (...args: any[]) => void) => () => void;
  off: (eventName: string, callback: (...args: any[]) => void) => void;
  invoke: (methodName: string, ...args: any[]) => Promise<any>;
  state: signalR.HubConnectionState;
}

const SignalRContext = createContext<SignalRContextValue | null>(null);

/**
 * Singleton SignalR provider. Manages ONE connection to /hub for the entire app.
 * Event listeners registered before the connection is ready are queued and replayed.
 * 
 * PARITY NOTE: This is a direct port of the desktop SignalRProvider with:
 * - SIGNALR_URL config instead of relative /hub path
 * - AppState listener instead of document.visibilitychange
 * - All 15+ global event listeners identical to desktop
 * - Full degradation engine (full → hybrid → degraded)
 */
export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [state, setState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );

  // Queue of listeners registered before connection was ready
  const pendingListeners = useRef<Array<{ event: string; cb: (...args: any[]) => void }>>([]);
  // Queue of method invocations requested before connection was ready
  const pendingInvokes = useRef<Array<{ methodName: string; args: any[]; resolve: (v: any) => void; reject: (e: any) => void }>>([]);

  // ═══════════════════════════════════════════════
  // Centralized Real-time Invalidations
  // IDENTICAL to desktop setupGlobalListeners
  // ═══════════════════════════════════════════════
  const setupGlobalListeners = (connection: signalR.HubConnection) => {
    // 1. Chat Invalidations -> Patching
    connection.on("NewChatMessage", (groupId: string, msgData: any) => {
      // Patch message into chat array if available
      if (msgData) {
        queryClient.setQueryData(queryKeys.chat.messages(groupId), (old: any) => {
          if (!old) return [msgData];
          // Check if message already exists
          if (old.some((m: any) => m.id === msgData.id)) return old;
          return [...old, msgData];
        });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(groupId) });
      }
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.data });
    });

    connection.on("MessagesRead", (groupId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(groupId) });
    });

    // 2. Session Invalidations -> Patching
    connection.on("SessionStatusChanged", (sessionId: string, newStatus: string) => {
      if (newStatus) {
        queryClient.setQueryData(queryKeys.sessions.byId(sessionId), (old: any) => {
          if (!old) return old;
          return { ...old, status: newStatus };
        });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byId(sessionId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    // 3. Attendance Invalidations -> Patching
    connection.on("AttendanceUpdated", (sessionId: string, recordData: any[]) => {
      if (recordData && Array.isArray(recordData)) {
        queryClient.setQueryData(["sessions", "attendance", sessionId], (old: any) => {
          if (!old) return recordData;
          return old.map((record: any) => {
            const updated = recordData.find(r => r.studentId === record.studentId);
            return updated ? { ...record, status: updated.status } : record;
          });
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["sessions", "attendance", sessionId] });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byId(sessionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    connection.on("NewSessionGenerated", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    // 4. Group Invalidations
    connection.on("GroupStatusChanged", (groupId: string, status: string) => {
      if (status) {
        queryClient.setQueryData(queryKeys.groups.byId(groupId), (old: any) => {
          if (!old) return old;
          return { ...old, status };
        });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    });

    // ═══════════════════════════════════════════════
    // 5. Real-Time Presence Events (3-Layer System)
    // ═══════════════════════════════════════════════
    connection.on("UserOnline", (userId: string) => {
      usePresenceStore.getState().setServerOnline(userId);
    });

    connection.on("UserOffline", (userId: string) => {
      usePresenceStore.getState().setServerOffline(userId);
    });

    connection.on("BulkPresence", (userIds: string[]) => {
      usePresenceStore.getState().setBulkServerOnline(userIds);
    });

    // ═══════════════════════════════════════════════
    // 6. Group Lifecycle Events (Full Cascade)
    // ═══════════════════════════════════════════════
    connection.on("GroupCreated", () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
    });

    connection.on("GroupDeleted", (groupId: string) => {
      // Purge the dead group data immediately (not just invalidate)
      queryClient.removeQueries({ queryKey: queryKeys.groups.byId(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.chat.messages(groupId) });
      // Then cascade invalidation
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    connection.on("GroupCompleted", (groupId: string) => {
      queryClient.setQueryData(queryKeys.groups.byId(groupId), (old: any) => {
        if (!old) return old;
        return { ...old, status: "Completed" };
      });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    connection.on("GroupDescriptionUpdated", (groupId: string, newDesc: string) => {
      if (typeof newDesc === "string") {
        queryClient.setQueryData(queryKeys.groups.byId(groupId), (old: any) => {
          if (!old) return old;
          return { ...old, description: newDesc };
        });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      }
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    });

    connection.on("StudentEnrolled", (groupId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    });

    connection.on("StudentRemoved", (groupId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    });

    // ═══════════════════════════════════════════════
    // 7. Avatar Updated (Real-time avatar sync)
    // ═══════════════════════════════════════════════
    connection.on("AvatarUpdated", (_userId: string, _avatarUrl: string) => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    connection.on("UserTyping", (groupId: string, userName: string) => {
      useChatStore.getState().setTyping(groupId, userName, true);
    });

    connection.on("UserStoppedTyping", (groupId: string, userName: string) => {
      useChatStore.getState().setTyping(groupId, userName, false);
    });

    connection.on("UserTyping", (groupId: string, userName: string) => {
      useChatStore.getState().setTyping(groupId, userName, true);
    });

    connection.on("UserStoppedTyping", (groupId: string, userName: string) => {
      useChatStore.getState().setTyping(groupId, userName, false);
    });
  };

  // ── Degradation Engine ─────────────────────────────
  const degradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDegradeTimer = () => {
    if (degradeTimerRef.current) {
      clearTimeout(degradeTimerRef.current);
      degradeTimerRef.current = null;
    }
  };

  const startDegradeTimer = () => {
    clearDegradeTimer();
    // After 10s in HYBRID mode without recovery → transition to DEGRADED
    degradeTimerRef.current = setTimeout(() => {
      useAppStore.getState().setConnectionMode("degraded");
    }, 10_000);
  };

  // ── AppState monitoring (mobile adaptation of visibilitychange) ──
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const conn = connectionRef.current;
      if (!conn) return;

      if (nextState === "active") {
        // App came to foreground - reconnect if needed
        if (conn.state === signalR.HubConnectionState.Disconnected) {
          conn.start().catch((err) => {
            console.error("[SignalR] Foreground reconnect failed:", err);
          });
        }
        // Request fresh presence snapshot on return
        if (conn.state === signalR.HubConnectionState.Connected) {
          conn.invoke("RequestPresenceSnapshot").catch(() => {});
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Build and start connection when token changes
  useEffect(() => {
    if (!token) {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        setState(signalR.HubConnectionState.Disconnected);
        useAppStore.getState().setConnectionStatus("Disconnected");
        useAppStore.getState().setConnectionMode("degraded");
      }
      return;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${SIGNALR_URL}?access_token=${token}`)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.elapsedMilliseconds < 30000) {
            return 2000;
          } else if (retryContext.elapsedMilliseconds < 120000) {
            return 10000;
          } else {
            return 30000;
          }
        }
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    setupGlobalListeners(connection);

    connection.onreconnecting(() => {
      setState(signalR.HubConnectionState.Reconnecting);
      useAppStore.getState().setConnectionStatus("Reconnecting");
      useAppStore.getState().setConnectionMode("hybrid");
      // APRL Layer 3: Track instability
      usePresenceStore.getState().updateWsStability(false);
      usePresenceStore.getState().setServerHealth(false);
      // Start 10s degradation timer
      startDegradeTimer();
    });

    connection.onreconnected(() => {
      setState(signalR.HubConnectionState.Connected);
      useAppStore.getState().setConnectionStatus("Connected");
      useAppStore.getState().setConnectionMode("full");
      clearDegradeTimer();
      // APRL Layer 3: Record reconnect + restore stability
      usePresenceStore.getState().recordReconnect();
      usePresenceStore.getState().updateWsStability(true);
      usePresenceStore.getState().setServerHealth(true);
      for (const req of pendingInvokes.current) {
        connection.invoke(req.methodName, ...req.args).then(req.resolve).catch(req.reject);
      }
      pendingInvokes.current = [];
    });

    connection.onclose(() => {
      setState(signalR.HubConnectionState.Disconnected);
      useAppStore.getState().setConnectionStatus("Disconnected");
      // Start degradation timer (hybrid → degraded after 10s)
      useAppStore.getState().setConnectionMode("hybrid");
      startDegradeTimer();
      // APRL: Server is fully down
      usePresenceStore.getState().setServerHealth(false);
      usePresenceStore.getState().updateWsStability(false);
      for (const req of pendingInvokes.current) {
        req.reject(new Error("SignalR connection closed before invocation."));
      }
      pendingInvokes.current = [];
    });

    connectionRef.current = connection;

    connection
      .start()
      .then(() => {
        setState(signalR.HubConnectionState.Connected);
        useAppStore.getState().setConnectionStatus("Connected");
        useAppStore.getState().setConnectionMode("full");
        clearDegradeTimer();

        for (const { event, cb } of pendingListeners.current) {
          connection.on(event, cb);
        }
        pendingListeners.current = [];

        for (const req of pendingInvokes.current) {
          connection.invoke(req.methodName, ...req.args).then(req.resolve).catch(req.reject);
        }
        pendingInvokes.current = [];
      })
      .catch((err) => {
        console.error("[SignalR] Connection failed:", err);
        setState(signalR.HubConnectionState.Disconnected);
        useAppStore.getState().setConnectionStatus("Disconnected");
        useAppStore.getState().setConnectionMode("degraded");
      });

    return () => {
      clearDegradeTimer();
      connection.stop();
      connectionRef.current = null;
      setState(signalR.HubConnectionState.Disconnected);
      useAppStore.getState().setConnectionStatus("Disconnected");
    };
  }, [token, queryClient]);

  const on = useCallback(
    (eventName: string, callback: (...args: any[]) => void): (() => void) => {
      const conn = connectionRef.current;
      if (conn && conn.state === signalR.HubConnectionState.Connected) {
        conn.on(eventName, callback);
      } else {
        pendingListeners.current.push({ event: eventName, cb: callback });
      }
      return () => {
        connectionRef.current?.off(eventName, callback);
        pendingListeners.current = pendingListeners.current.filter(
          (p) => !(p.event === eventName && p.cb === callback)
        );
      };
    },
    []
  );

  const off = useCallback(
    (eventName: string, callback: (...args: any[]) => void) => {
      connectionRef.current?.off(eventName, callback);
      pendingListeners.current = pendingListeners.current.filter(
        (p) => !(p.event === eventName && p.cb === callback)
      );
    },
    []
  );

  const invoke = useCallback(
    (methodName: string, ...args: any[]): Promise<any> => {
      return new Promise((resolve, reject) => {
        const conn = connectionRef.current;
        if (conn?.state === signalR.HubConnectionState.Connected) {
          conn.invoke(methodName, ...args).then(resolve).catch(reject);
        } else {
          pendingInvokes.current.push({ methodName, args, resolve, reject });
        }
      });
    },
    []
  );

  return (
    <SignalRContext.Provider value={{ on, off, invoke, state }}>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalR = () => {
  const ctx = useContext(SignalRContext);
  if (!ctx) {
    throw new Error("useSignalR must be used within <SignalRProvider>");
  }
  return ctx;
};
