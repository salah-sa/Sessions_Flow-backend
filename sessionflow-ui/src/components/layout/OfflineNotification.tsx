import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, AlertTriangle, CheckCircle, X, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/stores";
import { useShallow } from "zustand/shallow";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { Button } from "../ui";

const OfflineNotification: React.FC = () => {
  const { t } = useTranslation();
  const { 
    networkQuality, 
    userDismissedOffline, 
    dismissOfflineModal,
    showConnectionPopup,
    setConnectionPopup 
  } = useAppStore(useShallow((s) => ({
    networkQuality: s.networkQuality,
    userDismissedOffline: s.userDismissedOffline,
    dismissOfflineModal: s.dismissOfflineModal,
    showConnectionPopup: s.showConnectionPopup,
    setConnectionPopup: s.setConnectionPopup,
  })));

  const [lastQuality, setLastQuality] = useState(networkQuality);
  const [internalVisible, setInternalVisible] = useState(false);

  // Auto-show logic
  useEffect(() => {
    if (networkQuality === "offline" && !userDismissedOffline) {
      setInternalVisible(true);
    } else if (networkQuality === "weak") {
      setInternalVisible(true);
    } else if (networkQuality === "strong" && lastQuality !== "strong" && lastQuality !== "offline") {
      // Show reconnection success
      setInternalVisible(true);
      const timer = setTimeout(() => {
        setInternalVisible(false);
        setConnectionPopup(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
    setLastQuality(networkQuality);
  }, [networkQuality, userDismissedOffline, lastQuality, setConnectionPopup]);

  // Sync with store popup trigger
  useEffect(() => {
    if (showConnectionPopup) {
      setInternalVisible(true);
    }
  }, [showConnectionPopup]);

  const handleClose = () => {
    setInternalVisible(false);
    setConnectionPopup(false);
    if (networkQuality === "offline") {
      dismissOfflineModal();
    }
  };

  if (!internalVisible && !showConnectionPopup) return null;

  const getStatusConfig = () => {
    switch (networkQuality) {
      case "offline":
        return {
          title: t("connection.popup_title_offline", "Connection Lost"),
          desc: t("connection.popup_desc_offline", "Your link to the neural network has been severed. Some features are restricted until synchronization is restored."),
          theme: "rose",
          icon: (
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full"
              />
              <WifiOff className="w-16 h-16 text-rose-500 relative z-10" />
            </div>
          )
        };
      case "weak":
        return {
          title: t("connection.popup_title_weak", "Unstable Frequency"),
          desc: t("connection.popup_desc_weak", "The current data stream is experiencing high latency. Operational efficiency may be degraded."),
          theme: "amber",
          icon: (
            <div className="relative">
               <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 border border-dashed border-amber-500/30 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Wifi className="w-16 h-16 text-amber-500 relative z-10" />
              </motion.div>
            </div>
          )
        };
      case "strong":
      default:
        return {
          title: t("connection.popup_title_strong", "Link Synchronized"),
          desc: t("connection.popup_desc_strong", "High-fidelity neural connection re-established. All systems operational."),
          theme: "emerald",
          icon: (
             <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
              <CheckCircle className="w-16 h-16 text-emerald-500 relative z-10" />
            </motion.div>
          )
        };
    }
  };

  const config = getStatusConfig();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-[420px] bg-[var(--ui-sidebar-bg)] border border-white/10 rounded-[32px] p-10 overflow-hidden shadow-2xl"
        >
          {/* Decorative gradients */}
          <div className={cn(
            "absolute top-0 right-0 w-48 h-48 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 opacity-20",
            config.theme === "rose" ? "bg-rose-500" : config.theme === "amber" ? "bg-amber-500" : "bg-emerald-500"
          )} />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-8">
              {config.icon}
            </div>

            <h2 className="text-2xl font-sora font-black text-white uppercase tracking-tighter mb-4">
              {config.title}
            </h2>
            
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 px-2">
              {config.desc}
            </p>

            <Button
              onClick={handleClose}
              className={cn(
                "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg",
                config.theme === "rose" ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20" :
                config.theme === "amber" ? "bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20" :
                "bg-white hover:bg-slate-100 text-black shadow-white/10"
              )}
            >
              {networkQuality === "strong" ? t("common.continue", "Dismiss") : t("connection.ok_button", "Acknowledge")}
            </Button>

            {networkQuality !== "strong" && (
              <p className="mt-6 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Info className="w-3 h-3" />
                Secondary systems remain active locally
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OfflineNotification;
