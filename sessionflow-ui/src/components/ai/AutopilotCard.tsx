import React, { useState } from "react";
import { Brain, Calendar, Clock, TrendingUp, ChevronDown, ChevronUp, Check, X, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useSessionRecommendation, useAutopilotMutations } from "../../queries/usePhase3Queries";
import type { AutopilotRecommendation } from "../../api/newFeatures";

interface AutopilotCardProps {
  groupId: string;
  enabled: boolean;
  onConfirm: (date: string, time: string) => void;
}

export const AutopilotCard: React.FC<AutopilotCardProps> = ({ groupId, enabled, onConfirm }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const { data, isLoading, error } = useSessionRecommendation(groupId);
  const { dismissMutation } = useAutopilotMutations();

  if (!enabled || isLoading) return null;
  if (error || !data) return null;

  const rec = data;
  const confidenceColor =
    rec.confidence >= 0.8 ? "text-emerald-400" :
    rec.confidence >= 0.5 ? "text-amber-400" : "text-rose-400";
  const confidenceBg =
    rec.confidence >= 0.8 ? "bg-emerald-400/10 border-emerald-400/20" :
    rec.confidence >= 0.5 ? "bg-amber-400/10 border-amber-400/20" : "bg-rose-400/10 border-rose-400/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      className="mb-6 p-5 rounded-2xl border border-[var(--ui-accent)]/20 bg-gradient-to-br from-[var(--ui-accent)]/5 to-transparent backdrop-blur-xl relative overflow-hidden group"
    >
      {/* Ambient glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--ui-accent)]/10 blur-[60px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[var(--ui-accent)]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              Neural Autopilot
              <Sparkles className="w-3 h-3 text-[var(--ui-accent)] animate-pulse" />
            </h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              AI-Generated Schedule Recommendation
            </p>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className={cn("px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest", confidenceBg, confidenceColor)}>
          {Math.round(rec.confidence * 100)}% Confidence
        </div>
      </div>

      {/* Recommendation Details */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="p-3 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-[var(--ui-accent)] opacity-60" />
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Date</span>
          </div>
          <p className="text-sm font-bold text-white">{rec.suggestedDate}</p>
        </div>
        <div className="p-3 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-[var(--ui-accent)] opacity-60" />
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Time</span>
          </div>
          <p className="text-sm font-bold text-white">{rec.suggestedTime}</p>
        </div>
        <div className="p-3 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 opacity-60" />
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Predicted</span>
          </div>
          <p className="text-sm font-bold text-emerald-400">{rec.predictedAttendance}%</p>
        </div>
      </div>

      {/* Reasoning Toggle */}
      <button
        onClick={() => setShowReasoning(!showReasoning)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors mb-4"
      >
        <span>AI Reasoning</span>
        {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {showReasoning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic">
                {rec.reasoning}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onConfirm(rec.suggestedDate, rec.suggestedTime)}
          className="btn-primary flex-1 h-11 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <Check className="w-4 h-4" />
          Accept & Schedule
        </button>
        <button
          onClick={() => dismissMutation.mutate(groupId)}
          disabled={dismissMutation.isPending}
          className="h-11 px-5 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
        >
          {dismissMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
          Dismiss
        </button>
      </div>
    </motion.div>
  );
};

export default AutopilotCard;
