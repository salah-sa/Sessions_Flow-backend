import React, { useState, useMemo } from "react";
import { ArrowRightLeft, Search, AlertTriangle, Check, ChevronRight, Loader2, Crown, X, Shield, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { useTransferCheck, useTransferStudent } from "../../queries/usePhase4Queries";

interface TransferWizardProps {
  studentId: string;
  studentName: string;
  currentGroupId: string;
  currentGroupName: string;
  groups: { id: string; name: string; studentCount: number; engineerName: string }[];
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Select Group", "Compatibility", "Preview", "Confirm"];

export const TransferWizard: React.FC<TransferWizardProps> = ({
  studentId, studentName, currentGroupId, currentGroupName, groups, onClose,
}) => {
  const [step, setStep] = useState<WizardStep>(1);
  const [targetGroupId, setTargetGroupId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const transferMut = useTransferStudent();

  const targetGroup = groups.find(g => g.id === targetGroupId);
  const availableGroups = groups.filter(g => g.id !== currentGroupId);
  const filteredGroups = useMemo(() =>
    availableGroups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [availableGroups, searchQuery]
  );

  // Compatibility check (only queries when we have both IDs)
  const { data: checkResult, isLoading: checkLoading } = useTransferCheck(
    step >= 2 ? studentId : "",
    step >= 2 ? targetGroupId : ""
  );

  const handleTransfer = async () => {
    try {
      await transferMut.mutateAsync({ studentId, targetGroupId });
      toast.success(`${studentName} transferred successfully`);
      onClose();
    } catch {
      toast.error("Transfer failed");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-lg rounded-3xl border border-white/5 bg-[var(--ui-sidebar-bg)] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                Transfer Student
                <Crown className="w-3 h-3 text-amber-400" />
              </h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{studentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-2">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = (idx + 1) as WizardStep;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <div className={cn("flex-1 h-px", isDone ? "bg-emerald-400/30" : "bg-white/5")} />}
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border transition-all",
                    isActive ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/30 text-[var(--ui-accent)]" :
                    isDone ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400" :
                    "bg-white/[0.02] border-white/5 text-slate-700"
                  )}>
                    {isDone ? <Check className="w-3 h-3" /> : stepNum}
                  </div>
                  <span className={cn("text-[8px] font-black uppercase tracking-widest hidden sm:block",
                    isActive ? "text-white" : isDone ? "text-emerald-400" : "text-slate-700"
                  )}>
                    {label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[400px] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Group */}
            {step === 1 && (
              <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search groups..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-black/30 border border-white/5 text-[10px] font-bold text-white placeholder:text-slate-700" />
                </div>
                <div className="space-y-1.5">
                  {filteredGroups.map(g => (
                    <button key={g.id} onClick={() => setTargetGroupId(g.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3",
                        targetGroupId === g.id
                          ? "bg-[var(--ui-accent)]/5 border-[var(--ui-accent)]/15"
                          : "bg-white/[0.01] border-white/5 hover:bg-white/[0.02]"
                      )}>
                      <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center">
                        <Users className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-white uppercase tracking-wider">{g.name}</p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{g.studentCount} students • {g.engineerName}</p>
                      </div>
                      {targetGroupId === g.id && <Check className="w-4 h-4 text-[var(--ui-accent)]" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Compatibility */}
            {step === 2 && (
              <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                {checkLoading ? (
                  <div className="h-32 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Shield className="w-8 h-8 text-[var(--ui-accent)] animate-pulse" />
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Running compatibility check...</p>
                    </div>
                  </div>
                ) : checkResult ? (
                  <div className="space-y-4">
                    <div className={cn(
                      "p-4 rounded-xl border flex items-center gap-3",
                      checkResult.compatible ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                    )}>
                      {checkResult.compatible ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      )}
                      <p className={cn("text-[10px] font-black uppercase tracking-widest",
                        checkResult.compatible ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {checkResult.compatible ? "Compatible" : "Compatibility Issues Found"}
                      </p>
                    </div>

                    {checkResult.conflicts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Conflicts</p>
                        {checkResult.conflicts.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                            <X className="w-3 h-3 text-rose-400 shrink-0" />
                            <span className="text-[9px] text-rose-300 font-medium">{c}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {checkResult.warnings.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Warnings</p>
                        {checkResult.warnings.map((w, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-[9px] text-amber-300 font-medium">{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* Step 3: Preview */}
            {step === 3 && (
              <motion.div key="s3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 p-4 rounded-xl border border-white/5 bg-black/20 text-center">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">From</p>
                    <p className="text-[11px] font-bold text-white uppercase tracking-wider">{currentGroupName}</p>
                  </div>
                  <ArrowRightLeft className="w-5 h-5 text-[var(--ui-accent)] shrink-0" />
                  <div className="flex-1 p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-center">
                    <p className="text-[8px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">To</p>
                    <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">{targetGroup?.name}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-2">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">What transfers</p>
                  {["Full attendance history", "All session records", "Wallet balance", "Streak data"].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <motion.div key="s4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="text-center py-4 space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">Confirm Transfer</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Transfer <strong className="text-white">{studentName}</strong> from{" "}
                    <strong className="text-white">{currentGroupName}</strong> to{" "}
                    <strong className="text-emerald-400">{targetGroup?.name}</strong>?
                  </p>
                  <p className="text-[9px] text-slate-600 font-bold mt-2 uppercase tracking-wider">
                    This action is immediate and both groups will be updated in real-time.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex justify-between">
          <button onClick={() => step > 1 ? setStep((step - 1) as WizardStep) : onClose()}
            className="h-10 px-5 rounded-xl bg-white/[0.03] border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all">
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 ? (
            <button onClick={() => setStep((step + 1) as WizardStep)}
              disabled={step === 1 && !targetGroupId}
              className={cn(
                "h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                step === 1 && !targetGroupId
                  ? "bg-white/[0.02] border border-white/5 text-slate-700 cursor-not-allowed"
                  : "bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/20"
              )}>
              Next <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <button onClick={handleTransfer} disabled={transferMut.isPending}
              className="h-10 px-6 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[9px] font-black text-[var(--ui-accent)] uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--ui-accent)]/20 transition-all">
              {transferMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
              Transfer
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TransferWizard;
