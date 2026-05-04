import React, { useEffect, useState } from "react";
import { Flame, Trophy, Crown, Star, Zap, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useStudentStreak } from "../../queries/usePhase4Queries";
import { useSignalR } from "../../providers/SignalRProvider";
import { Events } from "../../lib/eventContracts";

interface StreakCounterProps {
  studentId: string;
}

const MILESTONE_ICONS: Record<number, { icon: React.ElementType; color: string }> = {
  7:  { icon: Flame,  color: "#f59e0b" },
  14: { icon: Star,   color: "#3b82f6" },
  30: { icon: Trophy,  color: "#8b5cf6" },
  60: { icon: Crown,   color: "#ec4899" },
  90: { icon: Zap,    color: "#22c55e" },
};

export const StreakCounter: React.FC<StreakCounterProps> = ({ studentId }) => {
  const { data, isLoading } = useStudentStreak(studentId);
  const { on } = useSignalR();
  const [showAchievement, setShowAchievement] = useState<{ milestone: number; badge: string; walletBonus: number } | null>(null);

  // Listen for streak achievement
  useEffect(() => {
    const unsub = on(Events.STREAK_ACHIEVED, (payload: any) => {
      if (payload?.studentId === studentId) {
        setShowAchievement({ milestone: payload.milestone, badge: payload.badge, walletBonus: payload.walletBonus });
      }
    });
    return () => unsub?.();
  }, [on, studentId]);

  if (isLoading || !data) return null;
  const { currentStreak, longestStreak, badges, nextMilestone } = data;

  // Flame intensity
  const flameScale = Math.min(1 + currentStreak / 30, 1.8);
  const flameColor = currentStreak >= 30 ? "#ef4444" : currentStreak >= 14 ? "#f59e0b" : currentStreak >= 7 ? "#f97316" : "#6b7280";

  return (
    <>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl border bg-gradient-to-r from-amber-500/5 to-transparent border-amber-500/10"
      >
        {/* Flame Icon */}
        <motion.div
          animate={{ scale: [flameScale, flameScale * 1.1, flameScale] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <Flame className="w-7 h-7" style={{ color: flameColor, filter: `drop-shadow(0 0 8px ${flameColor}50)` }} />
        </motion.div>

        {/* Streak Number */}
        <div>
          <p className="text-2xl font-black text-white tabular-nums leading-none">{currentStreak}</p>
          <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Day Streak</p>
        </div>

        {/* Separator */}
        <div className="w-px h-10 bg-white/5" />

        {/* Stats */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Trophy className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Best: {longestStreak}d</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-2.5 h-2.5 text-purple-400" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Next: {nextMilestone}d</span>
          </div>
        </div>

        {/* Badge Icons */}
        {badges.length > 0 && (
          <>
            <div className="w-px h-10 bg-white/5" />
            <div className="flex gap-1">
              {badges.slice(-4).map((b, idx) => {
                const mKey = parseInt(b.type) || 7;
                const cfg = MILESTONE_ICONS[mKey] || MILESTONE_ICONS[7];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border"
                    style={{ backgroundColor: cfg.color + "15", borderColor: cfg.color + "30" }}
                    title={`${b.type}-day streak achieved`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>

      {/* Achievement Modal */}
      <AchievementModal
        achievement={showAchievement}
        onClose={() => setShowAchievement(null)}
      />
    </>
  );
};

// ── Achievement Modal ───────────────────────────────────────
const AchievementModal: React.FC<{
  achievement: { milestone: number; badge: string; walletBonus: number } | null;
  onClose: () => void;
}> = ({ achievement, onClose }) => {
  if (!achievement) return null;

  const cfg = MILESTONE_ICONS[achievement.milestone] || MILESTONE_ICONS[7];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotateY: -180 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative w-80 p-8 rounded-3xl border bg-[var(--ui-sidebar-bg)] shadow-2xl text-center"
          style={{ borderColor: cfg.color + "30" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Confetti particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: (Math.random() - 0.5) * 300,
                y: (Math.random() - 0.5) * 300,
                opacity: 0,
                rotate: Math.random() * 720,
              }}
              transition={{ duration: 1.5 + Math.random(), delay: 0.3 }}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
              style={{ backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"][i % 5] }}
            />
          ))}

          {/* Badge */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: 2 }}
            className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center border-2"
            style={{ backgroundColor: cfg.color + "15", borderColor: cfg.color + "40" }}
          >
            <Icon className="w-10 h-10" style={{ color: cfg.color }} />
          </motion.div>

          <h2 className="text-lg font-black text-white uppercase tracking-widest mb-2">
            🎉 {achievement.milestone}-Day Streak!
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
            Incredible consistency! You've earned a badge.
          </p>

          {achievement.walletBonus > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
              <span className="text-sm font-black text-emerald-400">+{achievement.walletBonus} EGP</span>
              <span className="text-[8px] font-bold text-emerald-400/70 uppercase tracking-widest">Bonus Credited</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Awesome!
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StreakCounter;
