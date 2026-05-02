import React from "react";
import { Zap, Sparkles, Crown, GraduationCap } from "lucide-react";
import { cn } from "../../lib/utils";

type Tier = "Free" | "Pro" | "Ultra" | "Enterprise" | "Student";

interface PlanBadgeProps {
  tier: Tier | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TIER_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  gradient: string;
  glow?: string;
  textColor: string;
}> = {
  Free: {
    label: "Free",
    icon: () => null,
    gradient: "bg-slate-800 border-slate-700",
    textColor: "text-slate-400",
  },
  Pro: {
    label: "Pro",
    icon: Zap,
    gradient: "bg-gradient-to-r from-blue-600/20 to-violet-600/20 border-blue-500/40",
    glow: "shadow-[0_0_12px_rgba(99,102,241,0.3)]",
    textColor: "text-blue-300",
  },
  Ultra: {
    label: "Ultra",
    icon: Sparkles,
    gradient: "bg-gradient-to-r from-violet-600/20 to-pink-600/20 border-violet-500/40",
    glow: "shadow-[0_0_16px_rgba(167,139,250,0.4)]",
    textColor: "text-violet-300",
  },
  Enterprise: {
    label: "Enterprise",
    icon: Crown,
    gradient: "bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-500/40",
    glow: "shadow-[0_0_16px_rgba(251,191,36,0.35)]",
    textColor: "text-amber-300",
  },
  Student: {
    label: "Student",
    icon: GraduationCap,
    gradient: "bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-500/40",
    textColor: "text-emerald-300",
  },
};

const SIZE_CONFIG = {
  sm: { padding: "px-2 py-0.5", text: "text-[9px]", icon: "w-2.5 h-2.5", gap: "gap-1" },
  md: { padding: "px-2.5 py-1",  text: "text-[10px]", icon: "w-3 h-3",   gap: "gap-1.5" },
  lg: { padding: "px-3 py-1.5",  text: "text-[11px]", icon: "w-3.5 h-3.5", gap: "gap-1.5" },
};

export const PlanBadge: React.FC<PlanBadgeProps> = ({
  tier,
  size = "md",
  className,
}) => {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.Free;
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold uppercase tracking-widest transition-all",
        config.gradient,
        config.glow,
        config.textColor,
        sizeConfig.padding,
        sizeConfig.text,
        sizeConfig.gap,
        className
      )}
    >
      <Icon className={sizeConfig.icon} />
      {config.label}
    </span>
  );
};
