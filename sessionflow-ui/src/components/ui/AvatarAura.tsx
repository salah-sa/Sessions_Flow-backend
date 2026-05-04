import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { usePresenceStore, PresenceStatus } from "../../store/presenceStore";
import { formatDistanceToNow } from "date-fns";

interface AvatarAuraProps {
  userId: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { ring: "w-8 h-8", dot: "w-2 h-2", dotPos: "-bottom-0.5 -end-0.5" },
  md: { ring: "w-10 h-10", dot: "w-2.5 h-2.5", dotPos: "-bottom-0.5 -end-0.5" },
  lg: { ring: "w-14 h-14", dot: "w-3 h-3", dotPos: "bottom-0 end-0" },
};

const STATUS_AURA: Record<PresenceStatus | "unknown", {
  shadow: string;
  dotColor: string;
  animation: string;
  label: string;
}> = {
  online: {
    shadow: "shadow-[0_0_0_2px_rgba(34,197,94,0.15),0_0_12px_4px_rgba(34,197,94,0.10)]",
    dotColor: "bg-emerald-500",
    animation: "animate-[aura-breathe_3s_ease-in-out_infinite]",
    label: "Online",
  },
  away: {
    shadow: "shadow-[0_0_0_2px_rgba(245,158,11,0.15),0_0_10px_3px_rgba(245,158,11,0.08)]",
    dotColor: "bg-amber-500",
    animation: "animate-[aura-pulse-fast_1.5s_ease-in-out_infinite]",
    label: "Away",
  },
  offline: {
    shadow: "",
    dotColor: "bg-slate-600",
    animation: "",
    label: "Offline",
  },
  unknown: {
    shadow: "",
    dotColor: "bg-slate-700",
    animation: "",
    label: "Unknown",
  },
};

const AvatarAura: React.FC<AvatarAuraProps> = ({
  userId,
  children,
  size = "md",
  showTooltip = true,
  className,
}) => {
  const presence = usePresenceStore((s) => s.getPresence(userId));
  const [hover, setHover] = React.useState(false);
  const s = SIZE_MAP[size];
  const aura = STATUS_AURA[presence.status] || STATUS_AURA.unknown;

  const lastSeenText = presence.lastSeen
    ? formatDistanceToNow(presence.lastSeen, { addSuffix: true })
    : "Unknown";

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Aura ring layer */}
      <div
        className={cn(
          "rounded-full transition-shadow duration-700",
          aura.shadow,
          aura.animation,
          presence.status === "offline" && "grayscale-[30%]"
        )}
      >
        {children}
      </div>

      {/* Status dot */}
      <div className={cn("absolute z-20", s.dotPos)}>
        <div
          className={cn(
            s.dot,
            "rounded-full border-2 border-[var(--ui-bg)] transition-all duration-500",
            aura.dotColor
          )}
        >
          {presence.status === "online" && (
            <motion.div
              animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-emerald-500"
            />
          )}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && hover && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-[#0c0c14]/95 backdrop-blur-xl border border-white/10 shadow-2xl whitespace-nowrap pointer-events-none"
        >
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", aura.dotColor)} />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
              {aura.label}
            </span>
          </div>
          {presence.status !== "online" && presence.lastSeen > 0 && (
            <p className="text-[9px] text-slate-500 mt-1">
              Last seen {lastSeenText}
            </p>
          )}
          {presence.status === "online" && (
            <p className="text-[9px] text-emerald-500/70 mt-1">
              Active now
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AvatarAura;
