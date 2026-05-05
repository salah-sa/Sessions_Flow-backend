import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from "lucide-react";
import { useAttendanceHeatmap } from "../../queries/useAttendanceHeatmapQuery";
import { type HeatmapDay } from "../../api/newFeatures";
import { cn } from "../../lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Map rate (0–100) → intensity bucket (0–4) */
const getIntensity = (rate: number): number => {
  if (rate === 0) return 0;
  if (rate < 40) return 1;
  if (rate < 70) return 2;
  if (rate < 90) return 3;
  return 4;
};

const INTENSITY_COLORS = [
  "bg-white/[0.04] border-white/5",     // 0 — no data / 0%
  "bg-rose-500/20 border-rose-500/30",   // 1 — poor (<40%)
  "bg-amber-500/20 border-amber-500/30", // 2 — medium (40–69%)
  "bg-emerald-500/25 border-emerald-500/30", // 3 — good (70–89%)
  "bg-emerald-500/50 border-emerald-500/40", // 4 — excellent (90–100%)
];

interface AttendanceHeatmapProps {
  className?: string;
}

const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({ className }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const { data: heatmapData, isLoading } = useAttendanceHeatmap(year, month);

  // Build date → data lookup
  const dayMap = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    heatmapData?.forEach(d => map.set(d.date, d));
    return map;
  }, [heatmapData]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days: { date: string; dayNum: number; inMonth: boolean }[] = [];

    // Padding before month starts
    for (let i = 0; i < startPad; i++) {
      days.push({ date: "", dayNum: 0, inMonth: false });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, dayNum: d, inMonth: true });
    }

    return days;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <div className={cn("rounded-2xl border border-white/5 bg-[var(--ui-sidebar-bg)]/60 backdrop-blur-xl p-5 sm:p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Attendance Heatmap</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              isCurrentMonth
                ? "text-slate-700 cursor-not-allowed"
                : "text-slate-500 hover:text-white hover:bg-white/5"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_SHORT.map(d => (
          <div key={d} className="text-center text-[8px] font-bold text-slate-600 uppercase tracking-widest py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarDays.map((day, idx) => {
            if (!day.inMonth) {
              return <div key={`pad-${idx}`} className="aspect-square sm:aspect-[4/3]" />;
            }

            const data = dayMap.get(day.date);
            const intensity = data ? getIntensity(data.rate) : 0;
            const isToday = day.date === todayStr;
            const isHovered = hoveredDay === day.date;

            return (
              <motion.div
                key={day.date}
                className={cn(
                  "aspect-square sm:aspect-[4/3] rounded-lg border flex items-center justify-center relative cursor-default transition-all duration-200",
                  INTENSITY_COLORS[intensity],
                  isToday && "ring-2 ring-[var(--ui-accent)] shadow-[0_0_12px_rgba(var(--ui-accent-rgb),0.35)]",
                  isHovered && "scale-110 z-10"
                )}
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.008, duration: 0.2 }}
              >
                <span className={cn(
                  "text-[10px] sm:text-xs font-bold tabular-nums",
                  isToday ? "text-[var(--ui-accent)]" : intensity >= 3 ? "text-emerald-300" : intensity >= 1 ? "text-white/60" : "text-slate-600"
                )}>
                  {day.dayNum}
                </span>

                {/* Today pulsing dot */}
                {isToday && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--ui-accent)] animate-pulse" />
                )}

                {/* Hover tooltip */}
                <AnimatePresence>
                  {isHovered && data && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-50 pointer-events-none"
                    >
                      <div className="px-3 py-2.5 rounded-xl bg-[#0c0c14] border border-white/10 shadow-2xl whitespace-nowrap">
                        <p className="text-[9px] font-bold text-white mb-1">{day.date}</p>
                        <div className="flex items-center gap-3 text-[8px]">
                          <span className="text-emerald-400 font-bold">✓ {data.presentCount}</span>
                          <span className="text-rose-400 font-bold">✗ {data.absentCount}</span>
                          <span className={cn(
                            "font-black",
                            data.rate >= 90 ? "text-emerald-300" : data.rate >= 70 ? "text-amber-400" : "text-rose-400"
                          )}>
                            {data.rate}%
                          </span>
                        </div>
                        <p className="text-[7px] text-slate-500 mt-0.5">{data.sessionCount} session{data.sessionCount !== 1 ? "s" : ""}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty month message */}
      {!isLoading && heatmapData?.length === 0 && (
        <div className="flex items-center justify-center py-4 mt-2">
          <p className="text-[10px] font-medium text-slate-600 italic">
            No attendance records for {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-white/5 flex-wrap">
        <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest mr-0.5">Less</span>
        {[
          { cls: INTENSITY_COLORS[0], label: "None" },
          { cls: INTENSITY_COLORS[1], label: "Poor" },
          { cls: INTENSITY_COLORS[2], label: "OK" },
          { cls: INTENSITY_COLORS[3], label: "Good" },
          { cls: INTENSITY_COLORS[4], label: "Great" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded-sm border", item.cls)} />
            <span className="text-[6px] font-bold text-slate-600 uppercase tracking-wider hidden sm:inline">{item.label}</span>
          </div>
        ))}
        <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest ml-0.5">More</span>
      </div>
    </div>
  );
};

export default AttendanceHeatmap;
