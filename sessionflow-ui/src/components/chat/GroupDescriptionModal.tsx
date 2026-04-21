import React, { useState, useEffect } from "react";
import { X, FileText, Loader2 } from "lucide-react";
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-[var(--ui-bg)] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[var(--ui-accent)]" />
                </div>
                <div>
                  <h3 className="text-sm font-sora font-black text-white uppercase tracking-widest">
                    {t("chat.edit_description", "Edit Description")}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                    {group.name}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-4">
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

              {/* Character counter + progress bar */}
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
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-white/5 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="h-10 px-6 rounded-xl bg-[var(--ui-surface)] text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanged || isOverLimit || updateMutation.isPending}
                className={cn(
                  "h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                  hasChanged && !isOverLimit
                    ? "bg-[var(--ui-accent)] text-white hover:opacity-90 shadow-lg shadow-[var(--ui-accent)]/20"
                    : "bg-[var(--ui-surface)] text-slate-600 cursor-not-allowed"
                )}
              >
                {updateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                {t("common.save", "Save")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GroupDescriptionModal;

