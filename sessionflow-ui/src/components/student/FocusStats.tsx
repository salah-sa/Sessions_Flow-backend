import React from "react";
import { Timer } from "lucide-react";
import { motion } from "framer-motion";
import { useFocusStats } from "../../queries/usePhase4Queries";

interface FocusStatsProps {
  studentId: string;
  range?: string;
}

export const FocusStats: React.FC<FocusStatsProps> = ({ studentId, range = "7d" }) => {
  const { data, isLoading } = useFocusStats(studentId, range);

  if (isLoading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const maxMinutes = Math.max(...(data.dailyBreakdown || []).map(d => d.minutes), 1);

  return (
    <div className="p-5 rounded-2xl border border-white/5 bg-black/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Timer className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Focus Stats</h4>
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{range} overview</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-lg font-black text-white tabular-nums">{data.totalMinutes}m</p>
            <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Total</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-purple-400 tabular-nums">{data.sessions}</p>
            <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Sessions</p>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Chart */}
      <div className="flex items-end gap-1.5 h-24">
        {(data.dailyBreakdown || []).map((day, idx) => {
          const height = (day.minutes / maxMinutes) * 100;
          const dayLabel = new Date(day.date).toLocaleDateString(undefined, { weekday: "short" });
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: idx * 0.06 }}
                className="w-full rounded-t-lg bg-gradient-to-t from-purple-500/20 to-purple-500/40 min-h-[2px]"
                title={`${day.minutes}m`}
              />
              <span className="text-[7px] font-black text-slate-700 uppercase">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FocusStats;
