import React from "react";
import { Globe, Terminal, CheckCircle2, AlertCircle, Loader2, Users, Download, ExternalLink, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { Input, Badge, ConfirmDialog } from "../../components/ui";

interface ImportBridgeProps {
  importEmail: string;
  setImportEmail: (val: string) => void;
  importPassword: string;
  setImportPassword: (val: string) => void;
  connectionStatus: "idle" | "success" | "error";
  testConnection: any;
  preview: any;
  execute: any;
  importPreviewData: any;
  setImportPreviewData: (val: any) => void;
  setConnectionStatus: (val: any) => void;
  toggleGroupExpand: (index: number) => void;
  handlePurge: () => void;
  isDeletingAll: boolean;
  showPurgeConfirm: boolean;
  setShowPurgeConfirm: (val: boolean) => void;
}

const ImportBridge: React.FC<ImportBridgeProps> = ({
  importEmail, setImportEmail,
  importPassword, setImportPassword,
  connectionStatus, testConnection,
  preview, execute,
  importPreviewData, setImportPreviewData,
  setConnectionStatus, toggleGroupExpand,
  handlePurge, isDeletingAll,
  showPurgeConfirm, setShowPurgeConfirm
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-12 animate-fade-in text-start">
      <section className="space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="w-1.5 h-6 bg-var(--ui-accent) rounded-full" />
            {t("settings.external_bridge")}
          </h2>
          <div className="space-y-1">
            <p className="text-xs font-black text-white uppercase tracking-widest">{t("settings.import.bridge_title")}</p>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("settings.import.bridge_desc")}</p>
          </div>
        </div>

        <div className="p-4 bg-var(--ui-sidebar-bg)/50 rounded-2xl border border-white/5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ms-2">{t("settings.import.email")}</label>
              <Input 
                value={importEmail}
                onChange={(e) => setImportEmail(e.target.value)}
                placeholder="admin@3cschool.local"
                className="h-11 bg-var(--ui-bg) border-white/5 text-[10px] font-black uppercase tracking-widest"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ms-2">{t("settings.import.password")}</label>
              <Input 
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 bg-var(--ui-bg) border-white/5 text-[10px] font-black uppercase tracking-widest"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={async () => {
                try {
                  const res = await testConnection.mutateAsync({ email: importEmail, password: importPassword });
                  if (res.success) {
                    setConnectionStatus("success");
                  } else {
                    setConnectionStatus("error");
                  }
                } catch (err: any) {
                  setConnectionStatus("error");
                }
              }}
              disabled={testConnection.isPending || !importEmail || !importPassword}
              className={cn(
                "h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 border",
                connectionStatus === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                connectionStatus === "error" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                "bg-var(--ui-bg) border-white/5 text-slate-400 hover:bg-var(--ui-sidebar-bg)"
              )}
            >
              {testConnection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 
               connectionStatus === "success" ? <CheckCircle2 className="w-4 h-4" /> : 
               connectionStatus === "error" ? <AlertCircle className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              {t("settings.import.ping")}
            </button>
            <button 
              onClick={async () => {
                try {
                  const res = await preview.mutateAsync({ email: importEmail, password: importPassword });
                  setImportPreviewData(res);
                } catch (err: any) {
                  // Error handled in parent toast
                }
              }}
              disabled={preview.isPending || !importEmail}
              className="h-12 px-10 bg-var(--ui-accent) text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow shadow-var(--ui-accent)/20 flex items-center justify-center gap-3"
            >
              {preview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
              {t("settings.import.scan")}
            </button>
          </div>
        </div>

        {importPreviewData && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <p className="text-xs font-black text-white uppercase tracking-widest">{t("settings.import.discovered", { count: importPreviewData.groupsFound })}</p>
              <button 
                onClick={async () => {
                  try {
                    await execute.mutateAsync({ email: importEmail, password: importPassword });
                  } catch (err: any) {
                    // Handled in parent
                  }
                }}
                disabled={execute.isPending}
                className="h-10 px-8 bg-emerald-500 text-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-glow shadow-emerald-500/20 flex items-center gap-2"
              >
                {execute.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {t("settings.import.execute")}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {importPreviewData.groups.map((group: any, i: number) => (
                <div key={i} className={cn(
                  "p-4 rounded-2xl border bg-var(--ui-bg)/40 flex items-center justify-between group",
                  group.alreadyExists ? "border-amber-500/10 opacity-70" : "border-white/5 hover:border-var(--ui-accent)/20"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      group.alreadyExists ? "bg-amber-500/10 text-amber-500" : "bg-var(--ui-accent)/10 text-var(--ui-accent)"
                    )}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black text-white uppercase tracking-tight">{group.name}</p>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{group.studentCount} Students · {group.level ? `LEVEL-${group.level}` : 'UNCLASSIFIED'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {group.alreadyExists && <Badge variant="outline" className="border-amber-500/20 text-amber-500 text-[7px] font-black px-1.5 h-4">EXISTS</Badge>}
                    <button onClick={() => toggleGroupExpand(i)} className="text-slate-500 hover:text-white transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="pt-8 border-t border-red-500/10">
          <div className="p-6 bg-red-500/[0.02] border border-red-500/10 rounded-2xl flex items-center justify-between group/danger">
            <div className="space-y-1">
              <p className="text-xs font-black text-red-500 uppercase tracking-widest">{t("settings.purge_title")}</p>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("settings.purge_desc")}</p>
            </div>
            <button 
              onClick={() => setShowPurgeConfirm(true)}
              disabled={isDeletingAll}
              className="h-10 px-6 bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            >
              {isDeletingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <ConfirmDialog 
          isOpen={showPurgeConfirm}
          onClose={() => setShowPurgeConfirm(false)}
          onConfirm={handlePurge}
          title={t("settings.purge_title")}
          description={t("settings.purge_confirm")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          variant="danger"
          isLoading={isDeletingAll}
        />
      </section>
    </div>
  );
};

export default ImportBridge;
