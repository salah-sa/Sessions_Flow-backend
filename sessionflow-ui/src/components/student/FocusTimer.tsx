import React, { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw, Settings, Coffee, Brain, X, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Draggable from "react-draggable";
import { cn } from "../../lib/utils";
import { useFocusTimerStore, type FocusMode } from "../../store/focusTimerStore";
import { useSoundZone } from "../../providers/SoundZoneProvider";
import { useFocusMutations } from "../../queries/usePhase4Queries";

const MODE_CONFIG: Record<FocusMode, { label: string; color: string; icon: React.ElementType; bgGradient: string }> = {
  focus: { label: "Focus", color: "#8b5cf6", icon: Brain, bgGradient: "from-purple-500/10 to-transparent" },
  break: { label: "Break", color: "#22c55e", icon: Coffee, bgGradient: "from-emerald-500/10 to-transparent" },
  idle:  { label: "Ready", color: "#64748b", icon: Timer, bgGradient: "from-slate-500/5 to-transparent" },
};

export const FocusTimer: React.FC = () => {
  const store = useFocusTimerStore();
  const { playOneShot } = useSoundZone();
  const { startFocus, completeFocus } = useFocusMutations();
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const prevModeRef = useRef(store.mode);

  // Tick loop
  useEffect(() => {
    if (store.isActive) {
      tickRef.current = setInterval(() => store.tick(), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [store.isActive]);

  // Mode change sound
  useEffect(() => {
    if (prevModeRef.current !== store.mode) {
      if (store.mode === "break") {
        playOneShot("chime");
        completeFocus.mutate({ focusMinutes: store.focusDuration, breakMinutes: store.breakDuration });
      }
      if (store.mode === "focus" && prevModeRef.current !== "idle") {
        playOneShot("ding");
      }
      prevModeRef.current = store.mode;
    }
  }, [store.mode]);

  // Start API call
  const handleStart = () => {
    store.start();
    if (store.mode === "idle") {
      startFocus.mutate(store.focusDuration);
    }
    playOneShot("click");
  };

  const cfg = MODE_CONFIG[store.mode];
  const Icon = cfg.icon;
  const minutes = Math.floor(store.remaining / 60);
  const seconds = store.remaining % 60;
  const progress = store.mode === "focus"
    ? 1 - (store.remaining / (store.focusDuration * 60))
    : store.mode === "break"
      ? 1 - (store.remaining / (store.breakDuration * 60))
      : 0;

  // ── Minimized Pill ────────────────────────────────────────
  if (isMinimized) {
    return (
      <Draggable bounds="parent" handle=".drag-handle">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-6 right-6 z-[100]"
        >
          <button
            onClick={() => setIsMinimized(false)}
            className="drag-handle flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-xl cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: cfg.color + "10", borderColor: cfg.color + "30" }}
          >
            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
            <span className="text-sm font-black tabular-nums text-white">
              {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </span>
            {store.isActive && <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cfg.color }} />}
          </button>
        </motion.div>
      </Draggable>
    );
  }

  // ── Full Widget ───────────────────────────────────────────
  return (
    <Draggable bounds="parent" handle=".drag-handle">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("fixed bottom-6 right-6 z-[100] w-72 rounded-3xl border shadow-2xl backdrop-blur-xl overflow-hidden bg-gradient-to-br", cfg.bgGradient)}
        style={{ borderColor: cfg.color + "20", backgroundColor: "var(--ui-sidebar-bg)" }}
      >
        {/* Header */}
        <div className="drag-handle px-5 py-3 border-b border-white/5 flex items-center justify-between cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
              {cfg.label} Mode
            </span>
            <Crown className="w-3 h-3 text-amber-400" />
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowSettings(!showSettings)} className="w-6 h-6 rounded-md bg-white/[0.03] flex items-center justify-center text-slate-600 hover:text-white transition-all">
              <Settings className="w-3 h-3" />
            </button>
            <button onClick={() => setIsMinimized(true)} className="w-6 h-6 rounded-md bg-white/[0.03] flex items-center justify-center text-slate-600 hover:text-white transition-all">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="px-5 py-6 flex flex-col items-center">
          {/* Circular Progress */}
          <div className="relative w-36 h-36 mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke={cfg.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${progress * 283} ${283 - progress * 283}`}
                className="transition-all duration-1000"
                style={{ filter: `drop-shadow(0 0 6px ${cfg.color}40)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white tabular-nums leading-none">
                {minutes.toString().padStart(2, "0")}
              </span>
              <span className="text-lg font-black tabular-nums leading-none" style={{ color: cfg.color + "80" }}>
                {seconds.toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button onClick={() => store.reset()}
              className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>

            <button onClick={store.isActive ? () => store.pause() : handleStart}
              className="w-14 h-14 rounded-2xl flex items-center justify-center border transition-all"
              style={{ backgroundColor: cfg.color + "15", borderColor: cfg.color + "30" }}
            >
              {store.isActive ? (
                <Pause className="w-6 h-6" style={{ color: cfg.color }} />
              ) : (
                <Play className="w-6 h-6 ml-0.5" style={{ color: cfg.color }} />
              )}
            </button>

            {store.mode === "focus" && !store.isActive && store.remaining < store.focusDuration * 60 && (
              <button onClick={() => store.switchToBreak()}
                className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all">
                <Coffee className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Session Stats */}
          <div className="flex items-center gap-4 mt-4">
            <div className="text-center">
              <p className="text-sm font-black text-white tabular-nums">{store.sessionsCompleted}</p>
              <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Sessions</p>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="text-center">
              <p className="text-sm font-black text-white tabular-nums">{store.totalFocusMinutes}m</p>
              <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Total</p>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-white/5"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Focus</span>
                  <div className="flex gap-1">
                    {[15, 25, 30, 45].map(m => (
                      <button key={m} onClick={() => store.setFocusDuration(m)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[9px] font-black border transition-all",
                          store.focusDuration === m
                            ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                            : "bg-white/[0.02] border-white/5 text-slate-600"
                        )}>
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Break</span>
                  <div className="flex gap-1">
                    {[5, 10, 15].map(m => (
                      <button key={m} onClick={() => store.setBreakDuration(m)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[9px] font-black border transition-all",
                          store.breakDuration === m
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-white/[0.02] border-white/5 text-slate-600"
                        )}>
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Draggable>
  );
};

export default FocusTimer;
