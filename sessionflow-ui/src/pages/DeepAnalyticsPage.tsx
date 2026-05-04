import React, { useState } from "react";
import { BarChart3, TrendingUp, Users, PieChart, Filter, Crown, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { useCohortAnalytics, useRetentionFunnel, useForecast, useCustomAnalytics } from "../queries/usePhase4Queries";

type AnalyticsTab = "cohort" | "retention" | "forecast" | "custom";

const TABS: { id: AnalyticsTab; label: string; icon: React.ElementType }[] = [
  { id: "cohort", label: "Cohort", icon: Users },
  { id: "retention", label: "Retention", icon: PieChart },
  { id: "forecast", label: "Forecast", icon: TrendingUp },
  { id: "custom", label: "Custom", icon: Filter },
];

// ── Cohort Matrix ───────────────────────────────────────────
const CohortView: React.FC = () => {
  const { data, isLoading } = useCohortAnalytics(6);
  if (isLoading) return <LoadingSkeleton />;
  const cells = data || [];

  // Build matrix
  const months = [...new Set(cells.map(c => c.enrollmentMonth))].sort();
  const actMonths = [...new Set(cells.map(c => c.activityMonth))].sort();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-[8px] font-black text-slate-600 uppercase tracking-widest text-left">Enrolled</th>
            {actMonths.map(m => (
              <th key={m} className="p-2 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map(em => (
            <tr key={em}>
              <td className="p-2 text-[9px] font-bold text-slate-400 whitespace-nowrap">{em}</td>
              {actMonths.map(am => {
                const cell = cells.find(c => c.enrollmentMonth === em && c.activityMonth === am);
                const rate = cell?.rate ?? 0;
                const opacity = Math.max(0.05, rate / 100);
                return (
                  <td key={am} className="p-1">
                    <div
                      className="w-full h-10 rounded-lg flex items-center justify-center text-[9px] font-black tabular-nums transition-all hover:scale-105"
                      style={{ backgroundColor: `rgba(139, 92, 246, ${opacity})`, color: rate > 50 ? "white" : "rgba(255,255,255,0.5)" }}
                      title={`${cell?.count || 0} users`}
                    >
                      {rate > 0 ? `${Math.round(rate)}%` : "–"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Retention Funnel ────────────────────────────────────────
const RetentionView: React.FC = () => {
  const { data, isLoading } = useRetentionFunnel("90d");
  if (isLoading) return <LoadingSkeleton />;
  const stages = data || [];
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-4">
      {stages.map((stage, idx) => {
        const width = (stage.count / maxCount) * 100;
        return (
          <motion.div
            key={stage.stage}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{stage.stage}</span>
              <span className="text-[10px] font-black text-slate-400 tabular-nums">
                {stage.count} <span className="text-slate-600">({Math.round(stage.percentage)}%)</span>
              </span>
            </div>
            <div className="h-8 bg-white/[0.02] rounded-xl overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.8, delay: idx * 0.12, ease: "easeOut" }}
                className="h-full rounded-xl bg-gradient-to-r from-purple-500/30 to-[var(--ui-accent)]/30"
                style={{ filter: `brightness(${1 + (1 - idx / stages.length) * 0.5})` }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ── Forecast Chart ──────────────────────────────────────────
const ForecastView: React.FC = () => {
  const [metric, setMetric] = useState("revenue");
  const { data, isLoading } = useForecast(metric, "30d");
  if (isLoading) return <LoadingSkeleton />;
  const points = data || [];
  if (points.length === 0) return <EmptyState label="No forecast data" />;

  const maxVal = Math.max(...points.map(p => p.value), 1);
  const svgW = 500;
  const svgH = 200;
  const pad = 20;

  const pathPoints = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (svgW - pad * 2);
    const y = svgH - pad - ((p.value / maxVal) * (svgH - pad * 2));
    return { x, y, projected: p.projected };
  });

  const historicalPath = pathPoints.filter(p => !p.projected).map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const projectedPath = pathPoints.filter((p, i) => {
    if (p.projected) return true;
    // Include last historical point for continuity
    const next = pathPoints[i + 1];
    return next?.projected;
  }).map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["revenue", "attendance", "sessions"].map(m => (
          <button key={m} onClick={() => setMetric(m)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
              metric === m ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/20 text-[var(--ui-accent)]" : "bg-white/[0.02] border-white/5 text-slate-600 hover:text-slate-400"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-48">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(pct => (
            <line key={pct} x1={pad} y1={svgH - pad - pct * (svgH - pad * 2)} x2={svgW - pad} y2={svgH - pad - pct * (svgH - pad * 2)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          ))}
          {/* Historical line */}
          <path d={historicalPath} fill="none" stroke="var(--ui-accent)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Projected line */}
          {projectedPath && <path d={projectedPath} fill="none" stroke="var(--ui-accent)" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />}
          {/* Data points */}
          {pathPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.projected ? 2.5 : 3} fill={p.projected ? "rgba(139,92,246,0.3)" : "var(--ui-accent)"} stroke={p.projected ? "transparent" : "rgba(139,92,246,0.3)"} strokeWidth="4" />
          ))}
        </svg>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-[var(--ui-accent)]" />
            <span className="text-[8px] font-bold text-slate-600 uppercase">Historical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-[var(--ui-accent)]/50 border-b border-dashed border-[var(--ui-accent)]" />
            <span className="text-[8px] font-bold text-slate-600 uppercase">Projected</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Custom Analytics ────────────────────────────────────────
const CustomView: React.FC = () => {
  const [metric, setMetric] = useState("attendance");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading } = useCustomAnalytics({ metric, from, to });
  const points = data || [];
  const maxVal = Math.max(...points.map(p => p.value), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select value={metric} onChange={e => setMetric(e.target.value)} className="h-9 px-3 rounded-xl bg-black/30 border border-white/5 text-[10px] font-bold text-white uppercase tracking-wider appearance-none">
          <option value="attendance">Attendance</option>
          <option value="revenue">Revenue</option>
          <option value="sessions">Sessions</option>
          <option value="students">Students</option>
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 px-3 rounded-xl bg-black/30 border border-white/5 text-[10px] font-bold text-slate-400" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 px-3 rounded-xl bg-black/30 border border-white/5 text-[10px] font-bold text-slate-400" />
      </div>

      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {points.map((p, idx) => (
            <motion.div key={p.label} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.05 }} className="flex items-center gap-3">
              <span className="text-[9px] font-bold text-slate-400 w-24 truncate">{p.label}</span>
              <div className="flex-1 h-6 bg-white/[0.02] rounded-lg overflow-hidden border border-white/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(p.value / maxVal) * 100}%` }} transition={{ duration: 0.6 }} className="h-full rounded-lg bg-gradient-to-r from-[var(--ui-accent)]/20 to-[var(--ui-accent)]/40" />
              </div>
              <span className="text-[9px] font-black text-white tabular-nums w-12 text-right">{p.value}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Helper Components ───────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="h-48 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="h-48 flex items-center justify-center">
    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{label}</p>
  </div>
);

// ── Main Page ───────────────────────────────────────────────
const DeepAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("cohort");

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ui-bg)]">
      {/* Header */}
      <div className="px-6 md:px-10 py-6 border-b border-white/5 bg-black/20 backdrop-blur-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-[0.25em] flex items-center gap-2">
                Deep Analytics
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              </h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Advanced intelligence engine
              </p>
            </div>
          </div>
          <button className="h-9 px-4 rounded-xl bg-white/[0.03] border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white flex items-center gap-2 transition-all">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  isActive
                    ? "bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[var(--ui-accent)]"
                    : "bg-white/[0.02] border border-transparent text-slate-600 hover:text-slate-400"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "cohort" && <CohortView />}
            {activeTab === "retention" && <RetentionView />}
            {activeTab === "forecast" && <ForecastView />}
            {activeTab === "custom" && <CustomView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DeepAnalyticsPage;
