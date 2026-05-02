import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuthStore } from "../store/stores";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import { toast } from "sonner";

const HUB_URL = `${import.meta.env.VITE_API_URL ?? ""}/hub/notifications`;

/**
 * useNotificationHub
 *
 * Connects to the backend NotificationHub (/hub/notifications) and handles:
 *   - "ReceiveNotification" → invalidates notification cache + shows toast
 *   - "BroadcastMessage"    → shows system-wide toast banner
 *
 * Lifecycle: connects on mount, disconnects on unmount.
 * Auth: JWT token passed as query param (standard SignalR pattern).
 */
export const useNotificationHub = () => {
  const token = useAuthStore(s => s.token);
  const qc = useQueryClient();
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    if (!token || isConnectingRef.current) return;

    isConnectingRef.current = true;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // ── Event Handlers ──────────────────────────────────────────────────
    connection.on("ReceiveNotification", (payload: { title: string; message: string; type: string }) => {
      // Invalidate so NotificationCenter refreshes
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });

      // Show toast for incoming notification
      const toastFn = payload.type === "Error" ? toast.error
        : payload.type === "Warning" ? toast.warning
        : toast.info;

      toastFn(payload.message, { description: payload.title, duration: 5000 });
    });

    connection.on("BroadcastMessage", (payload: { subject: string; message: string }) => {
      toast.info(payload.message, {
        description: `📢 ${payload.subject}`,
        duration: 8000,
      });
    });

    connection.on("SystemAlert", (payload: { message: string }) => {
      toast.warning(payload.message, { duration: 10000 });
    });

    // ── Connection Lifecycle ────────────────────────────────────────────
    const start = async () => {
      try {
        await connection.start();
      } catch (err) {
        // Silent failure — notifications are non-critical
        console.debug("[NotificationHub] Connection failed:", err);
      } finally {
        isConnectingRef.current = false;
      }
    };

    start();

    return () => {
      isConnectingRef.current = false;
      connection.stop().catch(() => {});
      connectionRef.current = null;
    };
  }, [token]);
};
