import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearSessionCaches } from "../lib/sessionCleanup";
import { User, Session, AttendanceRecord, Notification, AuditLog, ChatMessage } from "../types";

export interface StudentLocationData {
  city: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  source: 'auto' | 'manual';
  timestamp: number;
}

// Auth Store
export interface AuthState {
  user: User | null;
  token: string | null;
  rememberMe: boolean;
  studentLocation: string | null; // Keep for legacy/string display
  studentLocationData: StudentLocationData | null;
  _hasHydrated: boolean;
  _lastLoginAt: number; // Timestamp of last successful login
  hasAcknowledgedFreeModal: boolean;
  setAuth: (user: User, token: string) => void;
  setRememberMe: (val: boolean) => void;
  setStudentLocation: (loc: string) => void;
  setStudentLocationData: (data: StudentLocationData) => void;
  updateUser: (user: User) => void;
  setHasHydrated: (val: boolean) => void;
  logout: () => void;
  setHasAcknowledgedFreeModal: (val: boolean) => void;
}

/**
 * Computed selector — always returns the correct effective subscription tier.
 * Admin accounts are always treated as "Enterprise" regardless of DB value,
 * eliminating the race condition between login response and /status endpoint.
 */
export const selectEffectiveTier = (state: AuthState): import("../types").SubscriptionTier => {
  if (!state.user) return "Free";
  if (state.user.role === "Admin") return "Enterprise";
  return state.user.subscriptionTier ?? "Free";
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      rememberMe: false,
      studentLocation: null,
      studentLocationData: null,
      _hasHydrated: false,
      _lastLoginAt: 0,
      hasAcknowledgedFreeModal: false,
      setAuth: (user, token) => {
        set({ user, token, _lastLoginAt: Date.now() });
      },
      setRememberMe: (val) => set({ rememberMe: val }),
      setStudentLocation: (studentLocation) => set({ studentLocation }),
      setStudentLocationData: (data) => set({ 
        studentLocationData: data, 
        studentLocation: data.city 
      }),
      updateUser: (user) => set({ user }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),
      logout: () => {
        set({ user: null, token: null, rememberMe: false, studentLocation: null, studentLocationData: null, hasAcknowledgedFreeModal: false });
        clearSessionCaches();
      },
      setHasAcknowledgedFreeModal: (val) => set({ hasAcknowledgedFreeModal: val }),
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
export interface CustomTheme {
  accent: string;
  background: string;
  surface: string;
  sidebar: string;
}

export interface UIState {
  theme: "light" | "dark";
  language: "en" | "ar";
  sidebarOpen: boolean;
  customTheme: CustomTheme | null;
  isMinimized: boolean;
  setTheme: (theme: "light" | "dark") => void;
  setLanguage: (lang: "en" | "ar") => void;
  toggleSidebar: () => void;
  setCustomTheme: (theme: CustomTheme | null) => void;
  updateCustomTheme: (theme: Partial<CustomTheme>) => void;
  setMinimized: (minimized: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      language: "en",
      sidebarOpen: true,
      customTheme: null,
      isMinimized: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setCustomTheme: (customTheme) => set({ customTheme }),
      updateCustomTheme: (theme) => set((state) => ({ 
        customTheme: state.customTheme ? { ...state.customTheme, ...theme } : { accent: "", background: "", surface: "", sidebar: "", ...theme } 
      })),
      setMinimized: (isMinimized) => set({ isMinimized }),
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

// Section Badge Store (for sidebar red dot counters)
interface SectionBadgeState {
  seenItemIds: Record<string, string[]>;
  markSectionSeen: (sectionKey: string, currentIds: string[]) => void;
  getUnseenCount: (sectionKey: string, currentIds: string[]) => number;
}

export const useSectionBadgeStore = create<SectionBadgeState>()(
  persist(
    (set, get) => ({
      seenItemIds: {},
      markSectionSeen: (sectionKey, currentIds) =>
        set((state) => ({
          seenItemIds: {
            ...state.seenItemIds,
            [sectionKey]: currentIds,
          },
        })),
      getUnseenCount: (sectionKey, currentIds) => {
        const seen = get().seenItemIds[sectionKey] || [];
        const seenSet = new Set(seen);
        return currentIds.filter((id) => !seenSet.has(id)).length;
      },
    }),
    { name: "sf-section-badge-storage" }
  )
);

// Chat Store
interface ChatState {
  unreadCounts: Record<string, number>;
  lastMessages: Record<string, ChatMessage>;
  /** Offline mutation queue — messages that failed to send and await reconnection */
  pendingMessages: ChatMessage[];
  activeGroupId: string | null;
  typingUsers: Record<string, Record<string, { name: string; timeout: number }>>; // groupId -> { userId -> { name, timeout } }
  incrementUnread: (groupId: string) => void;
  clearUnread: (groupId: string) => void;
  setLastMessage: (groupId: string, msg: ChatMessage) => void;
  setActiveGroup: (groupId: string | null) => void;
  queueMessage: (msg: ChatMessage) => void;
  removeFromQueue: (msgId: string) => void;
  flushQueue: () => ChatMessage[];
  setTyping: (groupId: string, userId: string, userName: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      unreadCounts: {},
      lastMessages: {},
      pendingMessages: [],
      activeGroupId: null,
      typingUsers: {},
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
      setTyping: (groupId, userId, userName) => {
        // Clear previous timeout if exists
        const current = get().typingUsers[groupId]?.[userId];
        if (current?.timeout) {
          window.clearTimeout(current.timeout);
        }

        const timeout = window.setTimeout(() => {
          set((state) => {
            const next = { ...state.typingUsers };
            if (next[groupId]) {
              const groupTyping = { ...next[groupId] };
              delete groupTyping[userId];
              next[groupId] = groupTyping;
            }
            return { typingUsers: next };
          });
        }, 3000);

        set((state) => {
          const next = { ...state.typingUsers };
          next[groupId] = {
            ...(next[groupId] || {}),
            [userId]: { name: userName, timeout: Number(timeout) }
          };
          return { typingUsers: next };
        });
      },
    }),
    { 
      name: "sf-chat-storage",
      partialize: (state) => ({
        unreadCounts: state.unreadCounts,
        lastMessages: state.lastMessages,
        pendingMessages: state.pendingMessages,
        activeGroupId: state.activeGroupId
      })
    }
  )
);
// App Store (Health & Sync + Degradation Engine)
export type ConnectionMode = "full" | "hybrid" | "degraded";
export type NetworkQuality = "excellent" | "good" | "weak" | "offline";


interface AppState {
  isOnline: boolean;
  networkQuality: NetworkQuality;
  connectionStatus: "Connected" | "Disconnected" | "Reconnecting";
  /** 3-mode architecture: full / hybrid / degraded */
  connectionMode: ConnectionMode;
  isSyncing: boolean;
  userDismissedOffline: boolean;
  setOnline: (isOnline: boolean) => void;
  setNetworkQuality: (quality: NetworkQuality) => void;
  setConnectionStatus: (status: "Connected" | "Disconnected" | "Reconnecting") => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setSyncing: (isSyncing: boolean) => void;
  dismissOfflineModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: navigator.onLine,
  networkQuality: navigator.onLine ? "excellent" : "offline",
  connectionStatus: "Connected",
  connectionMode: "full",
  isSyncing: false,
  userDismissedOffline: false,
  setOnline: (isOnline) => 
    set((state) => (state.isOnline === isOnline ? state : { 
      isOnline, 
      userDismissedOffline: isOnline ? false : state.userDismissedOffline,
      networkQuality: isOnline ? state.networkQuality : "offline"
    })),
  setNetworkQuality: (networkQuality) =>
    set((state) => (state.networkQuality === networkQuality ? state : { networkQuality })),
  setConnectionStatus: (connectionStatus) => 
    set((state) => (state.connectionStatus === connectionStatus ? state : { connectionStatus })),
  setConnectionMode: (connectionMode) => 
    set((state) => (state.connectionMode === connectionMode ? state : { connectionMode })),
  setSyncing: (isSyncing) => 
    set((state) => (state.isSyncing === isSyncing ? state : { isSyncing })),
  dismissOfflineModal: () => set({ userDismissedOffline: true }),
}));

// ─── AI Agent Store ───────────────────────────────────────────────────────────
export interface AIMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'error';
}

export interface AIAgentState {
  // Panel visibility
  isOpen: boolean;
  isMinimizedPanel: boolean;
  // Draggable FAB position (persisted)
  fabPosition: { x: number; y: number } | null;
  // Sidebar mode
  sidebarMode: 'docked' | 'floating';
  // Chat session (NOT persisted)
  sessionId: string;
  messages: AIMessage[];
  isThinking: boolean;
  // Actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  minimizePanel: (v: boolean) => void;
  setFabPosition: (pos: { x: number; y: number }) => void;
  setSidebarMode: (mode: 'docked' | 'floating') => void;
  addMessage: (msg: AIMessage) => void;
  updateMessageStatus: (id: string, status: AIMessage['status'], content?: string) => void;
  setThinking: (v: boolean) => void;
  clearSession: () => void;
}

export const useAIAgentStore = create<AIAgentState>()(
  persist(
    (set) => ({
      isOpen: false,
      isMinimizedPanel: false,
      fabPosition: null,
      sidebarMode: 'docked',
      sessionId: crypto.randomUUID(),
      messages: [],
      isThinking: false,
      togglePanel: () => set((s) => ({ isOpen: !s.isOpen, isMinimizedPanel: false })),
      openPanel: () => set({ isOpen: true, isMinimizedPanel: false }),
      closePanel: () => set({ isOpen: false, isMinimizedPanel: false }),
      minimizePanel: (v) => set({ isMinimizedPanel: v }),
      setFabPosition: (fabPosition) => set({ fabPosition }),
      setSidebarMode: (sidebarMode) => set({ sidebarMode }),
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      updateMessageStatus: (id, status, content) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, status, ...(content !== undefined ? { content } : {}) } : m
          ),
        })),
      setThinking: (isThinking) => set({ isThinking }),
      clearSession: () => set({ messages: [], sessionId: crypto.randomUUID(), isThinking: false }),
    }),
    {
      name: 'sf-ai-agent-storage',
      partialize: (s) => ({
        fabPosition: s.fabPosition,
        sidebarMode: s.sidebarMode,
        isOpen: s.isOpen,
      }),
    }
  )
);

