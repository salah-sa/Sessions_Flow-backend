import React, { useEffect, useState, useCallback } from "react";
import { Clock, X, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/stores";
import { useSubscriptionStatus } from "../../queries/useSubscriptionQueries";

// ── Helpers ─────────────────────────────────────────────────────────────────

interface Remaining {
  days: number; hours: number; minutes: number; seconds: number; expired: boolean;
}

function getRemainingParts(expiryDate: string | null | undefined): Remaining | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate).getTime();
  if (isNaN(expiry)) return null;
  const diffMs = expiry - Date.now();
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const totalSec = Math.floor(diffMs / 1000);
  return {
    days:    Math.floor(totalSec / 86400),
    hours:   Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    expired: false,
  };
}

type Urgency = "critical" | "warning" | "info" | "ok";

function getUrgency(days: number): Urgency {
  if (days <= 3)  return "critical";
  if (days <= 7)  return "warning";
  if (days <= 14) return "info";
  return "ok";
}

const STYLES: Record<Urgency, { bar: string; icon: string; badge: string; text: string; scan: string }> = {
  critical: {
    bar:   "bg-gradient-to-r from-red-950/95 via-red-900/85 to-red-950/95 border-red-700/50",
    icon:  "text-red-400",
    badge: "bg-red-500/20 border-red-500/40 text-red-300",
    text:  "text-red-200",
    scan:  "via-red-500/10",
  },
  warning: {
    bar:   "bg-gradient-to-r from-amber-950/95 via-amber-900/85 to-amber-950/95 border-amber-700/50",
    icon:  "text-amber-400",
    badge: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    text:  "text-amber-200",
    scan:  "via-amber-500/10",
  },
  info: {
    bar:   "bg-gradient-to-r from-blue-950/95 via-blue-900/85 to-blue-950/95 border-blue-700/50",
    icon:  "text-blue-400",
    badge: "bg-blue-500/20 border-blue-500/40 text-blue-300",
    text:  "text-blue-200",
    scan:  "via-blue-500/10",
  },
  ok: {
    bar:   "bg-gradient-to-r from-emerald-950/95 via-emerald-900/85 to-emerald-950/95 border-emerald-700/50",
    icon:  "text-emerald-400",
    badge: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    text:  "text-emerald-200",
    scan:  "via-emerald-500/10",
  },
};

// ── Digit cell ───────────────────────────────────────────────────────────────
const Digit: React.FC<{ value: number; label: string; urgency: Urgency }> = ({ value, label, urgency }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className={cn(
      "min-w-[32px] h-8 flex items-center justify-center rounded-lg border font-mono font-black text-sm tabular-nums",
      STYLES[urgency].badge
    )}>
      {String(value).padStart(2, "0")}
    </div>
    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
  </div>
);

// ── Separator ────────────────────────────────────────────────────────────────
const Sep: React.FC<{ urgency: Urgency }> = ({ urgency }) => (
  <span className={cn("text-base font-black leading-none pb-3", STYLES[urgency].text)}>:</span>
);

// ── Main Component ────────────────────────────────────────────────────────────

const DISMISS_KEY = "sf_expiry_banner_dismissed";
const RANK: Record<Urgency, number> = { ok: 0, info: 1, warning: 2, critical: 3 };

const SubscriptionExpiryBanner: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useSubscriptionStatus();

  // Dismiss state (per session, re-shows on urgency escalation)
  const [dismissed, setDismissed] = useState<Urgency | null>(
    () => sessionStorage.getItem(DISMISS_KEY) as Urgency | null
  );

  // Live countdown (refreshed every second)
  const [tick, setTick] = useState<Remaining | null>(null);

  useEffect(() => {
    setTick(getRemainingParts(data?.expiryDate));
  }, [data?.expiryDate]);

  useEffect(() => {
    if (!data?.expiryDate) return;
    const id = setInterval(() => setTick(getRemainingParts(data.expiryDate)), 1000);
    return () => clearInterval(id);
  }, [data?.expiryDate]);

  const dismiss = useCallback((u: Urgency) => {
    sessionStorage.setItem(DISMISS_KEY, u);
    setDismissed(u);
  }, []);

  // ── Guard chain ────────────────────────────────────────────────────────────

  // Must be logged in
  if (!user) return null;

  // Admins: no expiry concern
  if (user.role === "Admin") return null;

  // Avoid flash while loading
  if (isLoading) return null;

  // No API response yet
  if (!data) return null;

  // Use data.tier (API ground truth) — Zustand store can lag on first load
  const apiTier: string = data.tier ?? "Free";
  if (apiTier === "Free") return null;

  // Must have a valid expiry date
  const base = getRemainingParts(data.expiryDate);
  if (!base) return null;

  // Use live tick if available, else base
  const r: Remaining = tick ?? base;
  const urgency: Urgency = r.expired ? "critical" : getUrgency(r.days);

  // Dismiss: stay hidden unless urgency escalated since last dismissal
  if (dismissed && (RANK[dismissed] ?? -1) >= RANK[urgency]) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  const s = STYLES[urgency];
  const Icon = urgency === "critical" || urgency === "warning" ? AlertTriangle
             : urgency === "ok" ? CheckCircle2 : Clock;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "relative flex items-center gap-3 px-4 py-2 border-b overflow-hidden z-40",
        "animate-in slide-in-from-top duration-500",
        s.bar
      )}
    >
      {/* Shimmer */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r from-transparent to-transparent animate-scan pointer-events-none opacity-25",
        s.scan
      )} />

      {/* Plan badge */}
      <div className="flex items-center gap-2 shrink-0 relative z-10">
        <Icon className={cn("w-4 h-4 shrink-0", s.icon, urgency === "critical" && "animate-pulse")} />
        <span className={cn(
          "hidden sm:inline text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
          s.badge
        )}>
          {apiTier} Plan
        </span>
      </div>

      {/* Message + countdown */}
      <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-center gap-2 sm:gap-4 min-w-0 relative z-10">
        <p className={cn("text-xs font-semibold shrink-0", s.text)}>
          {r.expired ? "⚠️ Your subscription has expired."
           : urgency === "critical" ? "🚨 Expiring very soon!"
           : urgency === "warning"  ? "⏳ Expiring soon —"
           :                          "📅 Subscription expires in"}
        </p>

        {!r.expired && (
          <div className="flex items-center gap-1 shrink-0">
            <Digit value={r.days}    label="days" urgency={urgency} />
            <Sep urgency={urgency} />
            <Digit value={r.hours}   label="hrs"  urgency={urgency} />
            <Sep urgency={urgency} />
            <Digit value={r.minutes} label="min"  urgency={urgency} />
            <Sep urgency={urgency} />
            <Digit value={r.seconds} label="sec"  urgency={urgency} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 relative z-10">
        <a
          href="/subscription"
          className={cn(
            "hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold",
            "bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all whitespace-nowrap"
          )}
        >
          <Zap className="w-3 h-3" />
          {r.expired ? "Resubscribe" : "Renew Now"}
        </a>
        <button
          onClick={() => dismiss(urgency)}
          aria-label="Dismiss subscription expiry banner"
          className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default SubscriptionExpiryBanner;
