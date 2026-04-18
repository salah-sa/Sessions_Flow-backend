import React from "react";
import { Info, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AttendanceRing, DonutChart } from "../../components/viz/Charts";

interface AnalyticsOverviewProps {
  distributionData: { label: string; value: number; color: string }[];
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ distributionData }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Attendance Analysis */}
      <div className="lg:col-span-2 card-base p-10 space-y-10 border-white/5 bg-[var(--ui-sidebar-bg)]/50 backdrop-blur-3xl relative overflow-hidden group animate-in fade-in slide-in-from-left-12 duration-1200 animate-delay-300">
        <div className="absolute top-0 right-0 p-8">
           <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-slate-500 hover:text-white transition-all cursor-help peer">
              <Info className="w-5 h-5" />
           </div>
           <div className="absolute top-full right-8 mt-4 w-64 p-4 bg-black/90 border border-white/10 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-0 invisible peer-hover:visible peer-hover:opacity-100 transition-all z-50 shadow-2xl">
              {t("dashboard.analytics.attendance_hint")}
           </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black text-[var(--ui-accent)] uppercase tracking-[0.3em]">{t("dashboard.analytics.realtime_telemetry")}</p>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{t("dashboard.analytics.attendance_title")}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 pt-6">
          <AttendanceRing percentage={94} label={t("sidebar.levels.fundamentals")} />
          <AttendanceRing percentage={88} label={t("sidebar.levels.intermediate")} />
          <AttendanceRing percentage={91} label={t("sidebar.levels.advanced")} />
          <AttendanceRing percentage={96} label={t("sidebar.levels.masterclass")} />
        </div>

        <div className="pt-8 border-t border-white/5 flex items-center justify-between">
           <div className="flex gap-12">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t("dashboard.analytics.peak_hours")}</p>
                 <p className="text-xl font-black text-white tracking-tighter tabular-nums">17:00 - 19:30</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t("dashboard.analytics.health_score")}</p>
                 <p className="text-xl font-black text-emerald-500 tracking-tighter uppercase">OPTI-PRIME</p>
              </div>
           </div>
           <button className="text-[10px] font-black text-slate-500 hover:text-[var(--ui-accent)] uppercase tracking-widest flex items-center gap-2 transition-colors">
              {t("dashboard.analytics.view_full_report")} <HelpCircle className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="card-base p-10 flex flex-col items-center justify-center space-y-10 bg-[var(--ui-accent)]/[0.02] border-[var(--ui-accent)]/10 animate-in fade-in slide-in-from-right-12 duration-1200 animate-delay-300 group">
         <div className="text-center space-y-1 w-full relative z-10">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{t("dashboard.analytics.node_distribution")}</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("dashboard.analytics.population_mapping")}</p>
         </div>

         <DonutChart data={distributionData} />

         <div className="grid grid-cols-2 gap-x-12 gap-y-4 w-full pt-4 relative z-10">
            {distributionData.map(item => (
              <div key={item.label} className="flex items-center gap-3 group/item cursor-pointer">
                 <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-transform group-hover/item:scale-125" style={{ backgroundColor: item.color }} />
                 <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{item.label}</p>
                    <p className="text-xs font-black text-white tabular-nums">{item.value} {t("dashboard.analytics.nodes")}</p>
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
