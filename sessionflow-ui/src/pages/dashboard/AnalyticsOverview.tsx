import React from "react";
import { Info, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AttendanceRing, DonutChart } from "../../components/viz/Charts";

interface AnalyticsOverviewProps {
  distributionData: { label: string; value: number; color: string }[];
  attendanceByLevel: { level: number; rate: number }[];
  attendanceRateOverall: number;
  recentActivity: any[];
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ 
  distributionData,
  attendanceByLevel,
  attendanceRateOverall,
  recentActivity
}) => {
  const { t } = useTranslation();

  const getAttendanceForLevel = (level: number) => {
    const entry = attendanceByLevel.find(a => a.level === level);
    return entry ? Math.round(entry.rate * 100) : 0;
  };

  const getHealthScore = (rate: number) => {
    const pct = rate * 100;
    if (pct === 0 && (!recentActivity || recentActivity.length === 0)) return "NO_DATA";
    if (pct >= 90) return "OPTIMAL";
    if (pct >= 75) return "STABLE";
    if (pct >= 50) return "DEGRADED";
    return "CRITICAL";
  };

  const healthScore = getHealthScore(attendanceRateOverall);

  // Derive peak hours if possible, otherwise fallback
  const peakHours = "17:00 - 19:30"; // Placeholder for now, could be computed from session histograms

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
      {/* Attendance Analysis */}
      <div className="lg:col-span-2 card-base !p-5 sm:!p-6 lg:!p-8 space-y-6 sm:space-y-8 bg-[var(--ui-sidebar-bg)]/50 backdrop-blur-3xl relative overflow-hidden group">
        {/* Info tooltip */}
        <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
           <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-slate-500 hover:text-white transition-all cursor-help peer">
              <Info className="w-4 h-4" />
           </div>
           <div className="absolute top-full right-0 mt-2 w-52 p-3 bg-black/90 border border-white/10 rounded-xl text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-0 invisible peer-hover:visible peer-hover:opacity-100 transition-all z-50 shadow-2xl">
              {t("dashboard.analytics.attendance_hint")}
           </div>
        </div>

        {/* Header */}
        <div className="space-y-0.5">
          <p className="text-[9px] sm:text-[10px] font-bold text-[var(--ui-accent)] uppercase tracking-[0.2em]">{t("dashboard.analytics.realtime_telemetry")}</p>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">{t("dashboard.analytics.attendance_title")}</h2>
        </div>

        {/* Attendance Rings — 2-col on mobile, 4-col on md+ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 pt-2">
          <AttendanceRing percentage={getAttendanceForLevel(1)} label={t("sidebar.levels.fundamentals")} />
          <AttendanceRing percentage={getAttendanceForLevel(2)} label={t("sidebar.levels.intermediate")} />
          <AttendanceRing percentage={getAttendanceForLevel(3)} label={t("sidebar.levels.advanced")} />
          <AttendanceRing percentage={getAttendanceForLevel(4)} label={t("sidebar.levels.masterclass")} />
        </div>

        {/* Footer stats */}
        <div className="pt-5 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-6 sm:gap-8">
              <div className="space-y-0.5">
                 <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t("dashboard.analytics.peak_hours")}</p>
                 <p className="text-base sm:text-lg font-black text-white tracking-tighter tabular-nums">{peakHours}</p>
              </div>
               <div className="space-y-0.5">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t("dashboard.analytics.health_score")}</p>
                  <p className={`text-base sm:text-lg font-black tracking-tighter uppercase ${
                    healthScore === "OPTIMAL" ? "text-emerald-500" :
                    healthScore === "STABLE" ? "text-blue-500" :
                    healthScore === "DEGRADED" ? "text-amber-500" :
                    healthScore === "CRITICAL" ? "text-rose-500" : "text-slate-500"
                  }`}>{t(`dashboard.ops.status_${healthScore.toLowerCase()}`)}</p>
               </div>
            </div>
            <button className="text-[9px] sm:text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-[0.2em] flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-[var(--ui-accent)] hover:border-[var(--ui-accent)]/20 transition-all group/btn">
               {t("dashboard.analytics.view_full_report")} 
               <HelpCircle className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform" />
            </button>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="card-base !p-5 sm:!p-6 lg:!p-8 flex flex-col items-center justify-center space-y-6 sm:space-y-8 bg-[var(--ui-accent)]/[0.02] group">
         <div className="text-center space-y-0.5 w-full relative z-10">
            <h2 className="text-base sm:text-lg lg:text-xl font-black text-white uppercase tracking-tighter">{t("dashboard.analytics.node_distribution")}</h2>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("dashboard.analytics.population_mapping")}</p>
         </div>

         <div className="w-36 h-36 sm:w-40 sm:h-40 lg:w-44 lg:h-44">
           <DonutChart data={distributionData} />
         </div>

         <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-3 w-full pt-2 relative z-10">
            {distributionData.map(item => (
              <div key={item.label} className="flex items-center gap-2 group/item cursor-pointer">
                 <div className="w-2 h-2 rounded-full transition-transform group-hover/item:scale-125 shrink-0" style={{ backgroundColor: item.color }} />
                 <div className="space-y-0 min-w-0">
                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate">{item.label}</p>
                    <p className="text-[10px] sm:text-[11px] font-black text-white tabular-nums">{item.value} {t("dashboard.analytics.nodes")}</p>
                 </div>
              </div>
            ))}
         </div>

         {/* Decorative Grid */}
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMDMiLz48L3N2Zz4=')] opacity-50 pointer-events-none" />
      </div>
    </div>
  );
};
