import { Shield, Brain, Power, Info, ChevronRight, Zap, Timer, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import { cn } from "../../lib/utils";

interface OperationalIntelligenceProps {
  recentActivity?: any[];
  activeSessions?: number;
  avgSessionDuration?: number;
  completionRate?: number;
}

export const OperationalIntelligence: React.FC<OperationalIntelligenceProps> = ({ 
  recentActivity = [],
  activeSessions = 0,
  avgSessionDuration = 0,
  completionRate = 0
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === "ar" ? ar : enUS;

  // Derive status and progress for completion rate
  const completionPercent = Math.round(completionRate * 100);
  const completionStatus = completionPercent > 70 ? "OPTIMAL" : completionPercent > 40 ? "MODERATE" : "LOW";
  const durationStatus = avgSessionDuration > 45 ? "NOMINAL" : avgSessionDuration > 0 ? "EFFICIENT" : "NO_DATA";
  const activeStatus = activeSessions > 0 ? "ACTIVE" : "IDLE";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
      {/* System Health Nodes */}
      <div className="xl:col-span-3 card-base !p-5 sm:!p-6 lg:!p-8 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
           <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg lg:text-xl font-black text-white uppercase tracking-tighter">{t("dashboard.ops.health_monitoring")}</h2>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("dashboard.ops.cluster_status")}</p>
           </div>
           <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-widest">API: {t("common.online")}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-widest">SYNC: {t("common.live")}</span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
           {[
             { id: "active", label: t("dashboard.stats.active_sessions"), value: `${activeSessions}`, status: activeStatus, icon: Zap, progress: activeSessions > 0 ? 100 : 0 },
             { id: "duration", label: t("dashboard.ops.avg_duration"), value: `${avgSessionDuration.toFixed(1)} min`, status: durationStatus, icon: Timer, progress: Math.min((avgSessionDuration / 120) * 100, 100) },
             { id: "completion", label: t("dashboard.ops.completion_rate"), value: `${completionPercent}%`, status: completionStatus, icon: TrendingUp, progress: completionPercent }
           ].map(node => (
             <div key={node.id} className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-[var(--ui-accent)]/30 transition-all group/node">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] text-slate-500 group-hover/node:text-[var(--ui-accent)] group-hover/node:bg-[var(--ui-accent)]/5 transition-all">
                      <node.icon className="w-4 h-4" />
                   </div>
                    <div className={cn(
                      "text-[8px] sm:text-[9px] font-bold uppercase tracking-widest",
                      node.status === "OPTIMAL" || node.status === "ACTIVE" || node.status === "NOMINAL" ? "text-emerald-500" :
                      node.status === "MODERATE" || node.status === "EFFICIENT" ? "text-amber-500" : "text-rose-500"
                    )}>{t(`dashboard.ops.status_${node.status.toLowerCase()}`)}</div>
                </div>
                <div className="space-y-0.5">
                   <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest">{node.label}</p>
                   <p className="text-lg sm:text-xl font-black text-white tracking-tighter tabular-nums">{node.value}</p>
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                   <div 
                      className="h-full bg-[var(--ui-accent)] opacity-40 group-hover/node:opacity-100 transition-all duration-700" 
                      style={{ width: `${node.progress}%` }}
                   />
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Live Records / Quick Actions */}
      <div className="card-base !p-4 sm:!p-5 lg:!p-6 space-y-4 flex flex-col justify-between border-white/5">
         <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tighter">{t("dashboard.ops.live_records")}</h3>
              <Info className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="space-y-2">
               {recentActivity.length > 0 ? (
                 recentActivity.map((log, i) => (
                   <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 group/log cursor-default">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--ui-accent)] group-hover/log:scale-150 transition-transform shrink-0" />
                      <div className="flex-1 min-w-0">
                         <p className="text-[9px] sm:text-[10px] font-bold text-white uppercase truncate tracking-tight">
                            {log.groupName} - {log.status}
                         </p>
                         <p className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate">
                            {t("dashboard.analytics.nodes")}: {log.studentCount || 0}
                         </p>
                      </div>
                      <span className="text-[7px] sm:text-[8px] font-bold text-slate-700 uppercase shrink-0">
                         {formatDistanceToNow(new Date(log.updatedAt || log.scheduledAt), { addSuffix: true, locale: currentLocale })}
                      </span>
                   </div>
                 ))
               ) : (
                 <div className="py-8 text-center space-y-2">
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{t("dashboard.ops.no_activity", "No recent telemetry")}</p>
                 </div>
               )}
            </div>
         </div>
         <button className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-[var(--ui-accent)] hover:border-[var(--ui-accent)]/20 hover:shadow-glow hover:shadow-[var(--ui-accent)]/10 transition-all group">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 group-hover:text-white uppercase tracking-[0.2em]">{t("dashboard.ops.view_logs")}</span>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
         </button>
      </div>
    </div>
  );
};
