import React, { useState, useEffect } from "react";
import { X, FileText, Loader2, Info, Zap, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Group } from "../../types";
import { useGroupMutations } from "../../queries/useGroupQueries";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════
// Group Description Editor Modal
// ═══════════════════════════════════════════════════════════
// Max 600 characters, with visual progress bar.
// Role-gated: only Admin/Engineer can edit.
// Uses updateMutation for persistence + real-time sync.
// ═══════════════════════════════════════════════════════════

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
      toast.success(t("chat.description_saved", "Description updated"));
      onClose();
    } catch {
      toast.error(t("chat.description_error", "Failed to update description"));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 xs:p-4 md:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg max-h-[90dvh] bg-[var(--ui-sidebar-bg)] border border-white/10 rounded-2xl xs:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[var(--ui-accent)]/5 via-transparent to-transparent pointer-events-none" />

            <div className="p-5 xs:p-6 md:p-8 flex items-center justify-between border-b border-white/5 relative z-10 flex-none">
              <div className="flex items-center gap-3 xs:gap-4">
                <div className="w-10 h-10 xs:w-12 xs:h-12 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/30 flex items-center justify-center text-[var(--ui-accent)]">
                  <Info className="w-5 h-5 xs:w-6 xs:h-6" />
                </div>
                <div>
                  <h3 className="text-sm xs:text-base font-bold text-white uppercase tracking-widest">{t("chat.group_info", "Group Info")}</h3>
                  <p className="text-[9px] xs:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Classification: Restricted</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2.5 xs:p-3 rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 hover:text-white transition-all"><X className="w-4 h-4 xs:w-5 xs:h-5" /></button>
            </div>

            <div className="p-5 xs:p-6 md:p-8 space-y-6 xs:space-y-8 overflow-y-auto custom-scrollbar overscroll-contain flex-1 relative z-10">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("chat.description_placeholder", "Add a description for this group...")}
                rows={5}
                className={cn(
                  "w-full bg-[var(--ui-sidebar-bg)]/60 border rounded-2xl px-5 py-4 text-sm text-slate-200 placeholder:text-slate-700 resize-none outline-none transition-all",
                  isOverLimit
                    ? "border-red-500/40 focus:ring-2 focus:ring-red-500/20"
                    : "border-white/10 focus:ring-2 focus:ring-[var(--ui-accent)]/20 focus:border-[var(--ui-accent)]/30"
                )}
              />

              <div className="space-y-2">
                <div className="h-1 rounded-full bg-[var(--ui-sidebar-bg)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isOverLimit
                        ? "bg-red-500"
                        : charPercent > 80
                        ? "bg-amber-500"
                        : "bg-[var(--ui-accent)]"
                    )}
                    style={{ width: `${Math.min(charPercent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      isOverLimit ? "text-red-400" : "text-slate-600"
                    )}
                  >
                    {charCount} / {MAX_CHARS}
                  </span>
                  {isOverLimit && (
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      {t("chat.char_limit_exceeded", "Character limit exceeded")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-4 xs:gap-5 items-start">
                <div className="w-9 h-9 xs:w-10 xs:h-10 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-500 shrink-0">
                  <Zap className="w-4 h-4 xs:w-5 xs:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] xs:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("chat.description", "Description")}</p>
                  <p className="text-xs xs:text-sm text-slate-300 mt-2 xs:mt-3 leading-relaxed break-words">{group.description || "NO DATA ENCRYPTED IN THIS MATRIX SECTOR."}</p>
                </div>
              </div>

              <div className="flex gap-4 xs:gap-5 items-start">
                <div className="w-9 h-9 xs:w-10 xs:h-10 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-500 shrink-0">
                  <Shield className="w-4 h-4 xs:w-5 xs:h-5" />
                </div>
                <div>
                  <p className="text-[9px] xs:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Security Protocol</p>
                  <p className="text-xs xs:text-sm text-slate-300 mt-2 xs:mt-3 leading-relaxed">Level {group.level || 1} Encryption Mandatory. Unauthorized access will trigger neural dampening.</p>
                </div>
              </div>
            </div>

            <div className="px-5 xs:px-6 md:px-8 py-5 border-t border-white/5 flex items-center justify-end gap-3 flex-none bg-black/20">
              <button
                onClick={onClose}
                className="h-10 xs:h-11 px-5 xs:px-6 rounded-xl bg-[var(--ui-surface)] text-slate-300 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all touch-target-min"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={isOverLimit || !hasChanged || updateMutation.isPending}
                className="h-10 xs:h-11 px-5 xs:px-6 rounded-xl bg-[var(--ui-accent)] text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--ui-accent)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 touch-target-min flex items-center gap-2"
              >
                {updateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                {t("common.save", "Save Changes")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GroupDescriptionModal;

