import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getAttendanceHistory, getAttendanceSummary, AttendanceHistoryItem } from "../api/newFeatures";
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Filter, BarChart3, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string; bg: string }> = {
  Present: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    label: "Present",
  },
  Absent: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    label: "Absent",
  },
  Late: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    label: "Late",
  },
  Unmarked: {
    icon: Clock,
    color: "text-slate-500",
    bg: "bg-slate-800/40 border-slate-700/30",
    label: "Unmarked",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Unmarked;
  const Icon = config.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
      config.bg, config.color
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

const STATUS_FILTERS = ["All", "Present", "Absent", "Late"];

const AttendanceHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: history, isLoading } = useQuery({
    queryKey: ["attendance-history", page, statusFilter],
    queryFn: () => getAttendanceHistory(page, 20, statusFilter === "All" ? undefined : statusFilter),
    staleTime: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["attendance-summary"],
    queryFn: getAttendanceSummary,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-full p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/attendance")}
          className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Attendance History</h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
            Full Attendance Record
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Sessions", value: summary.totalSessions, color: "text-slate-300" },
            { label: "Attended", value: summary.attended, color: "text-emerald-400" },
            { label: "Absent", value: summary.absent, color: "text-red-400" },
            { label: "Rate", value: `${summary.attendanceRate}%`, color: summary.attendanceRate >= 75 ? "text-emerald-400" : summary.attendanceRate >= 50 ? "text-amber-400" : "text-red-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-1">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mr-1">Filter:</span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setStatusFilter(f); setPage(1); }}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
              statusFilter === f
                ? "bg-[var(--ui-accent)] border-[var(--ui-accent)] text-white"
                : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/5 bg-slate-900/40">
          {["Group / Session", "Scheduled", "Marked At", "Status"].map((h) => (
            <span key={h} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-[var(--ui-accent)] rounded-full animate-spin mx-auto" />
          </div>
        ) : !history?.items.length ? (
          <div className="p-12 text-center space-y-3">
            <BarChart3 className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">No attendance records found</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${page}-${statusFilter}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {history.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={cn(
                    "grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 items-center",
                    "border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors",
                    idx === history.items.length - 1 && "border-b-0"
                  )}
                >
                  {/* Group / Session */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.groupName}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Session #{item.sessionNumber}
                    </p>
                  </div>

                  {/* Scheduled */}
                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    {item.scheduledAt
                      ? format(new Date(item.scheduledAt), "dd MMM HH:mm")
                      : "—"
                    }
                  </span>

                  {/* Marked At */}
                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    {format(new Date(item.markedAt), "dd MMM HH:mm")}
                  </span>

                  {/* Status */}
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {history && history.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 text-slate-500 hover:text-white disabled:opacity-30 border border-white/10 rounded-xl transition-all hover:border-white/20"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-400 font-bold">
            Page {page} of {history.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(history.totalPages, p + 1))}
            disabled={page === history.totalPages}
            className="p-2 text-slate-500 hover:text-white disabled:opacity-30 border border-white/10 rounded-xl transition-all hover:border-white/20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistoryPage;
