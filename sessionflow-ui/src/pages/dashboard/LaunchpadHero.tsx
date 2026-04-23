import React from "react";
import { Terminal, Activity, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/stores";

export const LaunchpadHero: React.FC = () => {
  const { t } = useTranslation();
  const userName = useAuthStore(state => state.user?.name);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8 relative z-30">
      <div className="space-y-4 animate-in fade-in slide-in-from-left-8 duration-1000 w-full md:w-auto">
        {/* Status badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] border border-[var(--ui-accent)]/20">
            <Terminal className="w-3 h-3" />
            {t("dashboard.system_online")}
          </div>
          <div className="h-px w-6 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest">
             <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
             {t("dashboard.telemetry_active")}
          </div>
        </div>
        
        <div className="space-y-0.5">
           <h1 className="flex flex-col">
              <span className="text-slate-500 text-xs sm:text-sm font-bold mb-2 flex items-center gap-2 uppercase tracking-widest">
                 <div className="w-1.5 h-1.5 rounded-full bg-[var(--ui-accent)] animate-ping" />
                 {t("dashboard.mission_intelligence")}
              </span>
              <span className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                {t("dashboard.welcome_back")},
              </span>
              <span className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--ui-accent)] to-emerald-400 drop-shadow-[0_0_20px_rgba(var(--ui-accent-rgb),0.3)] tracking-tighter uppercase leading-tight py-1">
                {userName || t("common.user")}
              </span>
           </h1>
        </div>
      </div>

      {/* Power Level — condensed on mobile */}
      <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-3 animate-in fade-in slide-in-from-right-8 duration-1000 w-full md:w-auto">
         <div className="flex items-center gap-4 sm:gap-6 bg-white/[0.03] p-3 sm:p-3.5 rounded-2xl border border-white/5 backdrop-blur-xl group hover:border-[var(--ui-accent)]/30 transition-all duration-500 flex-1 md:flex-initial shadow-[inset_0_0_20px_rgba(255,255,255,0.01)]">
             <div className="space-y-0.5 text-end flex-1 md:flex-initial">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("dashboard.sync_status")}</p>
                <p className="text-lg sm:text-xl font-black text-white tracking-tighter tabular-nums uppercase">{t("dashboard.status_online")}</p>
             </div>
             <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--ui-accent)] flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/30 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shrink-0">
                 <Zap className="w-5 h-5 text-white fill-white" />
             </div>
         </div>
         <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider pe-1 hidden md:block">{t("dashboard.last_sync")}: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};
