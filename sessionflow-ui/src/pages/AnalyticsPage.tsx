import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Users, Calendar, Activity,
  ArrowUpRight, ArrowDownRight, Minus, Loader2,
  Eye, MousePointer, Clock, Zap
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAnalyticsOverview, useAnalyticsDau, useAnalyticsFeatureUsage, useAnalyticsSessions, useAnalyticsRoles } from "../queries/useAnalyticsQueries";
import { cn } from "../lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// ── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string; value: number | string; icon: React.ComponentType<any>;
  trend?: "up" | "down" | "flat"; subtitle?: string; accentColor?: string;
}> = ({ label, value, icon: Icon, trend, subtitle, accentColor = "var(--ui-accent)" }) => (
  <motion.div
    whileHover={{ y: -2 }}
    className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center")}
        style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}>
        <Icon className="w-5 h-5" style={{ color: accentColor }} />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg",
          trend === "up" ? "bg-emerald-500/10 text-emerald-400" :
            trend === "down" ? "bg-rose-500/10 text-rose-400" :
              "bg-slate-500/10 text-slate-400"
        )}>
          {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> :
            trend === "down" ? <ArrowDownRight className="w-3 h-3" /> :
              <Minus className="w-3 h-3" />}
          {trend === "up" ? "Growing" : trend === "down" ? "Declining" : "Stable"}
        </div>
      )}
    </div>
    <div className="text-3xl font-black text-white mb-1">{value}</div>
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
    {subtitle && <div className="text-xs text-slate-600 mt-1">{subtitle}</div>}
  </motion.div>
);

// ── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-white font-bold">{payload[0].value}</p>
    </div>
  );
};

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#14b8a6"];

// ── Time Range Selector ──────────────────────────────────────────────────────
const TimeRangeBtn: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
      active ? "bg-[var(--ui-accent)] text-white" : "text-slate-500 hover:text-white hover:bg-white/5"
    )}
  >
    {label}
  </button>
);

// ── Main Page ───────────────────────────────────────────────────────────────
const AnalyticsPage: React.FC = () => {
  const [dauDays, setDauDays] = useState(30);

  const overviewQ = useAnalyticsOverview();
  const dauQ = useAnalyticsDau(dauDays);
  const featureQ = useAnalyticsFeatureUsage(dauDays);
  const sessionsQ = useAnalyticsSessions();
  const rolesQ = useAnalyticsRoles();

  const ov = overviewQ.data;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="px-6 pt-6 pb-10 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-[var(--ui-accent)]/20 border border-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Smart Analytics</h1>
              <p className="text-xs text-slate-500 mt-0.5">Platform-wide insights and engagement metrics</p>
            </div>
          </div>
          <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1">
            {[7, 30, 90].map(d => (
              <TimeRangeBtn key={d} label={`${d}d`} active={dauDays === d} onClick={() => setDauDays(d)} />
            ))}
          </div>
        </div>

        {/* KPI Row */}
        {overviewQ.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[var(--ui-accent)] animate-spin" /></div>
        ) : ov ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard label="Total Users" value={ov.totalUsers} icon={Users} trend="up" accentColor="#6366f1" />
            <KpiCard label="Active Today" value={ov.activeUsersToday} icon={Zap} trend="flat" accentColor="#14b8a6" />
            <KpiCard label="New This Month" value={ov.newUsersThisMonth} icon={TrendingUp} trend="up" accentColor="#a855f7" />
            <KpiCard label="Sessions Today" value={ov.sessionsToday} icon={Calendar} accentColor="#f59e0b" />
            <KpiCard label="Sessions / Week" value={ov.sessionsThisWeek} icon={Activity} trend="up" accentColor="#ec4899" />
            <KpiCard label="Attendance %" value={`${ov.attendanceRateThisWeek}%`} icon={Eye} trend={ov.attendanceRateThisWeek > 80 ? "up" : "down"} accentColor={ov.attendanceRateThisWeek > 80 ? "#10b981" : "#ef4444"} />
          </div>
        ) : null}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* DAU Chart */}
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-white">Daily Active Users</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Last {dauDays} Days</p>
            </div>
            {dauQ.isLoading ? (
              <div className="flex justify-center h-40 items-center"><Loader2 className="w-5 h-5 text-[var(--ui-accent)] animate-spin" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dauQ.data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v.slice(5)} interval={Math.floor((dauQ.data?.length || 1) / 6)} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="var(--ui-accent)" strokeWidth={2}
                    dot={false} activeDot={{ r: 4, fill: "var(--ui-accent)" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Role Distribution */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-4">User Roles</p>
            {rolesQ.isLoading ? (
              <div className="flex justify-center h-40 items-center"><Loader2 className="w-5 h-5 text-[var(--ui-accent)] animate-spin" /></div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={rolesQ.data || []} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                      {(rolesQ.data || []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {(rolesQ.data || []).map((d: any, i: number) => (
                    <div key={d.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-slate-400">{d.role}</span>
                      </div>
                      <span className="text-xs font-bold text-white">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Feature Usage */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-4">Page Engagement (Top Routes)</p>
            {featureQ.isLoading ? (
              <div className="flex justify-center h-40 items-center"><Loader2 className="w-5 h-5 text-[var(--ui-accent)] animate-spin" /></div>
            ) : (featureQ.data?.length || 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <MousePointer className="w-8 h-8 text-slate-700" />
                <p className="text-sm text-slate-600">No page views tracked yet.</p>
                <p className="text-xs text-slate-700">Events appear as users browse the platform.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={featureQ.data || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="route" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="visits" fill="var(--ui-accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Peak Hours */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-4">Peak Session Hours (This Week)</p>
            {sessionsQ.isLoading ? (
              <div className="flex justify-center h-40 items-center"><Loader2 className="w-5 h-5 text-[var(--ui-accent)] animate-spin" /></div>
            ) : sessionsQ.data?.peakHours?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <Clock className="w-8 h-8 text-slate-700" />
                <p className="text-sm text-slate-600">No sessions this week yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-bold border-b border-white/5 pb-2">
                  <span>Total Sessions</span>
                  <span className="text-white">{sessionsQ.data?.totalThisWeek}</span>
                </div>
                {(sessionsQ.data?.peakHours || []).map((h: any, i: number) => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 w-14 font-mono">
                      {h.hour.toString().padStart(2, "0")}:00
                    </span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(h.count / (sessionsQ.data?.peakHours[0]?.count || 1)) * 100}%` }}
                        className="h-full rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white w-8 text-right">{h.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
