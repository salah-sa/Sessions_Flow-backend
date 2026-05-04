import React, { useState, useMemo } from "react";
import { Wand2, Check, X, ChevronRight, ArrowRight, Loader2, Crown, Zap, Clock, AlertTriangle, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { useScheduleOptimization, useApplyOptimization } from "../../queries/usePhase4Queries";
import type { ScheduleSuggestion } from "../../api/premiumFeatures";

interface ScheduleOptimizerProps {
  engineerId: string;
  onClose?: () => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CONFIDENCE_STYLE = {
  high:   { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", label: "High" },
  medium: { color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20",   label: "Medium" },
  low:    { color: "text-slate-400",   bg: "bg-slate-400/10",   border: "border-slate-400/20",   label: "Low" },
};

export const ScheduleOptimizer: React.FC<ScheduleOptimizerProps> = ({ engineerId, onClose }) => {
  const { data, isLoading } = useScheduleOptimization(engineerId);
  const applyMut = useApplyOptimization();
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  const suggestions = data?.suggestions || [];
  const pending = suggestions.filter(s => !accepted.has(s.id) && !rejected.has(s.id));

  const toggleAccept = (id: string) => {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setRejected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleReject = (id: string) => {
    setRejected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setAccepted(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleApplyAll = async () => {
    const ids = [...accepted];
    if (ids.length === 0) { toast.info("Select suggestions to apply"); return; }
    try {
      await applyMut.mutateAsync(ids);
      toast.success(`${ids.length} schedule changes applied`);
      onClose?.();
    } catch {
      toast.error("Failed to apply changes");
    }
  };

  const handleAcceptAll = () => {
    setAccepted(new Set(suggestions.map(s => s.id)));
    setRejected(new Set());
  };

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <Wand2 className="w-8 h-8 text-[var(--ui-accent)] animate-pulse" />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analyzing schedule patterns...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-white/5 bg-black/20">
        <CheckCheck className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">Schedule Optimized</h4>
        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">No improvements detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-[var(--ui-accent)]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              Schedule Optimizer
              <Crown className="w-3 h-3 text-amber-400" />
            </h3>
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
              {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} • {accepted.size} accepted
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleAcceptAll}
            className="h-9 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
            Accept All
          </button>
          <button onClick={handleApplyAll} disabled={accepted.size === 0 || applyMut.isPending}
            className={cn(
              "h-9 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
              accepted.size > 0
                ? "bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/20"
                : "bg-white/[0.02] border border-white/5 text-slate-600 cursor-not-allowed"
            )}>
            {applyMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            Apply ({accepted.size})
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        {suggestions.map((s, idx) => {
          const isAccepted = accepted.has(s.id);
          const isRejected = rejected.has(s.id);
          const conf = CONFIDENCE_STYLE[s.confidence];

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "p-4 rounded-2xl border transition-all",
                isAccepted ? "bg-emerald-500/5 border-emerald-500/15" :
                isRejected ? "bg-white/[0.01] border-white/5 opacity-40" :
                "bg-black/20 border-white/5"
              )}
            >
              {/* Slot Comparison */}
              <div className="flex items-center gap-4 mb-3">
                {/* Current */}
                <div className="flex-1 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                  <p className="text-[8px] font-black text-rose-400/60 uppercase tracking-widest mb-1">Current</p>
                  <p className="text-[11px] font-bold text-white">
                    {DAYS[s.currentSlot.dayOfWeek]} • {s.currentSlot.startTime}
                  </p>
                  <p className="text-[8px] font-bold text-slate-600">{s.currentSlot.duration}min</p>
                </div>

                <ArrowRight className="w-5 h-5 text-slate-600 shrink-0" />

                {/* Suggested */}
                <div className="flex-1 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[8px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">Suggested</p>
                  <p className="text-[11px] font-bold text-emerald-300">
                    {DAYS[s.suggestedSlot.dayOfWeek]} • {s.suggestedSlot.startTime}
                  </p>
                  <p className="text-[8px] font-bold text-slate-600">{s.suggestedSlot.duration}min</p>
                </div>
              </div>

              {/* Reason + Confidence + Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn("px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-widest shrink-0", conf.bg, conf.border, conf.color)}>
                    {conf.label}
                  </div>
                  <p className="text-[9px] text-slate-500 font-medium truncate">{s.reason}</p>
                </div>

                <div className="flex gap-1.5 shrink-0 ms-3">
                  <button onClick={() => toggleAccept(s.id)}
                    className={cn(
                      "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                      isAccepted ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/[0.03] border-white/5 text-slate-600 hover:text-emerald-400"
                    )}>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleReject(s.id)}
                    className={cn(
                      "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                      isRejected ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-white/[0.03] border-white/5 text-slate-600 hover:text-rose-400"
                    )}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleOptimizer;
