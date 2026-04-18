import React from "react";
import { Shield, Brain, Power, Info, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export const OperationalIntelligence: React.FC = () => {
  const { t } = useTranslation();

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
                 <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-widest">GATEWAY: OK</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-widest">DATABASE: LINKED</span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
           {[
             { id: "core", label: "Core Protocol", value: "99.99%", status: "OPTIMAL", icon: Shield },
             { id: "neural", label: "Neural Engine", value: "14ms", status: "STABLE", icon: Brain },
             { id: "relay", label: "SMTP Relay", value: "32ms", status: "ACTIVE", icon: Power }
           ].map(node => (
             <div key={node.id} className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-[var(--ui-accent)]/30 transition-all group/node">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] text-slate-500 group-hover/node:text-[var(--ui-accent)] group-hover/node:bg-[var(--ui-accent)]/5 transition-all">
                      <node.icon className="w-4 h-4" />
                   </div>
                   <div className="text-[8px] sm:text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{node.status}</div>
                </div>
                <div className="space-y-0.5">
                   <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest">{node.label}</p>
                   <p className="text-lg sm:text-xl font-black text-white tracking-tighter tabular-nums">{node.value}</p>
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-[var(--ui-accent)] w-3/4 opacity-40 group-hover/node:opacity-100 transition-opacity" />
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
               {[
                 { action: "NODE_JOINED", target: "Group Blue-13", time: "2m ago" },
                 { action: "SESSION_SYNC", target: "Server-East", time: "5m ago" },
                 { action: "ACCESS_GRANTED", target: "Operative #4", time: "12m ago" }
               ].map((log, i) => (
                 <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 group/log cursor-default">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--ui-accent)] group-hover/log:scale-150 transition-transform shrink-0" />
                    <div className="flex-1 min-w-0">
                       <p className="text-[9px] sm:text-[10px] font-bold text-white uppercase truncate tracking-tight">{t(`dashboard.logs.${log.action.toLowerCase()}`, log.action)}</p>
                       <p className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate">{log.target}</p>
                    </div>
                    <span className="text-[7px] sm:text-[8px] font-bold text-slate-700 uppercase shrink-0">{log.time}</span>
                 </div>
               ))}
            </div>
         </div>
         <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 group-hover:text-white uppercase tracking-widest">{t("dashboard.ops.view_logs")}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:translate-x-0.5 transition-transform" />
         </button>
      </div>
    </div>
  );
};
