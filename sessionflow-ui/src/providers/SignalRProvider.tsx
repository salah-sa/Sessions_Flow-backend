import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuthStore, useAppStore, useChatStore } from "../store/stores";
import { usePresenceStore } from "../store/presenceStore";
import { useMuteStore } from "../store/muteStore";
import { useNotificationPopupStore } from "../store/notificationStore";
import { useCallStore } from "../store/callStore";
import { sounds } from "../lib/sounds";
import { Events } from "../lib/eventContracts";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries/keys";
import { ChatMessage } from "../types";
import { toast } from "sonner";

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
 * ALL event names use standardized contracts from eventContracts.ts.
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

  // Centralized Real-time Invalidations — using standardized event contracts
  const setupGlobalListeners = (connection: signalR.HubConnection) => {

    // ═══════════════════════════════════════════════
    // Message Deduplication Guard (multi-client safety)
    // When the same user has Web+Desktop open, both SignalR connections
    // may deliver the same event. This rolling set prevents duplicate processing.
    // ═══════════════════════════════════════════════
    const processedMessageIds = new Set<string>();
    const MESSAGE_DEDUP_MAX = 100;

    const parsePayload = (raw: any) => {
      if (typeof raw === "string") {
        try { return JSON.parse(raw); } catch { return raw; }
      }
      return raw;
    };

    // ═══════════════════════════════════════════════
    // 1. Chat Messages
    // ═══════════════════════════════════════════════
    connection.on(Events.MESSAGE_RECEIVE, (raw: any) => {
      const data = parsePayload(raw);
      const groupId = data?.groupId;
      const msg = data?.message;

      // Deduplication: skip if we already processed this message event
      const msgId = msg?.id;
      if (msgId) {
        if (processedMessageIds.has(msgId)) return;
        processedMessageIds.add(msgId);
        // Evict oldest entries to prevent memory leak
        if (processedMessageIds.size > MESSAGE_DEDUP_MAX) {
          const first = processedMessageIds.values().next().value;
          if (first) processedMessageIds.delete(first);
        }
      }
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
        queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.data });

        // ═══════════════════════════════════════════════
        // GLOBAL CACHE INJECTION (RC-1)
        // Ensures messages arrive regardless of page viewing.
        // ═══════════════════════════════════════════════
        if (msg) {
          const { user } = useAuthStore.getState();
          queryClient.setQueryData(
            queryKeys.chat.messages(groupId),
            (old: any) => {
              if (!old) return { pages: [[msg]], pageParams: [undefined] };
              
              const newPages = old.pages.map((page: ChatMessage[], index: number) => {
                // Incoming messages always belong in the FIRST page (most recent)
                if (index === 0) {
                  // ID dedup
                  if (page.some(m => m.id === msg.id)) {
                    return page.map(m => m.id === msg.id ? { ...m, ...msg, status: "sent" as const } : m);
                  }
                  // Pending match (sender only) - Ensures cross-device sync works for optimistic updates
                  if (user && msg.senderId === user.id) {
                    const pendingIdx = page.findIndex(m =>
                      m.status === "pending" &&
                      m.senderId === msg.senderId &&
                      (m.text === msg.text || (m.fileName && m.fileName === msg.fileName))
                    );
                    if (pendingIdx !== -1) {
                      const updated = [...page];
                      updated[pendingIdx] = { ...msg, status: "sent" as const };
                      return updated;
                    }
                  }
                  // If it's technically our own message but we didn't have it pending (e.g. from our other device)
                  return [{ ...msg, status: "sent" as const }, ...page];
                }
                return page;
              });

              return { ...old, pages: newPages };
            }
          );
        }
      }

      if (msg) {
        const { user } = useAuthStore.getState();
        const isSelf = user && msg.senderId?.toString().toLowerCase() === user.id?.toString().toLowerCase();

        if (user && !isSelf) {
          // Delay to allow local React state (like activeGroupId) to settle during group switching
          setTimeout(() => {
            const { activeGroupId, incrementUnread } = useChatStore.getState();
            const { isMuted } = useMuteStore.getState();

            if (!isMuted(msg.groupId)) {
              if (document.hidden || activeGroupId !== msg.groupId) {
                sounds.playNotification();
                useNotificationPopupStore.getState().notify(
                  msg.groupId,
                  msg.senderName ?? "Unknown",
                  msg.text || (msg.fileName ? `📎 ${msg.fileName}` : "Sent an attachment"),
                  msg.sender?.avatarUrl ?? undefined
                );
              } else {
                sounds.playPop();
              }
            }
            incrementUnread(msg.groupId);
          }, 50);
        }
      }
    });

    connection.on(Events.MESSAGE_READ, (raw: any) => {
      const data = parsePayload(raw);
      const groupId = data?.groupId;
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(groupId) });
      }
    });

    connection.on(Events.MESSAGE_TYPING, (data: any) => {
      if (data?.groupId && data?.userId && data?.userName) {
        useChatStore.getState().setTyping(data.groupId, data.userId, data.userName);
      }
    });

    // ═══════════════════════════════════════════════
    // 2. Sessions
    // ═══════════════════════════════════════════════
    connection.on(Events.SESSION_STATUS_CHANGED, (data: any) => {
      const sessionId = data?.sessionId;
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byId(sessionId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    connection.on(Events.ATTENDANCE_UPDATED, (raw: any) => {
      const data = parsePayload(raw);
      const sessionId = data?.sessionId;
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byId(sessionId) });
        queryClient.invalidateQueries({ queryKey: ["sessions", "attendance", sessionId] });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    connection.on(Events.SESSION_GENERATED, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    // ═══════════════════════════════════════════════
    // 3. Groups
    // ═══════════════════════════════════════════════
    connection.on(Events.GROUP_STATUS_CHANGED, (raw: any) => {
      const data = parsePayload(raw);
      const groupId = data?.groupId;
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    });

    connection.on(Events.GROUP_CREATED, () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
    });

    connection.on(Events.GROUP_DELETED, (raw: any) => {
      const data = parsePayload(raw);
      const groupId = data?.groupId;
      if (groupId) {
        queryClient.removeQueries({ queryKey: queryKeys.groups.byId(groupId) });
        queryClient.removeQueries({ queryKey: queryKeys.chat.messages(groupId) });
      }
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    connection.on(Events.GROUP_COMPLETED, (raw: any) => {
      const data = parsePayload(raw);
      const groupId = data?.groupId;
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      }
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    connection.on(Events.GROUP_DESCRIPTION_UPDATED, (raw: any) => {
      const data = parsePayload(raw);
      const groupId = data?.groupId;
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      }
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    });

    // ═══════════════════════════════════════════════
    // 4. Real-Time Presence Events
    // ═══════════════════════════════════════════════
    connection.on(Events.PRESENCE_ONLINE, (raw: any) => {
      const data = parsePayload(raw);
      const userId = data?.userId;
      if (userId) usePresenceStore.getState().setServerOnline(userId);
    });

    connection.on(Events.PRESENCE_OFFLINE, (raw: any) => {
      const data = parsePayload(raw);
      const userId = data?.userId;
      if (userId) usePresenceStore.getState().setServerOffline(userId);
    });

    connection.on(Events.PRESENCE_AWAY, (raw: any) => {
      const data = parsePayload(raw);
      const userId = data?.userId;
      if (userId) {
        usePresenceStore.getState().setServerAway(userId);
      }
    });

    connection.on(Events.PRESENCE_SNAPSHOT, (raw: any) => {
      const snapshot = parsePayload(raw);
      if (Array.isArray(snapshot)) {
        const onlineUserIds = snapshot
          .filter((u: any) => u.isOnline)
          .map((u: any) => u.userId);
        usePresenceStore.getState().setBulkServerOnline(onlineUserIds);
      }
    });

    // ═══════════════════════════════════════════════
    // 5. Avatar
    // ═══════════════════════════════════════════════
    connection.on(Events.AVATAR_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    });

    // ═══════════════════════════════════════════════
    // 6. Call Signaling Events
    // ═══════════════════════════════════════════════
    connection.on(Events.CALL_INCOMING, (raw: any) => {
      const data = parsePayload(raw);
      useCallStore.getState().receiveCall(data?.callerId, data?.callerName, data?.callerAvatar);
      sounds.playRingtone();
    });

    connection.on(Events.CALL_ACCEPTED, (raw: any) => {
      const data = parsePayload(raw); // just in case payload exists
      useCallStore.getState().accepted();
      sounds.stopRingtone();
    });

    connection.on(Events.CALL_REJECTED, (raw: any) => {
      const data = parsePayload(raw);
      useCallStore.getState().rejected();
      sounds.stopRingtone();
      sounds.playCallEnd();
    });

    connection.on(Events.CALL_ENDED, (raw: any) => {
      const data = parsePayload(raw);
      useCallStore.getState().ended();
      sounds.stopRingtone();
      sounds.playCallEnd();
    });

    // WebRTC signaling passthrough
    connection.on(Events.CALL_OFFER, (raw: any) => {
      const data = parsePayload(raw);
      useCallStore.getState().setRemoteSdp(data?.sdp, "offer");
    });

    connection.on(Events.CALL_ANSWER, (raw: any) => {
      const data = parsePayload(raw);
      useCallStore.getState().setRemoteSdp(data?.sdp, "answer");
    });

    connection.on(Events.CALL_ICE, (raw: any) => {
      const data = parsePayload(raw);
      useCallStore.getState().addIceCandidate(data?.candidate);
    });

    // ═══════════════════════════════════════════════
    // 7. Student Request Push Notifications
    // ═══════════════════════════════════════════════
    connection.on(Events.REQUEST_CREATED, () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      sounds.playNotification();
    });

    connection.on(Events.REQUEST_ACCEPTED, (data?: { studentId?: string; engineerCode?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: ["groups"] }); // Incase student list in group details changed
      sounds.playPop();

      if (data?.studentId && data?.engineerCode) {
        toast.success("Registration Approved!", {
          description: `Student ID: ${data.studentId} | Engineer Code: ${data.engineerCode}`,
          duration: 10000,
        });
      }
    });

    connection.on(Events.REQUEST_REJECTED, () => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    // ═══════════════════════════════════════════════
    // 8. Notification System
    // ═══════════════════════════════════════════════
    connection.on(Events.NOTIFICATION_CREATED, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: ["pending-student-requests"] });
    });

    // ═══════════════════════════════════════════════
    // 9. Sync State (post-reconnect recovery)
    // ═══════════════════════════════════════════════
    connection.on(Events.SYNC_STATE, () => {
      // Full-state resync: invalidate everything
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
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

  // Build and start connection when token changes
  useEffect(() => {
    if (!token) {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        setState(signalR.HubConnectionState.Disconnected);
        useAppStore.getState().setConnectionStatus("Connected");
        useAppStore.getState().setConnectionMode("full");
      }
      return;
    }

    useAppStore.getState().setConnectionStatus("Reconnecting");
    useAppStore.getState().setConnectionMode("hybrid");

    const hubBaseUrl = import.meta.env.VITE_API_URL ?? "";
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${hubBaseUrl}/hub?access_token=${token}`)
      .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
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

      // Re-join all chat groups (lost on reconnect)
      connection.invoke("RejoinGroups").catch(console.error);

      // M4: Refetch chat messages missed during disconnect window
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });

      // RC-3: Flush any listeners that were registered while disconnected
      for (const { event, cb } of pendingListeners.current) {
        connection.on(event, cb);
      }
      pendingListeners.current = [];

      // Request presence snapshot on reconnect
      connection.invoke("RequestPresenceSnapshot").catch(console.error);

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

        // Request initial presence snapshot on mount
        connection.invoke("RequestPresenceSnapshot").catch(console.error);

        // H2 FIX: Periodic presence re-sync (30s) to catch any missed events
        const presenceInterval = setInterval(() => {
          if (connection.state === signalR.HubConnectionState.Connected) {
            connection.invoke("RequestPresenceSnapshot").catch(console.error);
          }
        }, 30_000);
        
        // Store for cleanup
        (connection as any).__presenceInterval = presenceInterval;
      })
      .catch((err) => {
        console.error("[SignalR] Connection failed:", err);
        setState(signalR.HubConnectionState.Disconnected);
        useAppStore.getState().setConnectionStatus("Disconnected");
        // Don't turn red immediately, let the degradation timer handle it
        useAppStore.getState().setConnectionMode("hybrid");
        startDegradeTimer();
      });

    return () => {
      clearDegradeTimer();
      const interval = (connection as any).__presenceInterval;
      if (interval) clearInterval(interval);
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
