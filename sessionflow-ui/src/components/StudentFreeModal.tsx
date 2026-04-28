import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Sparkles, X } from "lucide-react";

/**
 * StudentFreeModal — Shown once per browser session to students.
 * Communicates that the platform is completely free for students.
 * Dismissed state is stored in sessionStorage (reappears on new tab).
 */
const StudentFreeModal: React.FC = () => {
  const [visible, setVisible] = useState(
    !sessionStorage.getItem("student_modal_dismissed")
  );

  const dismiss = () => {
    sessionStorage.setItem("student_modal_dismissed", "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full bg-[var(--ui-sidebar-bg)] border border-white/10 rounded-2xl p-8 text-center shadow-2xl"
          >
            <button
              onClick={dismiss}
              className="absolute top-4 end-4 text-slate-600 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/30 flex items-center justify-center mb-6">
              <GraduationCap className="w-8 h-8 text-[var(--ui-accent)]" />
            </div>

            <h2 className="text-xl font-bold text-white uppercase tracking-wide mb-3 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--ui-accent)]" />
              Completely FREE
              <Sparkles className="w-5 h-5 text-[var(--ui-accent)]" />
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              This platform is <span className="text-white font-semibold">completely FREE</span> for students.
              All features are available to support your learning journey.
              <span className="text-[var(--ui-accent)] font-semibold"> No subscriptions required.</span>
            </p>

            <button
              onClick={dismiss}
              className="w-full py-3 rounded-xl bg-[var(--ui-accent)] text-white font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all"
            >
              Got it ✓
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StudentFreeModal;
