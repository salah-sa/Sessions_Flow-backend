import React from "react";
import { Terminal, Activity, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/stores";

export const LaunchpadHero: React.FC = () => {
  const { t } = useTranslation();
  const userName = useAuthStore(state => state.user?.name);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 relative z-30">
      <div className="space-y-6 animate-in fade-in slide-in-from-left-12 duration-1200">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-[10px] font-black uppercase tracking-[0.25em] border border-[var(--ui-accent)]/20 shadow-glow shadow-[var(--ui-accent)]/5">
            <Terminal className="w-3.5 h-3.5" />
            {t("dashboard.system_online")}
          </div>
          <div className="h-px w-12 bg-white/10" />
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">
             <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
             {t("dashboard.telemetry_active")}
          </div>
        </div>
        
        <div className="space-y-1">
           <h1 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tighter uppercase leading-[0.8] flex flex-col">
              <span className="text-slate-500 text-lg md:text-xl font-black mb-4 flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-[var(--ui-accent)] animate-ping" />
                 {t("dashboard.mission_intelligence")}
              </span>
              <span className="relative inline-block">
                {t("dashboard.welcome_back")},
              </span>
              <span className="text-[var(--ui-accent)] drop-shadow-[0_0_30px_rgba(var(--ui-accent-rgb),0.3)]">
                {userName || "OPERATIVE"}
              </span>
           </h1>
        </div>
      </div>

      <div className="flex flex-col items-end gap-6 animate-in fade-in slide-in-from-right-12 duration-1200">
         <div className="flex items-center gap-8 bg-black/30 p-4 rounded-3xl border border-white/5 backdrop-blur-xl group hover:border-[var(--ui-accent)]/30 transition-all duration-500">
             <div className="space-y-1 text-end">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("dashboard.power_level")}</p>
                <p className="text-2xl font-black text-white tracking-tighter tabular-nums">1.21 <span className="text-xs text-[var(--ui-accent)]">GW</span></p>
             </div>
             <div className="w-14 h-14 rounded-2xl bg-[var(--ui-accent)] flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/30 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-white fill-white" />
             </div>
         </div>
         <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] pe-2">{t("dashboard.last_sync")}: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};
