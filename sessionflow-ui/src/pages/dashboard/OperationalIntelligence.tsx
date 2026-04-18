import React from "react";
import { Shield, Brain, Power, Info, ChevronRight, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

export const OperationalIntelligence: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      {/* System Health Nodes */}
      <div className="xl:col-span-3 card-base p-10 space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1200 animate-delay-500">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t("dashboard.ops.health_monitoring")}</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("dashboard.ops.cluster_status")}</p>
           </div>
           <div className="flex gap-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">GATEWAY: OK</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">DATABASE: LINKED</span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { id: "core", label: "Core Protocol", value: "99.99%", status: "OPTIMAL", icon: Shield, color: "blue" },
             { id: "neural", label: "Neural Engine", value: "14ms", status: "STABLE", icon: Brain, color: "emerald" },
             { id: "relay", label: "SMTP Relay", value: "32ms", status: "ACTIVE", icon: Power, color: "violet" }
           ].map(node => (
             <div key={node.id} className="p-6 rounded-3xl bg-black/40 border border-white/5 hover:border-[var(--ui-accent)]/30 transition-all group/node">
                <div className="flex justify-between items-start mb-6">
                   <div className="p-3 rounded-2xl bg-white/[0.03] text-slate-500 group-hover/node:text-[var(--ui-accent)] group-hover/node:bg-[var(--ui-accent)]/5 transition-all">
                      <node.icon className="w-5 h-5" />
                   </div>
                   <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{node.status}</div>
                </div>
                <div className="space-y-0.5">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{node.label}</p>
                   <p className="text-2xl font-black text-white tracking-tighter tabular-nums">{node.value}</p>
                </div>
                <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-[var(--ui-accent)] w-3/4 opacity-40 group-hover/node:opacity-100 transition-opacity" />
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* System Logs / Quick Actions */}
      <div className="card-base p-8 space-y-6 flex flex-col justify-between border-white/5 animate-in fade-in slide-in-from-right-12 duration-1200 animate-delay-500">
         <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">{t("dashboard.ops.live_records")}</h3>
              <Info className="w-4 h-4 text-slate-600" />
            </div>
            <div className="space-y-3">
               {[
                 { action: "NODE_JOINED", target: "Group Blue-13", time: "2m ago" },
                 { action: "SESSION_SYNC", target: "Server-East", time: "5m ago" },
                 { action: "ACCESS_GRANTED", target: "Operative #4", time: "12m ago" }
               ].map((log, i) => (
                 <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 group/log cursor-default">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--ui-accent)] group-hover/log:scale-150 transition-transform" />
                    <div className="flex-1 min-w-0">
                       <p className="text-[10px] font-bold text-white uppercase truncate tracking-tight">{t(`dashboard.logs.${log.action.toLowerCase()}`, log.action)}</p>
                       <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate">{log.target}</p>
                    </div>
                    <span className="text-[8px] font-black text-slate-700 uppercase">{log.time}</span>
                 </div>
               ))}
            </div>
         </div>
         <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group">
            <span className="text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest">{t("dashboard.ops.view_logs")}</span>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
         </button>
      </div>
    </div>
  );
};
