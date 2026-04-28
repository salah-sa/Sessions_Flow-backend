import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, CheckCircle2, Sparkles } from "lucide-react";
import { useAuthStore, useUIStore } from "../store/stores";
import { useTranslation } from "react-i18next";

export const StudentWelcomeModal: React.FC = () => {
  const { t } = useTranslation();
  const { user, hasAcknowledgedFreeModal, setHasAcknowledgedFreeModal } = useAuthStore();
  const { language } = useUIStore();

  if (!user || user.role !== "Student" || hasAcknowledgedFreeModal) {
    return null;
  }

  const isRtl = language === "ar";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {/* Top Decorative bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.2 }}
                  className="w-20 h-20 flex items-center justify-center bg-blue-500/10 rounded-full border border-blue-500/20"
                >
                  <GraduationCap className="w-10 h-10 text-blue-400" />
                </motion.div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-6 h-6 text-yellow-400 opacity-50" />
                </motion.div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                {isRtl ? "أهلاً بك يا بطل!" : "Welcome, Hero!"}
              </h2>
              
              <div className="p-6 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-3">
                <p className="text-lg leading-relaxed text-blue-100/90 font-medium">
                  {isRtl 
                    ? "🎓 هذه المنصة مجانية تماماً للطلاب." 
                    : "🎓 This platform is completely FREE for students."}
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  {isRtl 
                    ? "جميع المميزات متاحة لدعم رحلتك التعليمية. لا توجد اشتراكات مطلوبة." 
                    : "All features are available to support your learning journey. No subscriptions required."}
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setHasAcknowledgedFreeModal(true)}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {isRtl ? "تمام، فهمت" : "Got it, thanks!"}
                </motion.button>
              </div>
            </div>
          </div>
          
          {/* Subtle bottom text */}
          <div className="px-8 py-4 bg-zinc-950/50 border-t border-zinc-800/50 text-center">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">
              SessionFlow • Student Edition
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
