import React, { useState } from "react";
import { AlertTriangle, Bell, ChevronDown, ChevronUp, Send, Loader2, UserX, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { useAbsencePrediction, useAbsenceReminderMutation } from "../../queries/usePhase3Queries";
import type { AbsencePrediction } from "../../api/newFeatures";

interface AbsencePredictionCardProps {
  sessionId: string;
}

export const AbsencePredictionCard: React.FC<AbsencePredictionCardProps> = ({ sessionId }) => {
  const { data, isLoading } = useAbsencePrediction(sessionId);
  const { sendReminderMutation } = useAbsenceReminderMutation();
  const [expanded, setExpanded] = useState(false);
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());

  if (isLoading || !data) return null;

  const predictions = data.predictions || [];
  const atRisk = predictions.filter(p => p.probability >= 0.5);

  if (atRisk.length === 0) return null;

  const handleSendReminder = async (studentId: string) => {
    try {
      await sendReminderMutation.mutateAsync({ sessionId, studentIds: [studentId] });
      setSentReminders(prev => new Set(prev).add(studentId));
      toast.success("Reminder sent successfully");
    } catch {
      toast.error("Failed to send reminder");
    }
  };

  const handleSendAll = async () => {
    const unsent = atRisk.filter(p => !sentReminders.has(p.studentId)).map(p => p.studentId);
    if (unsent.length === 0) return;
    try {
      await sendReminderMutation.mutateAsync({ sessionId, studentIds: unsent });
      setSentReminders(prev => {
        const next = new Set(prev);
        unsent.forEach(id => next.add(id));
        return next;
      });
      toast.success(`${unsent.length} reminders sent`);
    } catch {
      toast.error("Failed to send reminders");
    }
  };

  const getProbabilityColor = (p: number) => {
    if (p >= 0.8) return { text: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" };
    if (p >= 0.6) return { text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" };
    return { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              Absence Risk Alert
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-400 font-black">
                {atRisk.length}
              </span>
            </h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              {atRisk.length} student{atRisk.length !== 1 ? "s" : ""} at risk of absence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); handleSendAll(); }}
            disabled={sendReminderMutation.isPending}
            className="h-9 px-4 rounded-lg bg-amber-400/10 border border-amber-400/20 text-[9px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-400/20 transition-all flex items-center gap-2"
          >
            {sendReminderMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Bell className="w-3 h-3" />
            )}
            Remind All
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </div>

      {/* Expandable Student List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {atRisk.map((pred, idx) => {
                const colors = getProbabilityColor(pred.probability);
                const alreadySent = sentReminders.has(pred.studentId);

                return (
                  <motion.div
                    key={pred.studentId}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5"
                  >
                    {/* Student Avatar Placeholder */}
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", colors.bg, colors.border)}>
                      <UserX className={cn("w-4 h-4", colors.text)} />
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                        {pred.studentName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {pred.reasons.slice(0, 2).map((reason, rIdx) => (
                          <span key={rIdx} className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Probability */}
                    <div className={cn("px-2.5 py-1 rounded-lg border text-[10px] font-black tabular-nums", colors.bg, colors.border, colors.text)}>
                      {Math.round(pred.probability * 100)}%
                    </div>

                    {/* Send Reminder */}
                    <button
                      onClick={() => handleSendReminder(pred.studentId)}
                      disabled={alreadySent || sendReminderMutation.isPending}
                      className={cn(
                        "h-8 px-3 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                        alreadySent
                          ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400 cursor-default"
                          : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-amber-400 hover:border-amber-400/20"
                      )}
                    >
                      {alreadySent ? (
                        <>✓ Sent</>
                      ) : (
                        <><Send className="w-2.5 h-2.5" /> Remind</>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AbsencePredictionCard;
