import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X, RotateCcw, Zap } from "lucide-react";
import { useRoastLines } from "../../queries/useEntertainmentQueries";
import { useAuthStore } from "../../store/stores";

const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ROASTS_PER_SESSION = 5;
const STORAGE_KEY = "sf_roaster_settings";

/**
 * ProcrastinationRoaster — Global overlay that detects idle time
 * and delivers witty, encouraging roasts.
 * 
 * Enabled by default. User can disable from the character's menu.
 * Does NOT trigger during attendance wizard or when disabled.
 */
const ProcrastinationRoaster: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const { data: roastLines } = useRoastLines("idle");

  const [visible, setVisible] = useState(false);
  const [currentRoast, setCurrentRoast] = useState<string | null>(null);
  const [roastCount, setRoastCount] = useState(0);
  const [enabled, setEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).enabled !== false : true;
    } catch {
      return true;
    }
  });

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usedIndicesRef = useRef<Set<number>>(new Set());

  // Persist enabled state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled }));
  }, [enabled]);

  // Pick a random roast line (avoid repeats within session)
  const pickRoast = useCallback(() => {
    if (!roastLines || roastLines.length === 0) return null;
    const available = roastLines
      .map((_, i) => i)
      .filter((i) => !usedIndicesRef.current.has(i));

    if (available.length === 0) {
      // Reset pool if exhausted
      usedIndicesRef.current.clear();
      return roastLines[Math.floor(Math.random() * roastLines.length)].text;
    }

    const idx = available[Math.floor(Math.random() * available.length)];
    usedIndicesRef.current.add(idx);
    return roastLines[idx].text;
  }, [roastLines]);

  // Reset idle timer on user activity
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // Don't trigger if disabled, already showing, max reached, or not logged in
    if (!enabled || visible || roastCount >= MAX_ROASTS_PER_SESSION || !token) return;

    // Don't trigger on attendance page
    if (window.location.pathname.includes("/attendance")) return;

    idleTimerRef.current = setTimeout(() => {
      const roast = pickRoast();
      if (roast) {
        setCurrentRoast(roast);
        setVisible(true);
        setRoastCount((c) => c + 1);
      }
    }, IDLE_THRESHOLD_MS);
  }, [enabled, visible, roastCount, token, pickRoast]);

  // Attach activity listeners
  useEffect(() => {
    if (!enabled || !token) return;

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // Start initial timer

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [enabled, token, resetIdleTimer]);

  const handleDismiss = () => {
    setVisible(false);
    setCurrentRoast(null);
    // Restart idle timer after dismiss
    setTimeout(resetIdleTimer, 1000);
  };

  const handleRoastMore = () => {
    if (roastCount >= MAX_ROASTS_PER_SESSION) {
      setCurrentRoast("Okay okay, I'll leave you alone now. Go study! 📖");
      setTimeout(() => {
        setVisible(false);
        setCurrentRoast(null);
      }, 3000);
      return;
    }
    const roast = pickRoast();
    if (roast) {
      setCurrentRoast(roast);
      setRoastCount((c) => c + 1);
    }
  };

  // Don't render if not logged in
  if (!token) return null;

  return (
    <>
      {/* Settings toggle (tiny, bottom-left corner) */}
      <button
        onClick={() => setEnabled(!enabled)}
        className="fixed bottom-4 left-4 z-40 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-600 hover:text-orange-400 transition-colors group"
        title={enabled ? "Disable Roaster" : "Enable Roaster"}
      >
        <Flame className={`w-3.5 h-3.5 transition-colors ${enabled ? "text-orange-400" : "text-slate-600"}`} />
      </button>

      {/* Roast overlay */}
      <AnimatePresence>
        {visible && currentRoast && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-20 right-4 z-50 max-w-xs"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-5 shadow-2xl shadow-orange-500/5">
              {/* Character avatar */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold text-orange-400">Roast Master</p>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400/70 font-bold uppercase tracking-widest">
                      {roastCount}/{MAX_ROASTS_PER_SESSION}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{currentRoast}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15 transition-all"
                >
                  <Zap className="w-3 h-3" />
                  I'm back!
                </button>
                <button
                  onClick={handleRoastMore}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400 hover:bg-orange-500/15 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Roast me more
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProcrastinationRoaster;
