import { create } from "zustand";

// ═══════════════════════════════════════════════════════════
// Adaptive Presence Resolution Layer (APRL)
// ═══════════════════════════════════════════════════════════
//
// SOURCE 1 — Server Signals (HIGHEST PRIORITY)
//   SignalR: UserOnline / UserOffline / BulkPresence
//   Heartbeat acknowledgements
//
// SOURCE 2 — Client Behavior Signals (MEDIUM PRIORITY)
//   visibilitychange, window focus/blur, navigator.onLine
//   Inactivity timer (idle detection)
//
// SOURCE 3 — System Heuristics (LOW PRIORITY)
//   Reconnect frequency, websocket instability patterns
//   Last-seen timestamps, server event recency
//
// RESOLUTION: Server overrides when fresh (<30s).
//             Hybrid confidence blending when stale.
//             Client inference when server is unavailable.
// ═══════════════════════════════════════════════════════════

export type PresenceStatus = "online" | "offline" | "away" | "unknown";
export type PresenceSource = "server" | "hybrid" | "client";

export interface UserPresence {
  status: PresenceStatus;
  confidence: number; // 0.0 → 1.0
  source: PresenceSource;
  lastSeen: number; // timestamp ms
}

// ── Heuristic Tracking (Layer 3) ─────────────────────────
interface HeuristicState {
  /** Per-user last-seen timestamps (persisted across resolution cycles) */
  lastSeenMap: Map<string, number>;
  /** Number of reconnects in the last 5 minutes */
  reconnectCount: number;
  /** Timestamp of last reconnect */
  lastReconnectAt: number;
  /** Rolling websocket stability score: 1.0 = stable, 0 = unstable */
  wsStability: number;
}

interface PresenceState extends HeuristicState {
  // ── Source 1: Server Signals (Highest Priority) ────
  /** Server-authoritative online set */
  serverOnline: Set<string>;
  /** Server-authoritative away set */
  serverAway: Set<string>;
  /** Whether the server presence channel is healthy */
  serverHealthy: boolean;
  /** Last time we received a server presence event */
  lastServerEvent: number;

  setServerOnline: (userId: string) => void;
  setServerOffline: (userId: string) => void;
  setServerAway: (userId: string) => void;
  setBulkServerOnline: (userIds: string[]) => void;
  setServerHealth: (healthy: boolean) => void;

  // ── Source 2: Client Behavior Signals (Medium) ─────
  /** Client-inferred online set */
  clientOnline: Set<string>;
  /** Current user's own client-detected status */
  selfStatus: "active" | "idle" | "hidden" | "offline";

  setClientOnline: (userId: string) => void;
  setClientOffline: (userId: string) => void;
  setSelfStatus: (status: "active" | "idle" | "hidden" | "offline") => void;

  // ── Source 3: Heuristic Triggers ───────────────────
  /** Record a reconnection event (for instability tracking) */
  recordReconnect: () => void;
  /** Update websocket stability score */
  updateWsStability: (stable: boolean) => void;

  // ── Adaptive Resolver ──────────────────────────────
  /** Resolve a single user's presence */
  getPresence: (userId: string) => UserPresence;
  /** Check if a user is online (simplified boolean) */
  isOnline: (userId: string) => boolean;
  /** [Future API] Get all online user IDs (resolved) */
  getOnlineUserIds: () => string[];
  /** Count of currently online users from a given set */
  countOnline: (userIds: string[]) => number;

  // ── Reconciliation ─────────────────────────────────
  /** [Future API] Merge server snapshot with local state (timestamp priority) */
  reconcile: (serverSnapshot: { userId: string; isOnline: boolean; lastSeen: number }[]) => void;
}

// ── Constants ────────────────────────────────────────────
const SERVER_FRESH_MS = 30_000;    // <30s = server is authoritative
const SERVER_STALE_MS = 90_000;    // 30-90s = hybrid mode
const RECONNECT_WINDOW_MS = 300_000; // 5 min window for reconnect frequency
const LAST_SEEN_RECENCY_MS = 120_000; // 2 min = "recently seen" heuristic

// ── Adaptive Resolution Algorithm ────────────────────────
function resolvePresence(
  userId: string,
  serverOnline: Set<string>,
  serverAway: Set<string>,
  clientOnline: Set<string>,
  serverHealthy: boolean,
  lastServerEvent: number,
  heuristics: { lastSeenMap: Map<string, number>; wsStability: number; reconnectCount: number }
): UserPresence {
  const now = Date.now();
  const serverAge = now - lastServerEvent;
  const userLastSeen = heuristics.lastSeenMap.get(userId) || 0;
  const lastSeenAge = now - userLastSeen;

  // ── SOURCE 1: Server is fresh (<30s) — AUTHORITATIVE ──
  if (serverHealthy && serverAge < SERVER_FRESH_MS) {
    const isOn = serverOnline.has(userId);
    const isAway = serverAway.has(userId);
    return {
      status: isOn ? "online" : isAway ? "away" : "offline",
      confidence: 1.0,
      source: "server",
      lastSeen: isOn || isAway ? now : userLastSeen,
    };
  }

  // ── HYBRID: Server healthy but stale (30-90s) ─────────
  if (serverHealthy && serverAge < SERVER_STALE_MS) {
    const serverSays = serverOnline.has(userId);
    const clientSays = clientOnline.has(userId);

    // Weight by websocket stability
    const stabilityBoost = heuristics.wsStability * 0.1;

    if (serverSays && clientSays) {
      return { status: "online", confidence: 0.85 + stabilityBoost, source: "hybrid", lastSeen: now };
    }
    if (serverSays && !clientSays) {
      // Server says online but no client signal — could be ghost
      // Check heuristic: was user recently seen?
      if (lastSeenAge < LAST_SEEN_RECENCY_MS) {
        return { status: "online", confidence: 0.6, source: "hybrid", lastSeen: userLastSeen };
      }
      return { status: "unknown", confidence: 0.4, source: "hybrid", lastSeen: userLastSeen };
    }
    if (!serverSays && clientSays) {
      // Client says online but server didn't confirm — weak signal
      return { status: "unknown", confidence: 0.35, source: "hybrid", lastSeen: now };
    }
    return { status: "offline", confidence: 0.7 + stabilityBoost, source: "hybrid", lastSeen: userLastSeen };
  }

  // ── SOURCE 2+3: Server down — Client + Heuristics ─────
  const clientSays = clientOnline.has(userId);

  // Heuristic boost: if user was recently seen AND client says online, raise confidence
  if (clientSays && lastSeenAge < LAST_SEEN_RECENCY_MS) {
    return { status: "online", confidence: 0.65, source: "client", lastSeen: now };
  }
  if (clientSays) {
    return { status: "online", confidence: 0.5, source: "client", lastSeen: now };
  }

  // Heuristic: recently seen but no client signal — maybe they just went away
  if (lastSeenAge < LAST_SEEN_RECENCY_MS) {
    return { status: "away", confidence: 0.4, source: "client", lastSeen: userLastSeen };
  }

  // No strong signal from any source
  return {
    status: "offline",
    confidence: 0.45,
    source: "client",
    lastSeen: userLastSeen,
  };
}

// ── Store ────────────────────────────────────────────────
export const usePresenceStore = create<PresenceState>((set, get) => ({
  // Source 1
  serverOnline: new Set<string>(),
  serverAway: new Set<string>(),
  serverHealthy: true, // Assume healthy until proven otherwise
  lastServerEvent: Date.now(), // Initialize to "now" so first snapshot is trusted (not stale)

  // Source 2
  clientOnline: new Set<string>(),
  selfStatus: "active",

  // Source 3 (Heuristics)
  lastSeenMap: new Map<string, number>(),
  reconnectCount: 0,
  lastReconnectAt: 0,
  wsStability: 1.0,

  // ── Source 1: Server Signals ────────────────────────
  setServerOnline: (userId) =>
    set((s) => {
      const isAlt = !s.serverOnline.has(userId);
      const now = Date.now();
      const needsMapUpdate = now - (s.lastSeenMap.get(userId) || 0) > 10000; // Only update map every 10s
      
      if (!isAlt && !needsMapUpdate) return s;

      const next = isAlt ? new Set(s.serverOnline).add(userId) : s.serverOnline;
      const lsm = needsMapUpdate ? new Map(s.lastSeenMap).set(userId, now) : s.lastSeenMap;
      
      return { 
        serverOnline: next, 
        lastServerEvent: now, 
        serverHealthy: true, 
        lastSeenMap: lsm 
      };
    }),

  setServerOffline: (userId) =>
    set((s) => {
      const hadOnline = s.serverOnline.has(userId);
      const hadAway = s.serverAway.has(userId);
      if (!hadOnline && !hadAway) return s;
      const nextOnline = hadOnline ? (() => { const n = new Set(s.serverOnline); n.delete(userId); return n; })() : s.serverOnline;
      const nextAway = hadAway ? (() => { const n = new Set(s.serverAway); n.delete(userId); return n; })() : s.serverAway;
      return { serverOnline: nextOnline, serverAway: nextAway, lastServerEvent: Date.now(), serverHealthy: true };
    }),

  setServerAway: (userId) =>
    set((s) => {
      const now = Date.now();
      const nextOnline = new Set(s.serverOnline);
      nextOnline.delete(userId); // Remove from online if present
      const nextAway = new Set(s.serverAway).add(userId);
      const lsm = new Map(s.lastSeenMap).set(userId, now);
      return { serverOnline: nextOnline, serverAway: nextAway, lastServerEvent: now, serverHealthy: true, lastSeenMap: lsm };
    }),
  setBulkServerOnline: (userIds) =>
    set((s) => {
      const now = Date.now();
      const nextOnline = new Set(s.serverOnline);
      const lsm = new Map(s.lastSeenMap);
      for (const uid of userIds) {
        nextOnline.add(uid);
        lsm.set(uid, now);
      }
      return {
        serverOnline: nextOnline,
        lastServerEvent: now,
        serverHealthy: true,
        lastSeenMap: lsm,
      };
    }),

  setServerHealth: (healthy) =>
    set(() => ({ serverHealthy: healthy })),

  // ── Source 2: Client Signals ────────────────────────
  setClientOnline: (userId) =>
    set((s) => {
      const isAlt = !s.clientOnline.has(userId);
      const now = Date.now();
      const needsMapUpdate = now - (s.lastSeenMap.get(userId) || 0) > 10000;
      
      if (!isAlt && !needsMapUpdate) return s;

      const next = isAlt ? new Set(s.clientOnline).add(userId) : s.clientOnline;
      const lsm = needsMapUpdate ? new Map(s.lastSeenMap).set(userId, now) : s.lastSeenMap;
      
      return { clientOnline: next, lastSeenMap: lsm };
    }),

  setClientOffline: (userId) =>
    set((s) => {
      const next = new Set(s.clientOnline);
      next.delete(userId);
      return { clientOnline: next };
    }),

  setSelfStatus: (status) => 
    set((s) => (s.selfStatus === status ? s : { selfStatus: status })),

  // ── Source 3: Heuristic Triggers ───────────────────
  recordReconnect: () =>
    set((s) => {
      const now = Date.now();
      // Decay old reconnects outside the 5-min window
      const count = (now - s.lastReconnectAt < RECONNECT_WINDOW_MS)
        ? s.reconnectCount + 1
        : 1;
      // High reconnect frequency → lower stability
      const stability = Math.max(0, 1.0 - (count * 0.15));
      return { reconnectCount: count, lastReconnectAt: now, wsStability: stability };
    }),

  updateWsStability: (stable) =>
    set((s) => ({
      // Exponential moving average
      wsStability: s.wsStability * 0.8 + (stable ? 0.2 : 0),
    })),



  // ── Adaptive Resolver ──────────────────────────────
  getPresence: (userId) => {
    const { serverOnline, serverAway, clientOnline, serverHealthy, lastServerEvent, lastSeenMap, wsStability, reconnectCount } = get();
    return resolvePresence(userId, serverOnline, serverAway, clientOnline, serverHealthy, lastServerEvent, {
      lastSeenMap, wsStability, reconnectCount,
    });
  },

  isOnline: (userId) => {
    const p = get().getPresence(userId);
    return p.status === "online" || (p.status === "unknown" && p.confidence >= 0.5);
  },

  getOnlineUserIds: () => {
    const { serverOnline, clientOnline, serverHealthy, lastServerEvent } = get();
    const serverAge = Date.now() - lastServerEvent;

    // Fast path: server is authoritative
    if (serverHealthy && serverAge < SERVER_FRESH_MS) {
      return Array.from(serverOnline);
    }

    // Merge both sets for hybrid/client mode
    const merged = new Set([...serverOnline, ...clientOnline]);
    return Array.from(merged);
  },

  countOnline: (userIds) => {
    const { isOnline } = get();
    return userIds.filter(isOnline).length;
  },

  // ── Reconciliation Engine ──────────────────────────
  reconcile: (serverSnapshot) =>
    set((s) => {
      const next = new Set<string>();
      const lsm = new Map(s.lastSeenMap);
      const now = Date.now();

      for (const entry of serverSnapshot) {
        // Server timestamp priority: always trust server state
        if (entry.isOnline) {
          next.add(entry.userId);
        }
        // Update last-seen: use max(server timestamp, local timestamp)
        const localLastSeen = lsm.get(entry.userId) || 0;
        lsm.set(entry.userId, Math.max(entry.lastSeen, localLastSeen));
      }

      return {
        serverOnline: next,
        lastServerEvent: now,
        serverHealthy: true,
        lastSeenMap: lsm,
      };
    }),
}));
