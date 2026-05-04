import React, { useState } from "react";
import { CheckCircle2, Circle, Clock, Brain, RefreshCw, FileDown, ChevronDown, ChevronUp, Sparkles, Loader2, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useStudyPath, useGenerateStudyPath } from "../../queries/usePhase4Queries";
import type { StudyPathMilestone } from "../../api/premiumFeatures";

interface StudyPathTimelineProps {
  studentId: string;
}

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400", border: "border-emerald-400/30", glow: "shadow-emerald-400/20" },
  current:   { icon: Sparkles,     color: "text-[var(--ui-accent)]", bg: "bg-[var(--ui-accent)]", border: "border-[var(--ui-accent)]/30", glow: "shadow-[var(--ui-accent)]/20" },
  upcoming:  { icon: Circle,       color: "text-slate-600", bg: "bg-slate-700", border: "border-slate-700/30", glow: "" },
};

export const StudyPathTimeline: React.FC<StudyPathTimelineProps> = ({ studentId }) => {
  const { data, isLoading } = useStudyPath(studentId);
  const generateMut = useGenerateStudyPath();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Loading study path...</p>
      </div>
    );
  }

  const milestones = data?.milestones || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[var(--ui-accent)]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              Study Path
              <Crown className="w-3 h-3 text-amber-400" />
            </h3>
            {data?.generatedAt && (
              <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                Generated {new Date(data.generatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => generateMut.mutate(studentId)}
            disabled={generateMut.isPending}
            className="h-9 px-4 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[9px] font-black uppercase tracking-widest text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/20 transition-all flex items-center gap-2"
          >
            {generateMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </button>
          <button className="h-9 px-4 rounded-xl bg-white/[0.03] border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all flex items-center gap-2">
            <FileDown className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* Timeline */}
      {milestones.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-white/5 bg-black/20">
          <Brain className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 opacity-50">No Study Path Yet</h4>
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-6">
            Generate an AI-powered learning roadmap
          </p>
          <button
            onClick={() => generateMut.mutate(studentId)}
            disabled={generateMut.isPending}
            className="h-10 px-6 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[10px] font-black uppercase tracking-widest text-[var(--ui-accent)] inline-flex items-center gap-2"
          >
            {generateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate Study Path
          </button>
        </div>
      ) : (
        <div className="relative">
          {milestones.map((m, idx) => {
            const cfg = statusConfig[m.status];
            const StatusIcon = cfg.icon;
            const isExpanded = expandedIdx === idx;
            const isLast = idx === milestones.length - 1;

            return (
              <motion.div
                key={m.id || idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex gap-4 mb-2"
              >
                {/* Timeline Line + Node */}
                <div className="flex flex-col items-center w-8 shrink-0">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all relative z-10",
                    cfg.border,
                    m.status === "current" ? "ring-4 ring-[var(--ui-accent)]/10 animate-pulse" : ""
                  )}>
                    <StatusIcon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-px flex-1 min-h-[40px]",
                      m.status === "completed" ? "bg-emerald-400/20" : "bg-white/5 border-l border-dashed border-white/10"
                    )} />
                  )}
                </div>

                {/* Milestone Card */}
                <div
                  className={cn(
                    "flex-1 rounded-2xl border p-4 mb-4 cursor-pointer transition-all",
                    m.status === "current"
                      ? "bg-[var(--ui-accent)]/5 border-[var(--ui-accent)]/15 shadow-lg"
                      : m.status === "completed"
                        ? "bg-emerald-500/[0.03] border-emerald-500/10 opacity-80"
                        : "bg-white/[0.01] border-white/5 opacity-50"
                  )}
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("text-[11px] font-black uppercase tracking-widest mb-1", cfg.color)}>
                        {m.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-2">
                        {m.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ms-3">
                      <div className="flex items-center gap-1 text-[8px] font-mono text-slate-600">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(m.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.progress}%` }}
                      transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: m.status === "completed" ? "#22c55e" : "var(--ui-accent)" }}
                    />
                  </div>

                  {/* Expanded AI Notes */}
                  <AnimatePresence>
                    {isExpanded && m.aiNotes && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/5">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-3 h-3 text-[var(--ui-accent)]" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">AI Notes</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                            {m.aiNotes}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudyPathTimeline;
