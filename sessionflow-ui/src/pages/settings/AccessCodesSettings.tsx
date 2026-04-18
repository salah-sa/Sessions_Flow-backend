import React from "react";
import { Key, Plus, Copy, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui";
import { EngineerCode } from "../../types";

interface AccessCodesSettingsProps {
  codes: EngineerCode[];
  isGenerating: boolean;
  handleGenerateCode: () => void;
  handleRevokeCode: (id: string) => void;
  copyToClipboard: (text: string, label: string) => void;
}

const AccessCodesSettings: React.FC<AccessCodesSettingsProps> = ({
  codes,
  isGenerating,
  handleGenerateCode,
  handleRevokeCode,
  copyToClipboard
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-12 animate-fade-in text-start">
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
              <span className="w-1.5 h-6 bg-var(--ui-accent) rounded-full" />
              {t("settings.engineer_clearance")}
            </h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.engineer_clearance_desc")}</p>
          </div>
          <button 
            disabled={isGenerating} 
            onClick={handleGenerateCode}
            className="h-12 px-8 bg-var(--ui-accent) text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow shadow-var(--ui-accent)/20 flex items-center gap-3 hover:scale-105 transition-all"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t("settings.authorize_node")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {codes.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
              <Key className="w-12 h-12 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">{t("settings.no_clearance")}</p>
            </div>
          ) : codes.map(code => (
            <div key={code.id} className={cn(
              "card-base p-6 bg-var(--ui-sidebar-bg)/50 border-white/5 relative overflow-hidden group",
              code.isUsed ? "opacity-60 border-emerald-500/10" : "border-var(--ui-accent)/10"
            )}>
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("settings.clearance_token")}</p>
                    <p className="text-xl font-mono font-black text-white tracking-[0.3em] tabular-nums">{code.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {code.isUsed ? (
                      <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black px-2">{t("settings.redeemed")}</Badge>
                    ) : (
                      <Badge variant="primary" className="bg-var(--ui-accent)/10 text-var(--ui-accent) border-none text-[8px] font-black px-2">{t("settings.valid")}</Badge>
                    )}
                    <span className="text-[9px] font-black text-slate-700 uppercase">{format(new Date(code.createdAt), "MMM dd, yyyy")}</span>
                  </div>
                  {code.isUsed && (
                     <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                        <Key className="w-3 h-3" />
                        {t("settings.target")}: <span className="text-emerald-500">{code.usedByEngineerName}</span>
                     </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {!code.isUsed && (
                     <>
                        <button onClick={() => copyToClipboard(code.code, "Token")} className="w-10 h-10 bg-var(--ui-bg) rounded-xl border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                           <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRevokeCode(code.id)} className="w-10 h-10 bg-var(--ui-bg) rounded-xl border border-white/5 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </>
                  )}
                </div>
              </div>
              <Key className="absolute bottom-[-10%] right-[-5%] w-24 h-24 text-white/[0.01] -rotate-12" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AccessCodesSettings;
