import React from "react";
import { Users, BookOpen, Clock, Activity, ArrowUpRight } from "lucide-react";
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

  const metrics = [
    { 
      label: t("dashboard.stats.total_groups"), 
      value: stats.totalGroups, 
      icon: Users, 
      trend: "+12%", 
      color: "blue",
      data: weeklyTrend ?? [35, 42, 38, 45, 50, 48, 55]
    },
    { 
      label: t("dashboard.stats.active_sessions"), 
      value: stats.activeSessions, 
      icon: BookOpen, 
      trend: "+5%", 
      color: "violet",
      data: [12, 15, 14, 18, 20, 22, 25]
    },
    { 
      label: t("dashboard.stats.total_students"), 
      value: stats.totalStudents, 
      icon: Activity, 
      trend: "+18%", 
      color: "emerald",
      data: studentGrowth ?? [120, 135, 142, 150, 165, 172, 185]
    },
    { 
      label: t("dashboard.stats.avg_attendance"), 
      value: `${stats.avgAttendance}%`, 
      icon: Clock, 
      trend: "-2%", 
      color: "amber",
      data: attendanceTrend ?? [92, 94, 91, 95, 93, 89, 91]
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {metrics.map((metric, i) => (
        <div 
          key={metric.label}
          className="metric-card card-base relative overflow-hidden group hover:border-[var(--ui-accent)]/30 transition-all duration-700 animate-in fade-in slide-in-from-bottom-12 duration-1200"
          style={{ transitionDelay: `${i * 150}ms` }}
        >
          <div className="absolute top-0 right-0 p-6 flex flex-col items-end gap-2 z-10">
             <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-white transition-all group-hover:bg-[var(--ui-accent)] group-hover:border-[var(--ui-accent)]/20 group-hover:-rotate-12">
               <metric.icon className="w-5 h-5" />
             </div>
             <div className={metric.trend.startsWith("+") ? "text-emerald-500" : "text-rose-500"}>
                <p className="text-[10px] font-black tracking-widest flex items-center gap-1">
                   {metric.trend} <ArrowUpRight className="w-3 h-3" />
                </p>
             </div>
          </div>

          <div className="space-y-1 relative z-10 p-2">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{metric.label}</p>
             <h3 className="text-4xl font-black text-white tracking-tighter tabular-nums">{metric.value}</h3>
          </div>

          <div className="mt-8 relative z-10 flex items-end justify-between">
             <div className="h-10 w-32 -ms-2">
                <Sparkline data={metric.data} />
             </div>
             <div className="h-px flex-1 bg-white/5 mx-4 mb-2" />
             <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest whitespace-nowrap mb-1">{t("dashboard.stats.realtime_stream")}</p>
          </div>

          {/* Background Aura */}
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[var(--ui-accent)]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>
      ))}
    </div>
  );
};
