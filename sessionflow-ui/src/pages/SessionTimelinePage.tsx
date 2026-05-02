import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  PlayCircle, Clock, Users, CheckCircle2, XCircle,
  CalendarDays, Loader2, ChevronRight, Activity,
  TrendingUp, BarChart3
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/client";
import { cn } from "../lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────
interface SessionEvent {
  sessionId: string;
  groupName: string;
  engineerName: string;
  scheduledAt: string;
  status: "Pending" | "Active" | "Completed" | "Cancelled";
  attendanceCount: number;
  totalStudents: number;
}

interface TimelineResponse {
  sessions: SessionEvent[];
  totalSessions: number;
  avgAttendanceRate: number;
  peakDay: string;
}

// ── Status Badge ───────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { color: string; bg: string; icon: React.ComponentType<any> }> = {
    Completed: { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
    Active:    { color: "text-sky-400",     bg: "bg-sky-500/10",     icon: Activity     },
    Pending:   { color: "text-amber-400",   bg: "bg-amber-500/10",   icon: Clock        },
    Cancelled: { color: "text-rose-400",    bg: "bg-rose-500/10",    icon: XCircle      },
  };
  const cfg = configs[status] ?? configs.Pending;
  const Icon = cfg.icon;
  return (
    <span className={cn("flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg", cfg.color, cfg.bg)}>
      <Icon className="w-2.5 h-2.5" /> {status}
    </span>
  );
};

// ── Timeline Entry ─────────────────────────────────────────────────────────
const TimelineEntry: React.FC<{ session: SessionEvent; index: number }> = ({ session, index }) => {
  const rate = session.totalStudents > 0
    ? Math.round((session.attendanceCount / session.totalStudents) * 100)
    : 0;
  const dt = new Date(session.scheduledAt);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="relative flex gap-4"
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1.5",
          session.status === "Completed" ? "border-emerald-400 bg-emerald-400/20" :
          session.status === "Active"    ? "border-sky-400 bg-sky-400/20 shadow-[0_0_8px_rgba(56,189,248,0.4)]" :
          session.status === "Cancelled" ? "border-rose-400 bg-rose-400/20" :
          "border-amber-400 bg-amber-400/20"
        )} />
        <div className="w-px flex-1 bg-white/5 mt-1" />
      </div>

      {/* Card */}
      <div className="flex-1 pb-4">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all group">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-bold text-white">{session.groupName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{session.engineerName}</p>
            </div>
            <StatusBadge status={session.status} />
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {session.attendanceCount}/{session.totalStudents}
            </span>
          </div>

          {/* Attendance Bar */}
          {session.totalStudents > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[9px] text-slate-600 mb-1">
                <span>Attendance</span>
                <span className={cn("font-bold", rate >= 80 ? "text-emerald-400" : rate >= 50 ? "text-amber-400" : "text-rose-400")}>
                  {rate}%
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rate}%` }}
                  transition={{ duration: 0.5, delay: index * 0.03 }}
                  className={cn("h-full rounded-full", rate >= 80 ? "bg-emerald-400" : rate >= 50 ? "bg-amber-400" : "bg-rose-400")}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────
const SessionTimelinePage: React.FC = () => {
  const [days, setDays] = useState(7);

  const timelineQ = useQuery<TimelineResponse>({
    queryKey: ["session-timeline", days],
    queryFn: () => fetchWithAuth(`/api/admin/session-timeline?days=${days}`),
    staleTime: 60_000,
  });

  const data = timelineQ.data;

  // Group sessions by date
  const grouped = React.useMemo(() => {
    if (!data?.sessions) return {};
    return data.sessions.reduce((acc: Record<string, SessionEvent[]>, s) => {
      const key = new Date(s.scheduledAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }, [data]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="px-6 pt-6 pb-10 max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 to-[var(--ui-accent)]/20 border border-sky-500/20 flex items-center justify-center">
              <PlayCircle className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Session Timeline</h1>
              <p className="text-xs text-slate-500 mt-0.5">Visual history of all sessions with attendance tracking</p>
            </div>
          </div>
          <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)} className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                days === d ? "bg-[var(--ui-accent)] text-white" : "text-slate-500 hover:text-white"
              )}>{d}d</button>
            ))}
          </div>
        </div>

        {/* KPI Strip */}
        {data && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
              <BarChart3 className="w-5 h-5 text-[var(--ui-accent)] mx-auto mb-2" />
              <div className="text-2xl font-black text-white">{data.totalSessions}</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1">Total Sessions</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className={cn("text-2xl font-black", data.avgAttendanceRate >= 80 ? "text-emerald-400" : data.avgAttendanceRate >= 50 ? "text-amber-400" : "text-rose-400")}>
                {data.avgAttendanceRate}%
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1">Avg Attendance</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
              <CalendarDays className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <div className="text-sm font-black text-white">{data.peakDay || "—"}</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1">Busiest Day</div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {timelineQ.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-[var(--ui-accent)] animate-spin" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <PlayCircle className="w-12 h-12 text-slate-700" />
            <p className="text-sm text-slate-500">No sessions found in the last {days} days.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, sessions]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{date}</p>
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[9px] text-slate-600 font-bold">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-0">
                  {sessions.map((s, i) => (
                    <TimelineEntry key={s.sessionId} session={s} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionTimelinePage;
