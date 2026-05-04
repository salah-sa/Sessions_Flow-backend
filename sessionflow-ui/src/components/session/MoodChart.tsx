import React, { useMemo, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useMoodSummary } from "../../queries/usePhase3Queries";
import { useSignalR } from "../../providers/SignalRProvider";
import { Events } from "../../lib/eventContracts";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../queries/keys";

interface MoodChartProps {
  sessionId: string;
}

const EMOJI_COLORS: Record<string, string> = {
  "😊": "#22c55e",
  "🙂": "#3b82f6",
  "😐": "#f59e0b",
  "😟": "#f97316",
  "😫": "#ef4444",
};

export const MoodChart: React.FC<MoodChartProps> = ({ sessionId }) => {
  const { data, isLoading } = useMoodSummary(sessionId);
  const { on } = useSignalR();
  const queryClient = useQueryClient();

  // Real-time mood update
  useEffect(() => {
    const unsub = on(Events.MOOD_SUBMITTED, (payload: any) => {
      if (payload?.sessionId === sessionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.moodPulse.summary(sessionId) });
      }
    });
    return () => unsub?.();
  }, [on, sessionId, queryClient]);

  if (isLoading || !data) return null;
  if (data.total === 0) {
    return (
      <div className="p-4 rounded-2xl border border-white/5 bg-black/20 text-center">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
          No mood votes yet
        </p>
      </div>
    );
  }

  const sortedBreakdown = [...data.breakdown].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sortedBreakdown.map(b => b.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl border border-white/5 bg-black/20 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">
              Mood Pulse
            </h4>
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
              {data.total} response{data.total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Donut Chart (CSS-based) */}
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {(() => {
              let cumulative = 0;
              return sortedBreakdown.map((item) => {
                const pct = item.percentage / 100;
                const dashArray = pct * 283; // 2πr where r≈45
                const dashOffset = cumulative * 283;
                cumulative += pct;
                const color = EMOJI_COLORS[item.emoji] || "#6b7280";

                return (
                  <circle
                    key={item.emoji}
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeDasharray={`${dashArray} ${283 - dashArray}`}
                    strokeDashoffset={-dashOffset}
                    className="transition-all duration-700 ease-out"
                    style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
                  />
                );
              });
            })()}
            {/* Inner circle for donut hole */}
            <circle cx="50" cy="50" r="35" fill="rgba(0,0,0,0.6)" />
          </svg>

          {/* Center total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black text-white tabular-nums">{data.total}</span>
            <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">votes</span>
          </div>
        </div>

        {/* Legend / Bars */}
        <div className="flex-1 space-y-2">
          {sortedBreakdown.map((item, idx) => {
            const color = EMOJI_COLORS[item.emoji] || "#6b7280";
            const barWidth = (item.count / maxCount) * 100;

            return (
              <motion.div
                key={item.emoji}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-center gap-2"
              >
                <span className="text-lg w-6 text-center">{item.emoji}</span>
                <div className="flex-1 h-5 bg-white/[0.02] rounded-lg overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                    className="h-full rounded-lg"
                    style={{ backgroundColor: color + "40" }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-400 tabular-nums">
                    {item.count} ({Math.round(item.percentage)}%)
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default MoodChart;
