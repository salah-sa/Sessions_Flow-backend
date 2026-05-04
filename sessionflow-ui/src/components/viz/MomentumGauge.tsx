import React, { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useStudentMomentum } from "../../queries/usePhase3Queries";

interface MomentumGaugeProps {
  studentId: string;
  size?: "full" | "mini";
}

export const MomentumGauge: React.FC<MomentumGaugeProps> = ({ studentId, size = "full" }) => {
  const { data, isLoading } = useStudentMomentum(studentId);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!data) return;
    const target = data.score;
    let frame: number;
    let current = 0;
    const step = () => {
      current += (target - current) * 0.08;
      if (Math.abs(current - target) < 0.5) {
        setAnimatedScore(target);
        return;
      }
      setAnimatedScore(Math.round(current));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [data?.score]);

  if (isLoading || !data) {
    return (
      <div className={cn("flex items-center justify-center", size === "full" ? "h-48" : "h-12")}>
        <div className="w-6 h-6 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  const { score, trend, breakdown } = data;

  // Color zones
  const getColor = (s: number) => {
    if (s >= 70) return { stroke: "#22c55e", bg: "rgba(34,197,94,0.1)", text: "text-emerald-400", label: "Strong" };
    if (s >= 40) return { stroke: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "text-amber-400", label: "Average" };
    return { stroke: "#ef4444", bg: "rgba(239,68,68,0.1)", text: "text-rose-400", label: "At Risk" };
  };

  const colors = getColor(score);
  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
  const trendColor = trend === "improving" ? "text-emerald-400" : trend === "declining" ? "text-rose-400" : "text-slate-400";

  // ── Mini variant ──────────────────────────────────────────
  if (size === "mini") {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border"
          style={{ borderColor: colors.stroke, color: colors.stroke, backgroundColor: colors.bg }}
        >
          {score}
        </div>
        <TrendIcon className={cn("w-3 h-3", trendColor)} />
      </div>
    );
  }

  // ── Full SVG Gauge ────────────────────────────────────────
  const radius = 80;
  const circumference = Math.PI * radius; // semi-circle
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center"
    >
      {/* SVG Semi-circle Gauge */}
      <div className="relative w-52 h-28">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 100 A 80 80 0 0 1 190 100"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Colored zones (subtle background) */}
          <path d="M 10 100 A 80 80 0 0 1 62 28" fill="none" stroke="rgba(239,68,68,0.08)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 62 28 A 80 80 0 0 1 138 28" fill="none" stroke="rgba(245,158,11,0.08)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 138 28 A 80 80 0 0 1 190 100" fill="none" stroke="rgba(34,197,94,0.08)" strokeWidth="12" strokeLinecap="round" />
          {/* Active arc */}
          <path
            d="M 10 100 A 80 80 0 0 1 190 100"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease" }}
          />
          {/* Glow filter */}
          <defs>
            <filter id="gauge-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Center score display */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className={cn("text-4xl font-black tabular-nums", colors.text)}>
            {animatedScore}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendIcon className={cn("w-3.5 h-3.5", trendColor)} />
            <span className={cn("text-[9px] font-black uppercase tracking-widest", trendColor)}>
              {trend}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Metrics */}
      <div className="grid grid-cols-3 gap-3 mt-6 w-full max-w-xs">
        {[
          { label: "Streak", value: breakdown.attendanceStreak, suffix: "d" },
          { label: "Consistency", value: Math.round(breakdown.consistency), suffix: "%" },
          { label: "Completion", value: Math.round(breakdown.completionRate), suffix: "%" },
        ].map(m => (
          <div key={m.label} className="p-3 rounded-xl bg-black/20 border border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">{m.label}</p>
            <p className="text-sm font-bold text-white tabular-nums">
              {m.value}<span className="text-slate-500 text-[10px]">{m.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Warning Card */}
      {score < 40 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 w-full max-w-xs p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-3"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider leading-tight">
            Attendance improvement needed — streak is declining
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MomentumGauge;
