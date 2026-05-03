import React, { useEffect, useState, useCallback } from "react";
import { Clock, X, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore, selectEffectiveTier } from "../../store/stores";
import { useSubscriptionStatus } from "../../queries/useSubscriptionQueries";

// ── Helpers ─────────────────────────────────────────────────────────────────

function getRemainingParts(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const diffMs = expiry - now;
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const totalSec = Math.floor(diffMs / 1000);
  const days    = Math.floor(totalSec / 86400);
  const hours   = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, expired: false };
}

type Urgency = "critical" | "warning" | "info" | "ok";

function getUrgency(days: number): Urgency {
  if (days <= 0)  return "critical";
  if (days <= 3)  return "critical";
  if (days <= 7)  return "warning";
  if (days <= 14) return "info";
  return "ok";
}

const URGENCY_STYLES: Record<Urgency, {
  bar: string; glow: string; icon: string;
  badge: string; text: string; scan: string;
}> = {
  critical: {
    bar:   "bg-gradient-to-r from-red-950/90 via-red-900/80 to-red-950/90 border-red-700/40",
    glow:  "from-red-500/20",
    icon:  "text-red-400",
    badge: "bg-red-500/20 border-red-500/40 text-red-300",
    text:  "text-red-200",
    scan:  "via-red-500/10",
  },
  warning: {
    bar:   "bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-amber-950/90 border-amber-700/40",
    glow:  "from-amber-500/20",
    icon:  "text-amber-400",
    badge: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    text:  "text-amber-200",
    scan:  "via-amber-500/10",
  },
  info: {
    bar:   "bg-gradient-to-r from-blue-950/90 via-blue-900/80 to-blue-950/90 border-blue-700/40",
    glow:  "from-blue-500/20",
    icon:  "text-blue-400",
    badge: "bg-blue-500/20 border-blue-500/40 text-blue-300",
    text:  "text-blue-200",
    scan:  "via-blue-500/10",
  },
  ok: {
    bar:   "bg-gradient-to-r from-emerald-950/90 via-emerald-900/80 to-emerald-950/90 border-emerald-700/40",
    glow:  "from-emerald-500/20",
    icon:  "text-emerald-400",
    badge: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    text:  "text-emerald-200",
    scan:  "via-emerald-500/10",
  },
};

// Flip-style digit cell
const Digit: React.FC<{ value: number; label: string; urgency: Urgency }> = ({ value, label, urgency }) => {
  const styles = URGENCY_STYLES[urgency];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={cn(
        "min-w-[32px] h-8 flex items-center justify-center rounded-lg border font-mono font-black text-sm tabular-nums",
        styles.badge
      )}>
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

const SESSION_DISMISS_KEY = "sf_expiry_banner_dismissed";

const SubscriptionExpiryBanner: React.FC = () => {
  const user     = useAuthStore((s) => s.user);
  const tier     = useAuthStore(selectEffectiveTier);
  const { data } = useSubscriptionStatus();

  // Per-session dismiss (clears on page reload, re-shows if urgency escalates)
  const [dismissed, setDismissed] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_DISMISS_KEY)
  );

  // Live countdown
  const [remaining, setRemaining] = useState(() => getRemainingParts(data?.expiryDate));

  useEffect(() => {
    setRemaining(getRemainingParts(data?.expiryDate));
  }, [data?.expiryDate]);

  useEffect(() => {
    if (!data?.expiryDate) return;
    const id = setInterval(() => {
      setRemaining(getRemainingParts(data.expiryDate));
    }, 1000);
    return () => clearInterval(id);
  }, [data?.expiryDate]);

  const dismiss = useCallback((urgencyKey: string) => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, urgencyKey);
    setDismissed(urgencyKey);
  }, []);

  // ── Visibility rules ─────────────────────────────────────────────────────

  // Admins have Enterprise forever — no banner
  if (!user || user.role === "Admin") return null;

  // Free / no active subscription — no expiry banner needed
  if (!data || !data.expiryDate || data.status === "None" || tier === "Free") return null;

  if (!remaining) return null;

  const urgency = remaining.expired ? "critical" : getUrgency(remaining.days);

  // Only show if ≤ 30 days (or expired) — silent when plenty of time and urgency=ok with days > 30
  if (!remaining.expired && remaining.days > 30) return null;

  // If user already dismissed this urgency level for this session, stay hidden
  // But re-show if urgency escalated (e.g. from "info" to "critical")
  const urgencyRank: Record<Urgency, number> = { ok: 0, info: 1, warning: 2, critical: 3 };
  if (dismissed) {
    const dismissedRank = urgencyRank[dismissed as Urgency] ?? -1;
    if (dismissedRank >= urgencyRank[urgency]) return null;
  }

  const styles = URGENCY_STYLES[urgency];
  const UrgencyIcon = urgency === "critical" || urgency === "warning" ? AlertTriangle
    : urgency === "ok" ? CheckCircle2 : Clock;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-2 border-b overflow-hidden",
        "animate-in slide-in-from-top duration-500",
        styles.bar
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Background scan animation */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r from-transparent to-transparent animate-scan pointer-events-none opacity-40",
        styles.scan
      )} />

      {/* Left: icon + tier badge */}
      <div className="flex items-center gap-2 shrink-0">
        <UrgencyIcon className={cn("w-4 h-4 shrink-0", styles.icon,
          urgency === "critical" && "animate-pulse"
        )} />
        <span className={cn(
          "hidden sm:inline text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
          styles.badge
        )}>
          {tier} Plan
        </span>
      </div>

      {/* Center: message + countdown */}
      <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-center gap-2 sm:gap-4 min-w-0">
        <p className={cn("text-xs font-semibold shrink-0", styles.text)}>
          {remaining.expired
            ? "⚠️ Your subscription has expired."
            : urgency === "critical"
            ? "🚨 Subscription expiring very soon!"
            : urgency === "warning"
            ? "⏳ Subscription expiring soon"
            : "📅 Subscription expires in"}
        </p>

        {!remaining.expired && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Digit value={remaining.days}    label="d"   urgency={urgency} />
            <span className={cn("text-lg font-black leading-none pb-3", styles.text)}>:</span>
            <Digit value={remaining.hours}   label="hr"  urgency={urgency} />
            <span className={cn("text-lg font-black leading-none pb-3", styles.text)}>:</span>
            <Digit value={remaining.minutes} label="min" urgency={urgency} />
            <span className={cn("text-lg font-black leading-none pb-3", styles.text)}>:</span>
            <Digit value={remaining.seconds} label="sec" urgency={urgency} />
          </div>
        )}
      </div>

      {/* Right: CTA + dismiss */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/subscription"
          className={cn(
            "hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold",
            "bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all",
            "whitespace-nowrap"
          )}
        >
          <Zap className="w-3 h-3" />
          Renew Now
        </a>
        <button
          onClick={() => dismiss(urgency)}
          aria-label="Dismiss banner"
          className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default SubscriptionExpiryBanner;
