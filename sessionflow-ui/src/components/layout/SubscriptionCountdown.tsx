import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Timer, Zap, Crown, Infinity } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore, selectEffectiveTier } from "../../store/stores";
import { useSubscriptionStatus } from "../../queries/useSubscriptionQueries";

// ── Helpers ──────────────────────────────────────────────────────────────────

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  expired: boolean;
}

function calcRemaining(expiryDate: string | null | undefined): Remaining | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate).getTime();
  if (isNaN(expiry)) return null;
  const diffMs = expiry - Date.now();
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true };
  const totalSec = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    totalMs: diffMs,
    expired: false,
  };
}

type Urgency = "critical" | "warning" | "info" | "ok";

function getUrgency(days: number): Urgency {
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  if (days <= 14) return "info";
  return "ok";
}

// ── Style Map ────────────────────────────────────────────────────────────────

const URGENCY_STYLES: Record<Urgency, {
  bg: string;
  border: string;
  text: string;
  glow: string;
  icon: string;
}> = {
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.25)]",
    icon: "text-red-400",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    icon: "text-amber-400",
  },
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    text: "text-blue-400",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.15)]",
    icon: "text-blue-400",
  },
  ok: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    text: "text-emerald-400",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.15)]",
    icon: "text-emerald-400",
  },
};

// Max date check (Admin sentinel: DateTime.MaxValue ≈ year 9999)
const isUnlimitedExpiry = (expiryDate: string | null | undefined): boolean => {
  if (!expiryDate) return false;
  const year = new Date(expiryDate).getFullYear();
  return year > 9000;
};

// ── Component ────────────────────────────────────────────────────────────────

const SubscriptionCountdown: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const effectiveTier = useAuthStore(selectEffectiveTier);
  const { data, isLoading } = useSubscriptionStatus();

  const [tick, setTick] = useState<Remaining | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Live tick every second
  useEffect(() => {
    if (!data?.expiryDate) return;
    setTick(calcRemaining(data.expiryDate));
    const id = setInterval(() => setTick(calcRemaining(data.expiryDate)), 1000);
    return () => clearInterval(id);
  }, [data?.expiryDate]);

  // ── Guard chain ────────────────────────────────────────────────────────────

  // Must be authenticated
  if (!user) return null;

  // Hide during initial load to prevent flash
  if (isLoading) return null;

  // No data yet
  if (!data) return null;

  const apiTier = data.tier ?? "Free";

  // Free tier: no subscription to count
  if (apiTier === "Free") return null;

  // Unlimited sentinel (DateTime.MaxValue edge case — no real expiry)
  if (isUnlimitedExpiry(data?.expiryDate)) return null;

  // Paid tier but no expiry data
  const r = tick ?? calcRemaining(data.expiryDate);
  if (!r) return null;

  const urgency: Urgency = r.expired ? "critical" : getUrgency(r.days);
  const s = URGENCY_STYLES[urgency];

  // Format compact display
  const compactTime = r.expired
    ? "EXPIRED"
    : r.days > 0
      ? `${r.days}D ${r.hours}H`
      : r.hours > 0
        ? `${r.hours}H ${r.minutes}M`
        : `${r.minutes}M ${r.seconds}S`;

  // Full tooltip breakdown
  const fullTime = r.expired
    ? "Subscription has expired"
    : `${r.days} days, ${r.hours} hours, ${r.minutes} minutes, ${r.seconds} seconds remaining`;

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => navigate("/plans")}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all",
          "hover:scale-[1.03] active:scale-[0.97]",
          s.bg, s.border, s.glow,
          urgency === "critical" && "animate-pulse"
        )}
        title={fullTime}
      >
        <Timer className={cn("w-3.5 h-3.5 shrink-0", s.icon)} />
        <span className={cn("text-[10px] font-black tabular-nums tracking-tight whitespace-nowrap", s.text)}>
          {compactTime}
        </span>
        {!r.expired && (
          <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest hidden lg:inline">
            Left
          </span>
        )}
      </button>

      {/* Hover tooltip with full breakdown */}
      {showTooltip && !r.expired && (
        <div className={cn(
          "absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[100]",
          "bg-[#0c0c14]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3",
          "shadow-2xl shadow-black/40 pointer-events-none",
          "animate-in fade-in zoom-in-95 duration-200"
        )}>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center whitespace-nowrap">
            {apiTier} Plan — Time Remaining
          </p>
          <div className="flex items-center gap-2">
            {[
              { value: r.days, label: "Days" },
              { value: r.hours, label: "Hrs" },
              { value: r.minutes, label: "Min" },
              { value: r.seconds, label: "Sec" },
            ].map((unit, i) => (
              <React.Fragment key={unit.label}>
                {i > 0 && <span className={cn("text-xs font-black pb-3", s.text)}>:</span>}
                <div className="flex flex-col items-center gap-0.5">
                  <div className={cn(
                    "min-w-[28px] h-7 flex items-center justify-center rounded-lg border",
                    "font-mono font-black text-xs tabular-nums",
                    s.bg, s.border, s.text
                  )}>
                    {String(unit.value).padStart(2, "0")}
                  </div>
                  <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">
                    {unit.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
          <p className="text-[8px] text-center text-slate-600 mt-2">Click to manage subscription</p>
          {/* Arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0c0c14]/95 border-l border-t border-white/10 rotate-45" />
        </div>
      )}
    </div>
  );
};

export default SubscriptionCountdown;
