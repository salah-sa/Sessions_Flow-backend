import { Layers, Radio, GraduationCap, TrendingUp, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sparkline } from "../../components/viz/Charts";

interface MetricsGridProps {
  stats: {
    totalGroups: number;
    activeSessions: number;
    totalStudents: number;
    avgAttendance: number;
  };
  weeklyTrend?: number[];
  attendanceTrend?: number[];
  studentGrowth?: number[];
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({
  stats,
  weeklyTrend,
  attendanceTrend,
  studentGrowth,
}) => {
  const { t } = useTranslation();

  const calculateTrend = (data?: number[]) => {
    if (!data || data.length < 2) return "+0%";
    const first = data[0];
    const last = data[data.length - 1];
    if (first === 0) return last > 0 ? `+${last * 100}%` : "+0%";
    const diff = ((last - first) / first) * 100;
    return `${diff >= 0 ? "+" : ""}${diff.toFixed(0)}%`;
  };

  const metrics = [
    { 
      label: t("dashboard.stats.total_groups"), 
      value: stats.totalGroups, 
      icon: Layers, 
      trend: calculateTrend(weeklyTrend), 
      data: weeklyTrend && weeklyTrend.length > 0 ? weeklyTrend : [0]
    },
    { 
      label: t("dashboard.stats.active_sessions"), 
      value: stats.activeSessions, 
      icon: Radio, 
      trend: "+0%", // Hard to trend active sessions without historical active count
      data: weeklyTrend && weeklyTrend.length > 0 ? weeklyTrend : [0]
    },
    { 
      label: t("dashboard.stats.total_students"), 
      value: stats.totalStudents, 
      icon: GraduationCap, 
      trend: calculateTrend(studentGrowth), 
      data: studentGrowth && studentGrowth.length > 0 ? studentGrowth : [0]
    },
    { 
      label: t("dashboard.stats.avg_attendance"), 
      value: `${stats.avgAttendance}%`, 
      icon: TrendingUp, 
      trend: calculateTrend(attendanceTrend), 
      data: attendanceTrend && attendanceTrend.length > 0 ? attendanceTrend : [0]
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
      {metrics.map((metric, i) => (
        <div 
          key={metric.label}
          className="card-base relative overflow-hidden group hover:border-[var(--ui-accent)]/30 transition-all duration-500 !p-3 sm:!p-4 lg:!p-5"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Icon + Trend — top right */}
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex flex-col items-end gap-1 z-10">
             <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-white transition-all group-hover:bg-[var(--ui-accent)] group-hover:border-[var(--ui-accent)]/20">
               <metric.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
             </div>
             <div className={metric.trend.startsWith("+") ? "text-emerald-500" : "text-rose-500"}>
                <p className="text-[8px] sm:text-[9px] font-bold tracking-wider flex items-center gap-0.5">
                   {metric.trend} <ArrowUpRight className="w-2.5 h-2.5" />
                </p>
             </div>
          </div>

          {/* Label + Value */}
          <div className="space-y-0.5 relative z-10">
             <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] truncate pr-10">{metric.label}</p>
             <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter tabular-nums">{metric.value}</h3>
          </div>

          {/* Sparkline + Stream label */}
          <div className="mt-4 sm:mt-6 relative z-10 flex items-end justify-between">
             <div className="h-8 w-20 sm:w-24 -ms-1">
                <Sparkline data={metric.data} />
             </div>
             <p className="text-[7px] sm:text-[8px] font-bold text-slate-700 uppercase tracking-widest whitespace-nowrap mb-0.5 hidden sm:block">{t("dashboard.stats.realtime_stream")}</p>
          </div>

          {/* Hover aura */}
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[var(--ui-accent)]/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      ))}
    </div>
  );
};
