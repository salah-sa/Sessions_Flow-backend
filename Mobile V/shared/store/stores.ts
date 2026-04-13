import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, Session, AttendanceRecord, Notification, ChatMessage } from "../types";
import { securePersistence } from "../lib/securePersistence";
import { setCachedToken } from "../api/client";
import { secureStorage } from "../../services/secureStorage";

// Auth Store
interface AuthState {
  user: User | null;
  token: string | null;
  rememberMe: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  setRememberMe: (val: boolean) => void;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      rememberMe: false,
      setAuth: async (user, token) => {
        setCachedToken(token);
        // Persist to hardware-encrypted SecureStore for session survival
        await secureStorage.setUser(user);
        await secureStorage.setToken(token);
        set({ user, token });
      },
      setRememberMe: (val) => set({ rememberMe: val }),
      updateUser: (user) => set({ user }),
      logout: async () => {
        setCachedToken(null);
        // Clear all security-sensitive data from SecureStore
        await secureStorage.clearAll();
        set({ user: null, token: null, rememberMe: false });
      },
    }),
    { 
      name: "sf-auth-storage",
      storage: createJSONStorage(() => securePersistence)
    }
  )
);

// Session Store
interface SessionState {
  activeSession: Session | null;
  attendanceRecords: Record<string, AttendanceRecord>;
  pendingAttendance: Array<{ sessionId: string, records: any[] }>;
  setActiveSession: (session: Session | null) => void;
  setAttendanceRecords: (records: AttendanceRecord[]) => void;
  updateAttendanceRecord: (record: AttendanceRecord) => void;
  queueAttendanceUpdate: (sessionId: string, record: any) => void;
  clearPendingAttendance: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeSession: null,
      attendanceRecords: {},
      pendingAttendance: [],
      setActiveSession: (session) => set({ activeSession: session }),
      setAttendanceRecords: (records) => {
        const map = records.reduce((acc, r) => {
          acc[r.studentId] = r;
          return acc;
        }, {} as Record<string, AttendanceRecord>);
        set({ attendanceRecords: map });
      },
      updateAttendanceRecord: (record) =>
        set((state) => ({
          attendanceRecords: { ...state.attendanceRecords, [record.studentId]: record },
        })),
      queueAttendanceUpdate: (sessionId, record) => 
        set((state) => ({
          pendingAttendance: [...state.pendingAttendance, { sessionId, records: [record] }]
        })),
      clearPendingAttendance: () => set({ pendingAttendance: [] }),
    }),
    {
      name: "sf-session-storage",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);

// UI Store
interface UIState {
  theme: "light" | "dark";
  language: "en" | "ar";
  biometricsEnabled: boolean;
  notificationPrefs: {
    sessions: boolean;
    system: boolean;
    mentions: boolean;
  };
  setTheme: (theme: "light" | "dark") => void;
  setLanguage: (lang: "en" | "ar") => void;
  setBiometrics: (enabled: boolean) => void;
  updateNotificationPrefs: (prefs: Partial<UIState["notificationPrefs"]>) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      language: "en",
      biometricsEnabled: false,
      notificationPrefs: {
        sessions: true,
        system: true,
        mentions: true,
      },
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setBiometrics: (biometricsEnabled) => set({ biometricsEnabled }),
      updateNotificationPrefs: (prefs) => set((state) => ({ 
        notificationPrefs: { ...state.notificationPrefs, ...prefs } 
      })),
    }),
    { 
      name: "sf-ui-storage",
      storage: createJSONStorage(() => securePersistence)
    }
  )
);

// Notification Store
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  markAsRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
    }),
    { 
      name: "sf-notification-storage",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);

// Chat Store
interface ChatState {
  unreadCounts: Record<string, number>;
  lastMessages: Record<string, ChatMessage>;
  pendingMessages: ChatMessage[];
  activeGroupId: string | null;
  typingStates: Record<string, string[]>; // groupId -> list of userNames
  mutedGroups: string[];
  pinnedGroups: string[];
  incrementUnread: (groupId: string) => void;
  clearUnread: (groupId: string) => void;
  setLastMessage: (groupId: string, msg: ChatMessage) => void;
  setActiveGroup: (groupId: string | null) => void;
  setTyping: (groupId: string, userName: string, isTyping: boolean) => void;
  toggleMute: (groupId: string) => void;
  togglePin: (groupId: string) => void;
  queueMessage: (msg: ChatMessage) => void;
  removeFromQueue: (msgId: string) => void;
  flushQueue: () => ChatMessage[];
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      unreadCounts: {},
      lastMessages: {},
      pendingMessages: [],
      activeGroupId: null,
      incrementUnread: (groupId) =>
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [groupId]: (state.unreadCounts[groupId] || 0) + 1 },
        })),
      clearUnread: (groupId) =>
        set((state) => {
          if (!state.unreadCounts[groupId]) return state;
          return { unreadCounts: { ...state.unreadCounts, [groupId]: 0 } };
        }),
      setLastMessage: (groupId, msg) =>
        set((state) => {
          if (state.lastMessages[groupId]?.id === msg.id) return state;
          return { lastMessages: { ...state.lastMessages, [groupId]: msg } };
        }),
      setActiveGroup: (groupId) => set({ activeGroupId: groupId }),
      typingStates: {},
      setTyping: (groupId, userName, isTyping) =>
        set((state) => {
          const current = state.typingStates[groupId] || [];
          const next = isTyping 
            ? [...new Set([...current, userName])]
            : current.filter(n => n !== userName);
          
          if (next.length === current.length) return state;
          return { typingStates: { ...state.typingStates, [groupId]: next } };
        }),
      mutedGroups: [],
      pinnedGroups: [],
      toggleMute: (groupId) =>
        set((state) => ({
          mutedGroups: state.mutedGroups.includes(groupId)
            ? state.mutedGroups.filter((id) => id !== groupId)
            : [...state.mutedGroups, groupId],
        })),
      togglePin: (groupId) =>
        set((state) => ({
          pinnedGroups: state.pinnedGroups.includes(groupId)
            ? state.pinnedGroups.filter((id) => id !== groupId)
            : [...state.pinnedGroups, groupId],
        })),
      queueMessage: (msg) =>
        set((state) => ({
          pendingMessages: [...state.pendingMessages, msg],
        })),
      removeFromQueue: (msgId) =>
        set((state) => ({
          pendingMessages: state.pendingMessages.filter((m) => m.id !== msgId),
        })),
      flushQueue: () => {
        const msgs = get().pendingMessages;
        set({ pendingMessages: [] });
        return msgs;
      },
    }),
    { 
      name: "sf-chat-storage",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);

// App Store (Health & Sync + Degradation Engine)
export type ConnectionMode = "full" | "hybrid" | "degraded";

interface AppState {
  isOnline: boolean;
  connectionStatus: "Connected" | "Disconnected" | "Reconnecting";
  connectionMode: ConnectionMode;
  isSyncing: boolean;
  setOnline: (isOnline: boolean) => void;
  setConnectionStatus: (status: "Connected" | "Disconnected" | "Reconnecting") => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setSyncing: (isSyncing: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true, // Default to true, will be updated by NetInfo in useNetworkStatus hook
  connectionStatus: "Disconnected",
  connectionMode: "degraded",
  isSyncing: false,
  setOnline: (isOnline) => 
    set((state) => (state.isOnline === isOnline ? state : { isOnline })),
  setConnectionStatus: (connectionStatus) => 
    set((state) => (state.connectionStatus === connectionStatus ? state : { connectionStatus })),
  setConnectionMode: (connectionMode) => 
    set((state) => (state.connectionMode === connectionMode ? state : { connectionMode })),
  setSyncing: (isSyncing) => 
    set((state) => (state.isSyncing === isSyncing ? state : { isSyncing })),
}));
