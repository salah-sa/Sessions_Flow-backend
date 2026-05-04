import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye } from "lucide-react";
import { cn } from "../../lib/utils";
import { useSignalR } from "../../providers/SignalRProvider";
import { Events } from "../../lib/eventContracts";
import { useAuthStore } from "../../store/stores";

// ── Types ────────────────────────────────────────────────────
interface CursorInfo {
  userId: string;
  userName: string;
  field: string;
  color: string;
  lastSeen: number;
}

interface CollabCursorsProps {
  entityType: string;
  entityId: string;
  children: React.ReactNode;
}

// Predefined distinct colors for collaborators
const COLLAB_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ec4899",
  "#8b5cf6", "#ef4444", "#06b6d4", "#f97316",
];

function hashColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

// ── CollabCursors Provider ──────────────────────────────────
export const CollabCursors: React.FC<CollabCursorsProps> = ({ entityType, entityId, children }) => {
  const { on, invoke } = useSignalR();
  const currentUser = useAuthStore(s => s.user);
  const [viewers, setViewers] = useState<Map<string, CursorInfo>>(new Map());

  // Join entity on mount
  useEffect(() => {
    invoke("JoinEntity", entityType, entityId).catch(() => {});
    return () => {
      invoke("LeaveEntity", entityType, entityId).catch(() => {});
    };
  }, [entityType, entityId, invoke]);

  // Listen for cursor events
  useEffect(() => {
    const unsubs = [
      on(Events.COLLAB_CURSOR, (data: CursorInfo) => {
        if (data.userId === currentUser?.id) return;
        setViewers(prev => {
          const next = new Map(prev);
          next.set(data.userId, { ...data, lastSeen: Date.now() });
          return next;
        });
      }),
      on(Events.COLLAB_VIEWER_JOINED, (data: { userId: string; userName: string }) => {
        if (data.userId === currentUser?.id) return;
        setViewers(prev => {
          const next = new Map(prev);
          next.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            field: "",
            color: hashColor(data.userId),
            lastSeen: Date.now(),
          });
          return next;
        });
      }),
      on(Events.COLLAB_VIEWER_LEFT, (data: { userId: string }) => {
        setViewers(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }),
    ];

    return () => unsubs.forEach(u => u?.());
  }, [on, currentUser]);

  // Cleanup stale viewers (>30s without update)
  useEffect(() => {
    const timer = setInterval(() => {
      setViewers(prev => {
        const next = new Map(prev);
        const now = Date.now();
        for (const [id, v] of next) {
          if (now - v.lastSeen > 30000) next.delete(id);
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Broadcast own field focus
  const broadcastFocus = useCallback((field: string) => {
    invoke("BroadcastCursor", entityType, entityId, field).catch(() => {});
  }, [entityType, entityId, invoke]);

  const viewerList = useMemo(() => Array.from(viewers.values()), [viewers]);

  return (
    <div className="relative">
      {/* Viewer Presence Bar */}
      <AnimatePresence>
        {viewerList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Also viewing:
            </span>
            <div className="flex items-center gap-1.5">
              {viewerList.map(v => (
                <motion.div
                  key={v.userId}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border"
                  style={{
                    backgroundColor: `${v.color}10`,
                    borderColor: `${v.color}30`,
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: v.color }}
                  />
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: v.color }}
                  >
                    {v.userName}
                  </span>
                  {v.field && (
                    <span className="text-[7px] text-slate-600 font-bold uppercase">
                      — {v.field}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wrapped Content */}
      <CollabContext.Provider value={{ broadcastFocus, viewers: viewerList }}>
        {children}
      </CollabContext.Provider>
    </div>
  );
};

// ── Context for child components ────────────────────────────
interface CollabContextValue {
  broadcastFocus: (field: string) => void;
  viewers: CursorInfo[];
}

const CollabContext = React.createContext<CollabContextValue>({
  broadcastFocus: () => {},
  viewers: [],
});

export const useCollabContext = () => React.useContext(CollabContext);

// ── CollabField wrapper ─────────────────────────────────────
export const CollabField: React.FC<{
  name: string;
  children: React.ReactNode;
  className?: string;
}> = ({ name, children, className }) => {
  const { broadcastFocus, viewers } = useCollabContext();
  const activeViewer = viewers.find(v => v.field === name);

  return (
    <div
      className={cn("relative transition-all duration-300", className)}
      onFocus={() => broadcastFocus(name)}
      style={activeViewer ? {
        boxShadow: `0 0 0 2px ${activeViewer.color}30`,
        borderRadius: "12px",
      } : undefined}
    >
      {children}
      <AnimatePresence>
        {activeViewer && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-6 left-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest z-50"
            style={{
              backgroundColor: activeViewer.color,
              color: "#000",
            }}
          >
            {activeViewer.userName} editing
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollabCursors;
