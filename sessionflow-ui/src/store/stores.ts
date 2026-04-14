import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Session, AttendanceRecord, Notification, AuditLog, ChatMessage } from "../types";

// Auth Store
interface AuthState {
  user: User | null;
  token: string | null;
  rememberMe: boolean;
  _hasHydrated: boolean;
  _lastLoginAt: number; // Timestamp of last successful login
  setAuth: (user: User, token: string) => void;
  setRememberMe: (val: boolean) => void;
  updateUser: (user: User) => void;
  setHasHydrated: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      rememberMe: false,
      _hasHydrated: false,
      _lastLoginAt: 0,
      setAuth: (user, token) => {
        localStorage.setItem("sf_token", token);
        set({ user, token, _lastLoginAt: Date.now() });
      },
      setRememberMe: (val) => set({ rememberMe: val }),
      updateUser: (user) => set({ user }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),
      logout: () => {
        localStorage.removeItem("sf_token");
        localStorage.removeItem("sf-auth-storage");
        sessionStorage.removeItem("sf-auth-storage");
        set({ user: null, token: null, rememberMe: false });
      },
    }),
    {
      name: "sf-auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Session Store
interface SessionState {
  activeSession: Session | null;
  attendanceRecords: Record<string, AttendanceRecord>;
  setActiveSession: (session: Session | null) => void;
  setAttendanceRecords: (records: AttendanceRecord[]) => void;
  updateAttendanceRecord: (record: AttendanceRecord) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  attendanceRecords: {},
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
}));

// UI Store
interface UIState {
  theme: "light" | "dark";
  language: "en" | "ar";
  sidebarOpen: boolean;
  setTheme: (theme: "light" | "dark") => void;
  setLanguage: (lang: "en" | "ar") => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      language: "en",
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    { name: "sf-ui-storage" }
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
    { name: "sf-notification-storage" }
  )
);

// Chat Store
interface ChatState {
  unreadCounts: Record<string, number>;
  lastMessages: Record<string, ChatMessage>;
  /** Offline mutation queue — messages that failed to send and await reconnection */
  pendingMessages: ChatMessage[];
  activeGroupId: string | null;
  incrementUnread: (groupId: string) => void;
  clearUnread: (groupId: string) => void;
  setLastMessage: (groupId: string, msg: ChatMessage) => void;
  setActiveGroup: (groupId: string | null) => void;
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
          unreadCounts: {
            ...state.unreadCounts,
            [groupId]: (state.unreadCounts[groupId] || 0) + 1,
          },
        })),
      clearUnread: (groupId) =>
        set((state) => {
          if (!state.unreadCounts[groupId]) return state; // Already 0 or undefined, do not mutate state
          return {
            unreadCounts: {
              ...state.unreadCounts,
              [groupId]: 0,
            },
          };
        }),
      setLastMessage: (groupId, msg) =>
        set((state) => {
          if (state.lastMessages[groupId]?.id === msg.id) return state; // Prevent duplicate updates
          return {
            lastMessages: {
              ...state.lastMessages,
              [groupId]: msg,
            },
          };
        }),
      setActiveGroup: (groupId) => set({ activeGroupId: groupId }),
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
    { name: "sf-chat-storage" }
  )
);
// App Store (Health & Sync + Degradation Engine)
export type ConnectionMode = "full" | "hybrid" | "degraded";

interface AppState {
  isOnline: boolean;
  connectionStatus: "Connected" | "Disconnected" | "Reconnecting";
  /** 3-mode architecture: full / hybrid / degraded */
  connectionMode: ConnectionMode;
  isSyncing: boolean;
  setOnline: (isOnline: boolean) => void;
  setConnectionStatus: (status: "Connected" | "Disconnected" | "Reconnecting") => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setSyncing: (isSyncing: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: navigator.onLine,
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
