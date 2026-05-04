import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, SkipForward, Clock, Zap, ChevronRight, Rewind } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "../../lib/utils";
import { useSessionReplay } from "../../queries/usePhase3Queries";
import type { ReplayEvent } from "../../api/newFeatures";

interface GhostReplayPlayerProps {
  sessionId: string;
}

const SPEED_OPTIONS = [1, 2, 4];

// ── Event Type Icons ────────────────────────────────────────
function getEventIcon(type: string) {
  switch (type.toLowerCase()) {
    case "attendance": return "📋";
    case "note": case "notes": return "📝";
    case "status": return "⚡";
    case "start": return "🟢";
    case "end": return "🔴";
    default: return "📌";
  }
}

export const GhostReplayPlayer: React.FC<GhostReplayPlayerProps> = ({ sessionId }) => {
  const { data, isLoading } = useSessionReplay(sessionId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const events = data?.events || [];

  // Playback logic
  useEffect(() => {
    if (!isPlaying || events.length === 0 || currentIdx >= events.length - 1) {
      setIsPlaying(false);
      return;
    }

    const current = new Date(events[currentIdx].timestamp).getTime();
    const next = new Date(events[currentIdx + 1].timestamp).getTime();
    const realDelay = Math.max(next - current, 500);
    const scaledDelay = realDelay / speed;

    timerRef.current = setTimeout(() => {
      setCurrentIdx(i => Math.min(i + 1, events.length - 1));
    }, Math.min(scaledDelay, 3000)); // Cap at 3s real-time

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIdx, speed, events]);

  const handlePlayPause = () => setIsPlaying(p => !p);
  const handleRewind = () => { setCurrentIdx(0); setIsPlaying(false); };
  const handleSpeedCycle = () => {
    setSpeed(s => {
      const idx = SPEED_OPTIONS.indexOf(s);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  };
  const handleScrub = (idx: number) => {
    setCurrentIdx(idx);
    setIsPlaying(false);
  };

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No replay events recorded</p>
      </div>
    );
  }

  const progress = events.length > 1 ? (currentIdx / (events.length - 1)) * 100 : 100;

  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
      {/* Event Timeline */}
      <div className="p-4 max-h-[360px] overflow-y-auto custom-scrollbar space-y-2">
        {events.map((evt, idx) => {
          const isActive = idx === currentIdx;
          const isPast = idx < currentIdx;

          return (
            <motion.div
              key={idx}
              onClick={() => handleScrub(idx)}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300",
                isActive
                  ? "bg-[var(--ui-accent)]/5 border-[var(--ui-accent)]/20 ring-1 ring-[var(--ui-accent)]/10 shadow-lg"
                  : isPast
                    ? "bg-white/[0.01] border-white/5 opacity-50"
                    : "bg-transparent border-transparent opacity-30 hover:opacity-60"
              )}
              animate={isActive ? { scale: 1.01 } : { scale: 1 }}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center gap-1 mt-1">
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 transition-all",
                  isActive ? "bg-[var(--ui-accent)] border-[var(--ui-accent)] shadow-glow" :
                  isPast ? "bg-white/20 border-white/20" : "bg-transparent border-white/10"
                )} />
                {idx < events.length - 1 && (
                  <div className={cn("w-px h-8", isPast ? "bg-white/10" : "bg-white/5")} />
                )}
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{getEventIcon(evt.type)}</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    isActive ? "text-[var(--ui-accent)]" : "text-slate-400"
                  )}>
                    {evt.type}
                  </span>
                  <span className="text-[8px] font-mono text-slate-600 tabular-nums">
                    {format(new Date(evt.timestamp), "HH:mm:ss")}
                  </span>
                </div>
                <p className={cn(
                  "text-[11px] font-medium leading-relaxed",
                  isActive ? "text-white" : "text-slate-500"
                )}>
                  {evt.description}
                </p>
                <p className="text-[9px] text-slate-600 mt-1 italic">{evt.actorName}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Scrub Bar */}
      <div className="px-4 pt-2 pb-1">
        <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            handleScrub(Math.round(pct * (events.length - 1)));
          }}
        >
          <motion.div
            className="absolute left-0 top-0 bottom-0 bg-[var(--ui-accent)] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-black/30">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRewind}
            className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all hover:bg-white/5"
          >
            <Rewind className="w-4 h-4" />
          </button>
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/20 transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={handleSpeedCycle}
            className="h-9 px-3 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all"
          >
            {speed}×
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-slate-600" />
          <span className="text-[9px] font-mono font-bold text-slate-500 tabular-nums">
            {currentIdx + 1} / {events.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GhostReplayPlayer;
