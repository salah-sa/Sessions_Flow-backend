import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Trash2, Loader2 } from "lucide-react";
import { Button } from "./index";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  entityName?: string;
  requireTyping?: boolean;
  confirmText?: string;
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  entityName,
  requireTyping = false,
  confirmText = "DELETE",
  isLoading = false,
}) => {
  const [typedValue, setTypedValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const canConfirm = requireTyping
    ? typedValue.toUpperCase() === confirmText.toUpperCase()
    : true;

  useEffect(() => {
    if (isOpen) {
      setTypedValue("");
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleConfirm = async () => {
    if (!canConfirm || isLoading) return;
    await onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md bg-ui-sidebar-bg/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Red accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500/40 via-rose-500 to-rose-500/40" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 end-4 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-slate-500 hover:text-white z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 pt-10">
              {/* Warning icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center"
                >
                  <motion.div
                    animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <AlertTriangle className="w-8 h-8 text-rose-500" />
                  </motion.div>
                </motion.div>
              </div>

              {/* Title */}
              <h2 className="text-center text-lg font-black text-white uppercase tracking-wider mb-2">
                {title}
              </h2>

              {/* Description */}
              {description && (
                <p className="text-center text-[13px] text-slate-400 mb-4 leading-relaxed">
                  {description}
                </p>
              )}

              {/* Entity name display */}
              {entityName && (
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 mb-6 text-center">
                  <span className="text-[13px] font-bold text-rose-400 break-all">
                    {entityName}
                  </span>
                </div>
              )}

              {/* Type-to-confirm */}
              {requireTyping && (
                <div className="mb-6 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                    Type <span className="text-rose-400">{confirmText}</span> to confirm
                  </p>
                  <input
                    ref={inputRef}
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                    className="w-full h-12 bg-ui-bg/60 border border-white/10 rounded-xl px-4 text-center text-[15px] font-bold text-white placeholder:text-slate-700 focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all"
                    placeholder={confirmText}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 bg-transparent border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl text-[11px] font-bold uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!canConfirm || isLoading}
                  className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 me-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDeleteModal;
