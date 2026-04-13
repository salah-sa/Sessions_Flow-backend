import React from "react";
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, ConnectionMode } from "../../store/stores";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";

// ═══════════════════════════════════════════════════════════
// Connection Status Banner — Degradation Engine UI
// ═══════════════════════════════════════════════════════════
// Shows ONLY when the system is in hybrid or degraded mode.
// Full mode = invisible (optimal).
// ═══════════════════════════════════════════════════════════

const ConnectionBanner: React.FC = () => {
  const { t } = useTranslation();
  const connectionMode = useAppStore((s) => s.connectionMode);
  const isOnline = useAppStore((s) => s.isOnline);

  // Full mode = no banner
  if (connectionMode === "full") return null;

  const isHybrid = connectionMode === "hybrid";
  const isDegraded = connectionMode === "degraded";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest select-none z-[100]",
          isHybrid
            ? "bg-amber-500/10 text-amber-400 border-b border-amber-500/10"
            : "bg-red-500/10 text-red-400 border-b border-red-500/10"
        )}
      >
        {isHybrid ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            {t("connection.reconnecting", "Reconnecting — messages will sync automatically")}
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            {isOnline
              ? t("connection.server_down", "Server unreachable — messages queued for delivery")
              : t("connection.offline", "You are offline — messages will send when reconnected")}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ConnectionBanner;
