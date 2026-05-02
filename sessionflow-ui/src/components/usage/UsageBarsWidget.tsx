import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getTodayUsage, UsageSummary, ResourceUsage } from "../../api/newFeatures";
import { MessageSquare, Image, Video, FileText, CalendarCheck, Users, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";

interface UsageBarsWidgetProps {
  compact?: boolean;
  className?: string;
}

interface BarConfig {
  key: keyof Pick<UsageSummary, "messages" | "images" | "videos" | "files" | "attendance" | "groups">;
  label: string;
  icon: React.ElementType;
  color: string;
}

const BARS: BarConfig[] = [
  { key: "messages",   label: "Messages",   icon: MessageSquare, color: "from-blue-500 to-blue-400" },
  { key: "images",     label: "Images",     icon: Image,          color: "from-violet-500 to-violet-400" },
  { key: "videos",     label: "Videos",     icon: Video,          color: "from-pink-500 to-pink-400" },
  { key: "files",      label: "Files",      icon: FileText,       color: "from-emerald-500 to-emerald-400" },
  { key: "attendance", label: "Attendance", icon: CalendarCheck,  color: "from-amber-500 to-amber-400" },
  { key: "groups",     label: "Groups",     icon: Users,          color: "from-cyan-500 to-cyan-400" },
];

function getBarColor(pct: number): string {
  if (pct >= 95) return "from-red-500 to-rose-400";
  if (pct >= 80) return "from-amber-500 to-orange-400";
  return "";
}

function UsageBar({ resource, label, icon: Icon, color, compact }: {
  resource: ResourceUsage;
  label: string;
  icon: React.ElementType;
  color: string;
  compact: boolean;
}) {
  const isUnlimited = resource.limit === -1;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((resource.used / resource.limit) * 100));
  const overrideColor = !isUnlimited ? getBarColor(pct) : "";
  const barColor = overrideColor || color;

  return (
    <div className={cn("group", compact ? "space-y-0.5" : "space-y-1.5")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={cn("shrink-0 text-slate-400", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          <span className={cn("font-bold text-slate-400 uppercase tracking-widest truncate", compact ? "text-[9px]" : "text-[10px]")}>
            {label}
          </span>
        </div>
        <span className={cn("font-mono shrink-0", compact ? "text-[9px]" : "text-[10px]",
          pct >= 95 && !isUnlimited ? "text-red-400" : "text-slate-500"
        )}>
          {isUnlimited
            ? <span className="text-slate-600">∞</span>
            : `${resource.used}/${resource.limit}`
          }
        </span>
      </div>

      {!compact && (
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          {isUnlimited ? (
            <div className="h-full w-full bg-gradient-to-r from-slate-700 to-slate-600 opacity-40" />
          ) : (
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", barColor)}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export const UsageBarsWidget: React.FC<UsageBarsWidgetProps> = ({ compact = false, className }) => {
  const { data, isLoading, isError } = useQuery<UsageSummary>({
    queryKey: ["usage", "today"],
    queryFn: getTodayUsage,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-2 animate-pulse", className)}>
        {[...Array(compact ? 3 : 6)].map((_, i) => (
          <div key={i} className="h-4 bg-slate-800 rounded-full" />
        ))}
      </div>
    );
  }

  if (isError || !data) return null;

  // Admins see no limits
  if (data.isAdmin) {
    return (
      <div className={cn("flex items-center gap-2 text-slate-500", compact ? "text-[9px]" : "text-[10px]", className)}>
        <TrendingUp className="w-3 h-3" />
        <span className="font-bold uppercase tracking-widest">Admin — Unlimited Access</span>
      </div>
    );
  }

  const barsToShow = compact ? BARS.slice(0, 3) : BARS;

  return (
    <div className={cn("space-y-2", className)}>
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Today's Usage
          </span>
        </div>
      )}
      {barsToShow.map(bar => (
        <UsageBar
          key={bar.key}
          resource={data[bar.key]}
          label={bar.label}
          icon={bar.icon}
          color={bar.color}
          compact={compact}
        />
      ))}
    </div>
  );
};
