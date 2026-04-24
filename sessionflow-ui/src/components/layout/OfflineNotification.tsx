import React, { useEffect, useState, useRef } from "react";
import { Wifi, WifiOff, CheckCircle, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/stores";
import { useShallow } from "zustand/shallow";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

const OfflineNotification: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  
  const { 
    networkQuality, 
    userDismissedOffline, 
    dismissOfflineModal
  } = useAppStore(useShallow((s) => ({
    networkQuality: s.networkQuality,
    userDismissedOffline: s.userDismissedOffline,
    dismissOfflineModal: s.dismissOfflineModal,
  })));

  const [visible, setVisible] = useState(false);
  const [activeType, setActiveType] = useState<"offline" | "weak" | "restored" | null>(null);
  const prevQualityRef = useRef(networkQuality);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const prev = prevQualityRef.current;
    
    // Logic: Transition from Offline -> Online (Good/Excellent)
    if (prev === "offline" && (networkQuality === "good" || networkQuality === "excellent")) {
      showToast("restored", 5000);
    } 
    // Logic: Transition to Offline
    else if (networkQuality === "offline" && !userDismissedOffline) {
      showToast("offline", 0); // Persistent until reconnected or dismissed
    }
    // Logic: Transition to Weak
    else if (networkQuality === "weak" && prev !== "weak") {
      showToast("weak", 6000);
    }
    // Logic: If reconnected while "offline" toast is showing, auto-switch to "restored"
    else if (activeType === "offline" && (networkQuality === "good" || networkQuality === "excellent")) {
        showToast("restored", 5000);
    }

    prevQualityRef.current = networkQuality;
  }, [networkQuality, userDismissedOffline]);

  const showToast = (type: "offline" | "weak" | "restored", duration: number) => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    
    setActiveType(type);
    setVisible(true);

    if (duration > 0) {
      autoHideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, duration);
    }
  };

  const handleClose = () => {
    setVisible(false);
    if (activeType === "offline") {
      dismissOfflineModal();
    }
  };

  const getConfig = () => {
    switch (activeType) {
      case "offline":
        return {
          title: t("connection.toast_title_offline", "Connection Lost"),
          desc: t("connection.toast_desc_offline", "We'll keep things ready for when you're back 💫"),
          color: "rose",
          icon: <WifiOff className="w-5 h-5 text-rose-400" />,
          showProgress: false
        };
      case "weak":
        return {
          title: t("connection.toast_title_weak", "Unstable Frequency"),
          desc: t("connection.toast_desc_weak", "Adapting to keep your experience smooth..."),
          color: "amber",
          icon: <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />,
          showProgress: true,
          duration: 6000
        };
      case "restored":
      default:
        return {
          title: t("connection.toast_title_restored", "Link Restored"),
          desc: t("connection.toast_desc_restored", "Welcome back! Everything is synced 🎉"),
          color: "emerald",
          icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
          showProgress: true,
          duration: 5000
        };
    }
  };

  if (!visible || !activeType) return null;
  const config = getConfig();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)", transition: { duration: 0.2 } }}
        className={cn(
          "fixed z-[9999] bottom-6 flex items-center gap-4 p-4 pr-5 rounded-[24px]",
          "bg-[#0A0A0B]/80 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden",
          "w-full max-w-[380px]",
          isRTL ? "left-6" : "right-6"
        )}
      >
        {/* Animated Background Pulse */}
        <div className={cn(
            "absolute -left-10 -top-10 w-32 h-32 blur-[40px] rounded-full opacity-20",
            config.color === "rose" ? "bg-rose-500" : config.color === "amber" ? "bg-amber-500" : "bg-emerald-500"
        )} />

        <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/5",
            config.color === "rose" ? "bg-rose-500/10" : config.color === "amber" ? "bg-amber-500/10" : "bg-emerald-500/10"
        )}>
          {config.icon}
        </div>

        <div className="flex-1 space-y-0.5">
          <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-white">
            {config.title}
          </h4>
          <p className="text-[10px] font-bold text-slate-500 leading-tight">
            {config.desc}
          </p>
        </div>

        <button 
          onClick={handleClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Auto-dismiss progress bar */}
        {config.showProgress && (
          <motion.div 
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: (config.duration || 5000) / 1000, ease: "linear" }}
            className={cn(
                "absolute bottom-0 left-0 h-[2px]",
                config.color === "rose" ? "bg-rose-500" : config.color === "amber" ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineNotification;
