import React, { useState, useEffect } from "react";
import { X, Loader2, Info, Settings, Shield, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Group } from "../../types";
import { useGroupMutations } from "../../queries/useGroupQueries";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface GroupDescriptionModalProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
}

const MAX_CHARS = 600;

const GroupDescriptionModal: React.FC<GroupDescriptionModalProps> = ({ group, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { updateMutation } = useGroupMutations();
  const [description, setDescription] = useState(group.description || "");

  useEffect(() => {
    if (isOpen) {
      setDescription(group.description || "");
    }
  }, [isOpen, group.description]);

  const charCount = description.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);
  const isOverLimit = charCount > MAX_CHARS;
  const hasChanged = description !== (group.description || "");

  const handleSave = async () => {
    if (isOverLimit) return;

    try {
      await updateMutation.mutateAsync({
        id: group.id,
        data: { description: description.trim() },
      });
      toast.success(t("chat.description_saved", "Settings updated"));
      onClose();
    } catch {
      toast.error(t("chat.description_error", "Failed to update description"));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-xl max-h-[90dvh] bg-[#0c0e12] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[var(--chat-accent-warm)]/10 to-transparent pointer-events-none" />

            <div className="p-8 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--chat-accent-warm)] to-[var(--chat-accent-rose)] flex items-center justify-center text-white shadow-xl shadow-[var(--chat-accent-warm)]/20">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-widest font-display">{t("chat.group_info", "Session Settings")}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configure workspace details</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Overview & Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("chat.description_placeholder", "Describe the purpose of this session...")}
                  rows={4}
                  className={cn(
                    "w-full bg-white/[0.02] border rounded-3xl px-6 py-5 text-sm text-slate-200 placeholder:text-slate-600 resize-none outline-none transition-all",
                    isOverLimit
                      ? "border-rose-500/40 focus:ring-4 focus:ring-rose-500/10"
                      : "border-white/5 focus:ring-4 focus:ring-[var(--chat-accent-warm)]/10 focus:border-[var(--chat-accent-warm)]/20"
                  )}
                />
                
                <div className="px-2">
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(charPercent, 100)}%` }}
                      className={cn(
                        "h-full rounded-full transition-colors duration-500",
                        isOverLimit ? "bg-rose-500" : charPercent > 80 ? "bg-amber-500" : "bg-[var(--chat-accent-warm)]"
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={cn("text-[9px] font-bold uppercase tracking-widest", isOverLimit ? "text-rose-400" : "text-slate-500")}>
                      {charCount} / {MAX_CHARS} Characters
                    </span>
                    {isOverLimit && <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">Limit Exceeded</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400 shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Privacy Level</p>
                    <p className="text-[11px] text-slate-300 mt-1 font-medium">Session Restricted</p>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Last Modified</p>
                    <p className="text-[11px] text-slate-300 mt-1 font-medium">Synced Recently</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-white/5 flex items-center justify-end gap-4 flex-none bg-black/40">
              <button
                onClick={onClose}
                className="h-12 px-8 rounded-2xl text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={isOverLimit || !hasChanged || updateMutation.isPending}
                className="h-12 px-8 rounded-2xl bg-gradient-to-r from-[var(--chat-accent-warm)] to-[var(--chat-accent-rose)] text-white font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--chat-accent-warm)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center gap-3"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {t("common.save", "Update Session")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GroupDescriptionModal;

