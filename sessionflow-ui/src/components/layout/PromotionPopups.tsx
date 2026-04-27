import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Star, X, CheckCircle } from "lucide-react";
import { useAuthStore } from "../../store/stores";
import { sounds } from "../../lib/sounds";
import { cn } from "../../lib/utils";

export const PromotionPopups: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [showUltraWelcome, setShowUltraWelcome] = useState(false);
  const [showEngineerPromo, setShowEngineerPromo] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Student Ultra Welcome logic
    if (user.role === "Student" && user.subscriptionTier === "Ultra") {
      const hasSeenWelcome = sessionStorage.getItem(`ultra_welcome_${user.id}`);
      if (!hasSeenWelcome) {
        setTimeout(() => {
          setShowUltraWelcome(true);
          sounds.playSessionComplete();
          sessionStorage.setItem(`ultra_welcome_${user.id}`, "true");
        }, 1500);
      }
    }

    // Engineer Promo logic
    if (user.role === "Engineer") {
      const lastPromoTime = localStorage.getItem(`engineer_promo_${user.id}`);
      const now = Date.now();
      // Show every 24 hours or once per login? Requirement says "A popup... for Engineers... with a 3-second fade-out."
      // Let's show it once per session for now to avoid spamming.
      const hasSeenPromo = sessionStorage.getItem(`engineer_promo_session_${user.id}`);
      
      if (!hasSeenPromo) {
        setTimeout(() => {
          setShowEngineerPromo(true);
          sounds.playNotification();
          sessionStorage.setItem(`engineer_promo_session_${user.id}`, "true");
          
          // Auto-hide after 3 seconds as mandated
          setTimeout(() => {
            setShowEngineerPromo(false);
          }, 3000);
        }, 2500);
      }
    }
  }, [user]);

  return (
    <>
      {/* Student Ultra Welcome Popup */}
      <AnimatePresence>
        {showUltraWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 to-black border border-amber-500/30 rounded-[2.5rem] p-10 shadow-[0_0_100px_rgba(245,158,11,0.2)] overflow-hidden"
            >
              {/* Animated Background Orbs */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1],
                    rotate: [0, 90, 0]
                  }}
                  transition={{ duration: 10, repeat: Infinity }}
                  className="absolute -top-1/2 -left-1/2 w-full h-full bg-amber-500/20 blur-[120px] rounded-full" 
                />
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 blur-2xl opacity-20"
                  />
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-2xl relative">
                    <Zap className="w-12 h-12 text-white fill-white shadow-inner" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30"
                  >
                    <Star className="w-4 h-4 text-white fill-white" />
                  </motion.div>
                </div>

                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
                  Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">Ultra Member</span>
                </h2>
                
                <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-sm">
                  You now have access to premium session analytics, priority chat, and exclusive learning resources.
                </p>

                <div className="grid grid-cols-2 gap-4 w-full mb-10">
                  {[
                    { label: "Priority Queue", icon: Sparkles },
                    { label: "Advanced Data", icon: Star },
                  ].map((feat, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-white/5 border border-white/10">
                      <feat.icon className="w-5 h-5 text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{feat.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowUltraWelcome(false)}
                  className="w-full py-5 rounded-3xl bg-white text-black font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-white/10"
                >
                  Enter Experience
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Engineer Promo Popup (3-second fade-out) */}
      <AnimatePresence>
        {showEngineerPromo && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.8 } }}
            className="fixed bottom-10 right-10 z-[1000] w-full max-w-sm"
          >
            <div className="relative p-6 bg-slate-900/90 backdrop-blur-2xl border border-blue-500/30 rounded-[2rem] shadow-[0_20px_50px_rgba(59,130,246,0.3)] overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-indigo-600" />
              
              <div className="flex gap-5 items-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <Star className="w-7 h-7 text-blue-400 fill-blue-400/20 animate-pulse" />
                </div>
                
                <div className="flex flex-col min-w-0">
                  <h4 className="text-white font-black text-sm uppercase tracking-widest mb-1">Elite Performance</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Engineer dashboard upgraded with real-time sync and one-click session logs.
                  </p>
                </div>
              </div>

              {/* Progress bar for the 3-second duration */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-blue-500/50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
