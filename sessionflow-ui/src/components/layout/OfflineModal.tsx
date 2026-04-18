import React, { useEffect, useState } from "react";
import { WifiOff, Loader2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/stores";
import { useShallow } from "zustand/shallow";
import { Button } from "../ui";

const OfflineModal: React.FC = () => {
  const { isOnline, connectionMode, userDismissedOffline, dismissOfflineModal } = useAppStore(useShallow((s) => ({
    isOnline: s.isOnline, connectionMode: s.connectionMode,
    userDismissedOffline: s.userDismissedOffline, dismissOfflineModal: s.dismissOfflineModal,
  })));
  const [retrySpin, setRetrySpin] = useState(false);

  // Show if: (Offline OR in Degraded mode) AND the user hasn't explicitly dismissed it for this downtime event.
  const isDisconnected = !isOnline || connectionMode === "degraded";
  const shouldShow = isDisconnected && !userDismissedOffline;

  useEffect(() => {
    if (!shouldShow) return;
    
    // Simulate periodic retry visual spin
    const interval = setInterval(() => {
      setRetrySpin(true);
      setTimeout(() => setRetrySpin(false), 1500);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [shouldShow]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-var(--ui-bg)/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative bg-var(--ui-sidebar-bg) border border-white/10 shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-3xl rounded-full" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 blur-3xl rounded-full" />

            <div className="flex flex-col items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center relative">
                <WifiOff className="w-10 h-10 text-red-500" />
                <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping opacity-50" style={{ animationDuration: '3s' }} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-sora font-black text-white uppercase tracking-wider">
                  Connection Lost
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  The server is unreachable. Real-time updates are paused. You can go offline to view cached data.
                </p>
              </div>

              <div className="flex flex-col w-full gap-3 mt-2">
                <Button 
                  onClick={dismissOfflineModal}
                  variant="primary"
                  className="w-full h-12 text-[11px] font-black uppercase tracking-widest"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Continue Offline
                </Button>
                
                <div className="h-4 flex items-center justify-center mt-2">
                  <AnimatePresence mode="wait">
                    {retrySpin ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest"
                      >
                        <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                        Retrying...
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-slate-600 text-[10px] uppercase font-bold tracking-widest"
                      >
                        Auto-reconnect active
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OfflineModal;

