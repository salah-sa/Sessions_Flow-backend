import React from "react";
import { Flame, Medal, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useStreakLeaderboard } from "../../queries/usePhase4Queries";

interface StreakLeaderboardProps {
  groupId: string;
}

const RANK_STYLES: Record<number, { bg: string; text: string; border: string; icon: string }> = {
  1: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: "🥇" },
  2: { bg: "bg-slate-400/10", text: "text-slate-300", border: "border-slate-400/20", icon: "🥈" },
  3: { bg: "bg-amber-700/10", text: "text-amber-600", border: "border-amber-700/20", icon: "🥉" },
};

export const StreakLeaderboard: React.FC<StreakLeaderboardProps> = ({ groupId }) => {
  const { data, isLoading } = useStreakLeaderboard(groupId);

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const students = data?.students || [];

  if (students.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-white/5 bg-black/20">
        <Flame className="w-8 h-8 text-slate-700 mx-auto mb-3" />
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No active streaks</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Medal className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
            Streak Leaderboard
            <Crown className="w-3 h-3 text-amber-400" />
          </h4>
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{students.length} students</p>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-white/[0.03]">
        {students.map((student, idx) => {
          const rankStyle = RANK_STYLES[student.rank];
          const isTopThree = student.rank <= 3;

          return (
            <motion.div
              key={student.studentId}
              initial={{ x: 15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.01]",
                isTopThree && rankStyle?.bg
              )}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {isTopThree ? (
                  <span className="text-lg">{rankStyle?.icon}</span>
                ) : (
                  <span className="text-[11px] font-black text-slate-600 tabular-nums">#{student.rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className={cn(
                "w-9 h-9 rounded-xl border flex items-center justify-center text-[10px] font-black uppercase",
                isTopThree && rankStyle
                  ? `${rankStyle.border} ${rankStyle.text}`
                  : "border-white/5 text-slate-500"
              )}>
                {student.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[11px] font-bold uppercase tracking-wider truncate",
                  isTopThree ? "text-white" : "text-slate-400"
                )}>
                  {student.name}
                </p>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className={cn(
                  "text-sm font-black tabular-nums",
                  isTopThree ? (rankStyle?.text || "text-white") : "text-slate-400"
                )}>
                  {student.streak}
                </span>
                <span className="text-[7px] font-bold text-slate-700 uppercase">days</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default StreakLeaderboard;
