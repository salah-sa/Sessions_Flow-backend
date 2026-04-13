import { create } from "zustand";

/**
 * Adaptive Presence Resolution Layer (APRL) — Mobile Adaptation
 * No persistence required as presence is ephemeral.
 */

export type PresenceStatus = "online" | "offline" | "away" | "unknown";
export type PresenceSource = "server" | "hybrid" | "client";

export interface UserPresence {
  status: PresenceStatus;
  confidence: number; 
  source: PresenceSource;
  lastSeen: number; 
}

interface HeuristicState {
  lastSeenMap: Map<string, number>;
  reconnectCount: number;
  lastReconnectAt: number;
  wsStability: number;
}

interface PresenceState extends HeuristicState {
  serverOnline: Set<string>;
  serverHealthy: boolean;
  lastServerEvent: number;

  setServerOnline: (userId: string) => void;
  setServerOffline: (userId: string) => void;
  setBulkServerOnline: (userIds: string[]) => void;
  setServerHealth: (healthy: boolean) => void;

  clientOnline: Set<string>;
  selfStatus: "active" | "idle" | "hidden" | "offline";

  setClientOnline: (userId: string) => void;
  setClientOffline: (userId: string) => void;
  setSelfStatus: (status: "active" | "idle" | "hidden" | "offline") => void;

  recordReconnect: () => void;
  updateWsStability: (stable: boolean) => void;

  getPresence: (userId: string) => UserPresence;
  isOnline: (userId: string) => boolean;
  getOnlineUserIds: () => string[];
  countOnline: (userIds: string[]) => number;
  reconcile: (serverSnapshot: { userId: string; isOnline: boolean; lastSeen: number }[]) => void;
}

const SERVER_FRESH_MS = 30_000;
const SERVER_STALE_MS = 90_000;
const RECONNECT_WINDOW_MS = 300_000;
const LAST_SEEN_RECENCY_MS = 120_000;

function resolvePresence(
  userId: string,
  serverOnline: Set<string>,
  clientOnline: Set<string>,
  serverHealthy: boolean,
  lastServerEvent: number,
  heuristics: { lastSeenMap: Map<string, number>; wsStability: number; reconnectCount: number }
): UserPresence {
  const now = Date.now();
  const serverAge = now - lastServerEvent;
  const userLastSeen = heuristics.lastSeenMap.get(userId) || 0;
  const lastSeenAge = now - userLastSeen;

  if (serverHealthy && serverAge < SERVER_FRESH_MS) {
    const isOn = serverOnline.has(userId);
    return {
      status: isOn ? "online" : "offline",
      confidence: 1.0,
      source: "server",
      lastSeen: isOn ? now : userLastSeen,
    };
  }

  if (serverHealthy && serverAge < SERVER_STALE_MS) {
    const serverSays = serverOnline.has(userId);
    const clientSays = clientOnline.has(userId);
    const stabilityBoost = heuristics.wsStability * 0.1;

    if (serverSays && clientSays) return { status: "online", confidence: 0.85 + stabilityBoost, source: "hybrid", lastSeen: now };
    if (serverSays && !clientSays) {
      if (lastSeenAge < LAST_SEEN_RECENCY_MS) return { status: "online", confidence: 0.6, source: "hybrid", lastSeen: userLastSeen };
      return { status: "unknown", confidence: 0.4, source: "hybrid", lastSeen: userLastSeen };
    }
    if (!serverSays && clientSays) return { status: "unknown", confidence: 0.35, source: "hybrid", lastSeen: now };
    return { status: "offline", confidence: 0.7 + stabilityBoost, source: "hybrid", lastSeen: userLastSeen };
  }

  const clientSays = clientOnline.has(userId);
  if (clientSays && lastSeenAge < LAST_SEEN_RECENCY_MS) return { status: "online", confidence: 0.65, source: "client", lastSeen: now };
  if (clientSays) return { status: "online", confidence: 0.5, source: "client", lastSeen: now };
  if (lastSeenAge < LAST_SEEN_RECENCY_MS) return { status: "away", confidence: 0.4, source: "client", lastSeen: userLastSeen };

  return { status: "offline", confidence: 0.45, source: "client", lastSeen: userLastSeen };
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  serverOnline: new Set<string>(),
  serverHealthy: false,
  lastServerEvent: 0,
  clientOnline: new Set<string>(),
  selfStatus: "active",
  lastSeenMap: new Map<string, number>(),
  reconnectCount: 0,
  lastReconnectAt: 0,
  wsStability: 1.0,

  setServerOnline: (userId) => set((s) => {
    const isAlt = !s.serverOnline.has(userId);
    const now = Date.now();
    const needsMapUpdate = now - (s.lastSeenMap.get(userId) || 0) > 10000;
    if (!isAlt && !needsMapUpdate) return s;
    const next = isAlt ? new Set(s.serverOnline).add(userId) : s.serverOnline;
    const lsm = needsMapUpdate ? new Map(s.lastSeenMap).set(userId, now) : s.lastSeenMap;
    return { serverOnline: next, lastServerEvent: now, serverHealthy: true, lastSeenMap: lsm };
  }),

  setServerOffline: (userId) => set((s) => {
    if (!s.serverOnline.has(userId)) return s;
    const next = new Set(s.serverOnline);
    next.delete(userId);
    return { serverOnline: next, lastServerEvent: Date.now(), serverHealthy: true };
  }),

  setBulkServerOnline: (userIds) => set((s) => {
    const lsm = new Map(s.lastSeenMap);
    const now = Date.now();
    for (const uid of userIds) lsm.set(uid, now);
    return { serverOnline: new Set(userIds), lastServerEvent: now, serverHealthy: true, lastSeenMap: lsm };
  }),

  setServerHealth: (healthy) => set(() => ({ serverHealthy: healthy })),

  setClientOnline: (userId) => set((s) => {
    const isAlt = !s.clientOnline.has(userId);
    const now = Date.now();
    const needsMapUpdate = now - (s.lastSeenMap.get(userId) || 0) > 10000;
    if (!isAlt && !needsMapUpdate) return s;
    const next = isAlt ? new Set(s.clientOnline).add(userId) : s.clientOnline;
    const lsm = needsMapUpdate ? new Map(s.lastSeenMap).set(userId, now) : s.lastSeenMap;
    return { clientOnline: next, lastSeenMap: lsm };
  }),

  setClientOffline: (userId) => set((s) => {
    const next = new Set(s.clientOnline);
    next.delete(userId);
    return { clientOnline: next };
  }),

  setSelfStatus: (status) => set((s) => (s.selfStatus === status ? s : { selfStatus: status })),

  recordReconnect: () => set((s) => {
    const now = Date.now();
    const count = (now - s.lastReconnectAt < RECONNECT_WINDOW_MS) ? s.reconnectCount + 1 : 1;
    const stability = Math.max(0, 1.0 - (count * 0.15));
    return { reconnectCount: count, lastReconnectAt: now, wsStability: stability };
  }),

  updateWsStability: (stable) => set((s) => ({ wsStability: s.wsStability * 0.8 + (stable ? 0.2 : 0) })),

  getPresence: (userId) => resolvePresence(userId, get().serverOnline, get().clientOnline, get().serverHealthy, get().lastServerEvent, {
    lastSeenMap: get().lastSeenMap, wsStability: get().wsStability, reconnectCount: get().reconnectCount,
  }),

  isOnline: (userId) => {
    const p = get().getPresence(userId);
    return p.status === "online" || (p.status === "unknown" && p.confidence >= 0.5);
  },

  getOnlineUserIds: () => {
    const { serverOnline, clientOnline, serverHealthy, lastServerEvent } = get();
    if (serverHealthy && (Date.now() - lastServerEvent < SERVER_FRESH_MS)) return Array.from(serverOnline);
    return Array.from(new Set([...serverOnline, ...clientOnline]));
  },

  countOnline: (userIds) => get().getOnlineUserIds().filter(id => userIds.includes(id)).length,

  reconcile: (serverSnapshot) => set((s) => {
    const next = new Set<string>();
    const lsm = new Map(s.lastSeenMap);
    const now = Date.now();
    for (const entry of serverSnapshot) {
      if (entry.isOnline) next.add(entry.userId);
      lsm.set(entry.userId, Math.max(entry.lastSeen, lsm.get(entry.userId) || 0));
    }
    return { serverOnline: next, lastServerEvent: now, serverHealthy: true, lastSeenMap: lsm };
  }),
}));
