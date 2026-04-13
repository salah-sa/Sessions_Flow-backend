import * as signalR from "@microsoft/signalr";
import { SIGNALR_URL } from "./config";
import { secureStorage } from "../../services/secureStorage";
import { useChatStore } from "../store/stores";
import { usePresenceStore } from "../store/presenceStore";
import { ChatMessage } from "../types";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — SignalR Bridge
 * Phase 56: Real-Time Communication Layer
 * ═══════════════════════════════════════════════════════════
 */

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private isConnecting = false;

  async start() {
    if (this.connection || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const token = await secureStorage.getToken();
      if (!token) {
        this.isConnecting = false;
        return;
      }

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_URL, {
          accessTokenFactory: () => token,
          transport: signalR.HttpTransportType.WebSockets,
          skipNegotiation: true,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Listeners
      this.connection.on("ReceiveMessage", (message: ChatMessage) => {
        const { activeGroupId, incrementUnread, setLastMessage } = useChatStore.getState();
        
        // Only increment unread if not currently in this chat
        if (activeGroupId !== message.groupId) {
          incrementUnread(message.groupId);
        }
        
        setLastMessage(message.groupId, message);
      });

      this.connection.on("UserPresenceChanged", (userId: string, status: string) => {
        const { setServerOnline, setServerOffline } = usePresenceStore.getState();
        if (status === "online") setServerOnline(userId);
        else setServerOffline(userId);
      });

      await this.connection.start();
      console.log("[SignalR] Connected");
    } catch (err) {
      console.error("[SignalR] Connection Error", err);
      this.connection = null;
    } finally {
      this.isConnecting = false;
    }
  }

  async stop() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  get isConnected() {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}

export const signalRService = new SignalRService();
