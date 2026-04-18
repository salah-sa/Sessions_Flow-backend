import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import { useUIStore, useAuthStore } from "../store/stores";
import { useActiveUIStyle } from "../styles/UIStyleManager";
import { useBeforeUnload } from "../hooks/useBeforeUnload";
import { Setting } from "../types";
import { 
  useSettings, 
  useEngineerCodes, 
  useGmailStatus, 
  useSettingsMutations, 
  useEngineerMutations, 
  useImportMutations, 
  usePurgeMutation 
} from "../queries/useSettingsQueries";
import { ConfirmDialog, Skeleton, Button } from "../components/ui";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Loader2, 
  Save, 
  AlertCircle, 
  RotateCcw, 
  Terminal, 
  Key, 
  Globe, 
  Bell, 
  Shield 
} from "lucide-react";

import SystemConfig from "./settings/SystemConfig";
import AccessCodesSettings from "./settings/AccessCodesSettings";
import ImportBridge from "./settings/ImportBridge";
import CommsRelay from "./settings/CommsRelay";
import SecurityPanel from "./settings/SecurityPanel";

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useUIStore((s: any) => s.theme);
  const setTheme = useUIStore((s: any) => s.setTheme);
  const customTheme = useUIStore((s: any) => s.customTheme);
  const updateCustomTheme = useUIStore((s: any) => s.updateCustomTheme);
  const currentUser = useAuthStore((s: any) => s.user);
  const isAdmin = currentUser?.role === "Admin";
  const language = i18n.language;
  const activeStyle = useActiveUIStyle();
  
  const { data: settingsData, isLoading: settingsLoading } = useSettings();
  const { data: codesData, isLoading: codesLoading } = useEngineerCodes();
  const { data: gmailStatus, isLoading: gmailLoading } = useGmailStatus();

  const { updateSettings, testEmail } = useSettingsMutations();
  const { generateCode, revokeCode } = useEngineerMutations();
  const { testConnection, preview, execute } = useImportMutations();
  const purgeMutation = usePurgeMutation();

  const settings = settingsData || [];
  const codes = codesData || [];
  const loading = settingsLoading || (isAdmin && codesLoading) || gmailLoading;

  // Local form state
  const [appName, setAppName] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [priceL1, setPriceL1] = useState("");
  const [priceL2, setPriceL2] = useState("");
  const [priceL3, setPriceL3] = useState("");
  const [priceL4, setPriceL4] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminAppPassword, setAdminAppPassword] = useState("");

  const isSaving = updateSettings.isPending;
  const isGenerating = generateCode.isPending;
  const isDeletingAll = purgeMutation.isPending;

  // 3C School Import State
  const [importEmail, setImportEmail] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importPreviewData, setImportPreviewData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"system" | "notifications" | "security" | "codes" | "import">("system");

  useEffect(() => {
    if (settings.length > 0) {
      setAppName(settings.find(s => s.key === "AppName")?.value || "");
      setSmtpHost(settings.find(s => s.key === "SmtpHost")?.value || "");
      setSmtpPort(settings.find(s => s.key === "SmtpPort")?.value || "");
      setPriceL1(settings.find(s => s.key === "session_price_level_1")?.value || "100");
      setPriceL2(settings.find(s => s.key === "session_price_level_2")?.value || "100");
      setPriceL3(settings.find(s => s.key === "session_price_level_3")?.value || "100");
      setPriceL4(settings.find(s => s.key === "session_price_level_4")?.value || "150");
      setAdminEmail(settings.find(s => s.key === "admin_email")?.value || "");
      setAdminAppPassword(settings.find(s => s.key === "admin_email_app_password")?.value || "");
    }
  }, [settings]);

  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    toast(t("settings.theme_switched", { mode: next }), { 
      icon: next === "dark" ? <Moon className="w-4 h-4 text-var(--ui-accent)" /> : <Sun className="w-4 h-4 text-amber-500" />
    });
  };

  const handleSave = async () => {
    try {
      const payload: Setting[] = [
        { id: "1", key: "AppName", value: appName },
        { id: "2", key: "SmtpHost", value: smtpHost },
        { id: "3", key: "SmtpPort", value: smtpPort },
        { id: "4", key: "session_price_level_1", value: priceL1 },
        { id: "5", key: "session_price_level_2", value: priceL2 },
        { id: "6", key: "session_price_level_3", value: priceL3 },
        { id: "7", key: "session_price_level_4", value: priceL4 },
        { id: "8", key: "admin_email", value: adminEmail },
        { id: "9", key: "admin_email_app_password", value: adminAppPassword }
      ];
      await updateSettings.mutateAsync(payload);
      toast.success(t("settings.save_success"));
    } catch (err) {
      toast.error(t("settings.save_error"));
    }
  };

  const handleGenerateCode = async () => {
    try {
      await generateCode.mutateAsync();
      toast.success(t("settings.code_generate_success"));
    } catch (err) {
      toast.error(t("settings.code_generate_error"));
    }
  };

  const handleRevokeCode = async (id: string) => {
    try {
      await revokeCode.mutateAsync(id);
      toast.success(t("settings.code_revoke_success"));
    } catch (err) {
      toast.error(t("settings.code_revoke_error"));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("settings.copy_success", { label }));
  };

  const handlePurge = async () => {
    try { 
      await purgeMutation.mutateAsync(); 
      toast.success(t("settings.purge_success")); 
      setShowPurgeConfirm(false);
    } catch { 
      toast.error(t("common.error"));
    }
  };

  const hasUnsavedChanges = 
    appName !== (settings.find(s => s.key === "AppName")?.value || "") ||
    smtpHost !== (settings.find(s => s.key === "SmtpHost")?.value || "") ||
    smtpPort !== (settings.find(s => s.key === "SmtpPort")?.value || "") ||
    priceL1 !== (settings.find(s => s.key === "session_price_level_1")?.value || "100") ||
    priceL2 !== (settings.find(s => s.key === "session_price_level_2")?.value || "100") ||
    priceL3 !== (settings.find(s => s.key === "session_price_level_3")?.value || "100") ||
    priceL4 !== (settings.find(s => s.key === "session_price_level_4")?.value || "150") ||
    adminEmail !== (settings.find(s => s.key === "admin_email")?.value || "") ||
    adminAppPassword !== (settings.find(s => s.key === "admin_email_app_password")?.value || "");

  useBeforeUnload(hasUnsavedChanges);

  const blocker = useBlocker(
    ({ nextLocation: nextLoc }) => hasUnsavedChanges && nextLoc.pathname !== location.pathname
  );

  return (
    <div className="h-full flex flex-col bg-var(--ui-bg) animate-fade-in overflow-hidden relative">
      <ConfirmDialog
        isOpen={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        title="Unsaved Parameters Detected"
        description="Your configuration holds uncommitted changes. Leaving now will reset these values to the last synchronized state. Continue?"
        confirmLabel="Abandon Changes"
        variant="danger"
        onConfirm={() => blocker.proceed?.()}
      />

      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-var(--ui-bg)/50 backdrop-blur-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0">
        <div className="space-y-1 text-start">
          <h1 className="text-3xl font-sora font-black text-white tracking-tighter uppercase flex items-center gap-4">
            <div className="p-3 bg-var(--ui-accent)/10 rounded-2xl border border-var(--ui-accent)/20 shadow-glow shadow-var(--ui-accent)/5">
               <SettingsIcon className="w-8 h-8 text-var(--ui-accent)" />
            </div>
            {t("settings.header_title")}
          </h1>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] ps-1">
             {t("settings.header_subtitle")}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col items-end pe-6 border-e border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{t("admin.stats.status_optimal")}</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow" />
                 <p className="text-xs font-black text-white uppercase tracking-tighter">{t("settings.status_online")}</p>
              </div>
           </div>
           
           <button 
             disabled={isSaving} 
             onClick={handleSave} 
             className={cn(
               "h-12 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3",
               hasUnsavedChanges 
                 ? "bg-var(--ui-accent) text-white shadow-[0_0_20px_rgba(var(--ui-accent-rgb),0.3)] hover:scale-105" 
                 : "bg-white text-black opacity-50 cursor-not-allowed"
             )}
           >
             {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             {t("settings.commit_changes")}
           </button>
        </div>
      </div>

      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-6"
          >
            <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-6 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-var(--ui-accent)/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-2 bg-var(--ui-accent)/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-var(--ui-accent)" />
                </div>
                <div className="text-start">
                  <p className="text-[11px] font-black text-white uppercase tracking-wider leading-none mb-1">Uncommitted Logic</p>
                  <p className="text-[10px] font-bold text-slate-400">Environment configuration has unsaved modifications</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 relative z-10">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (settings.length > 0) {
                      setAppName(settings.find(s => s.key === "AppName")?.value || "");
                      setSmtpHost(settings.find(s => s.key === "SmtpHost")?.value || "");
                      setSmtpPort(settings.find(s => s.key === "SmtpPort")?.value || "");
                      setPriceL1(settings.find(s => s.key === "session_price_level_1")?.value || "100");
                      setPriceL2(settings.find(s => s.key === "session_price_level_2")?.value || "100");
                      setPriceL3(settings.find(s => s.key === "session_price_level_3")?.value || "100");
                      setPriceL4(settings.find(s => s.key === "session_price_level_4")?.value || "150");
                      setAdminEmail(settings.find(s => s.key === "admin_email")?.value || "");
                      setAdminAppPassword(settings.find(s => s.key === "admin_email_app_password")?.value || "");
                    }
                  }}
                  className="text-[10px] font-black text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-3 h-3 mr-2" /> Discard
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-var(--ui-accent) hover:bg-var(--ui-accent)/90 text-white text-[10px] font-black h-9 px-6"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                  Deploy Changes
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
         {/* Hexagonal Command Hive Nav */}
         <div className="w-full md:w-[340px] border-b md:border-b-0 md:border-e border-white/5 bg-var(--ui-sidebar-bg)/40 p-6 md:p-10 flex flex-col shrink-0 relative z-10 before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0ibTEyIDBsMTAuMzkgNnYxMmwtMTAuMzkgNi0xMC4zOS02di0xMnoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIvPjwvc3ZnPg==')] before:opacity-50">
            <div className="relative z-10">
              <p className="mb-4 md:mb-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-var(--ui-accent) shadow-glow" />
                Command Hive
              </p>
              
              <div className="flex flex-row md:flex-col gap-4 md:gap-6 overflow-x-auto hide-scrollbar md:overflow-visible pb-2 md:pb-0">
                {[ 
                  { id: "system", name: t("settings.tabs.system_config"), icon: Terminal, color: "brand" },
                  { id: "codes", name: t("settings.tabs.engineer_access"), icon: Key, color: "emerald", hidden: !isAdmin },
                  { id: "import", name: t("settings.tabs.external_bridge"), icon: Globe, color: "blue" },
                  { id: "notifications", name: t("settings.tabs.comms_relay"), icon: Bell, color: "amber" },
                  { id: "security", name: t("settings.tabs.firewall_keys"), icon: Shield, color: "rose" }
                ].filter(i => !i.hidden).map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={cn(
                      "group flex items-center gap-3 md:gap-6 transition-all duration-500 min-w-max md:w-full hover:translate-x-0 md:hover:translate-x-2 shrink-0 md:shrink",
                      activeTab === item.id ? "translate-x-0 md:translate-x-2" : "opacity-60 hover:opacity-100"
                    )}
                  >
                    <div className="relative w-10 h-10 md:w-16 md:h-16 flex-shrink-0 flex items-center justify-center filter drop-shadow-xl">
                      <div 
                        className={cn(
                          "absolute inset-0 transition-colors duration-500",
                          activeTab === item.id 
                            ? `bg-${item.color}-500 shadow-glow` 
                            : "bg-var(--ui-sidebar-bg) border border-white/10 group-hover:bg-var(--ui-surface)"
                        )}
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      />
                      <div 
                        className={cn("absolute inset-[2px] transition-colors duration-500", activeTab === item.id ? `bg-${item.color}-600` : "bg-var(--ui-bg)")}
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      />
                      <item.icon className={cn(
                        "w-4 h-4 md:w-6 md:h-6 relative z-10 transition-colors duration-500",
                        activeTab === item.id ? "text-white" : `text-${item.color}-500`
                      )} />
                    </div>
                    
                    <div className="flex flex-col items-start gap-0.5 md:gap-1">
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-500 text-start",
                        activeTab === item.id ? "text-white drop-shadow-md" : "text-slate-400"
                      )}>{item.name}</span>
                      {activeTab === item.id && (
                        <span className={cn("text-[8px] font-black uppercase tracking-widest", `text-${item.color}-400`)}>Active Protocol</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="hidden md:block mt-16 p-5 bg-var(--ui-bg)/80 backdrop-blur-md border border-white/5 space-y-4 shadow-xl" style={{ clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)' }}>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">{t("settings.env_info")}</p>
                  <div className="space-y-3 px-4">
                     <div className="flex justify-between items-center text-[9px] font-black uppercase">
                        <span className="text-slate-500">{t("settings.version")}</span>
                        <span className="text-white">{t("settings.version_pro")}</span>
                     </div>
                     <div className="flex justify-between items-center text-[9px] font-black uppercase">
                        <span className="text-slate-500">{t("settings.node_status")}</span>
                        <span className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{t("settings.status_online")}</span>
                     </div>
                  </div>
              </div>
            </div>
         </div>

         {/* Scrollable Content Viewport */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
            <div className="max-w-5xl mx-auto space-y-12">
               {loading ? (
                  <div className="space-y-8">
                     <Skeleton className="h-24 rounded-3xl" />
                     <Skeleton className="h-40 rounded-3xl" />
                     <Skeleton className="h-40 rounded-3xl" />
                  </div>
               ) : activeTab === "system" ? (
                  <SystemConfig 
                    appName={appName} setAppName={setAppName}
                    priceL1={priceL1} setPriceL1={setPriceL1}
                    priceL2={priceL2} setPriceL2={setPriceL2}
                    priceL3={priceL3} setPriceL3={setPriceL3}
                    priceL4={priceL4} setPriceL4={setPriceL4}
                    theme={theme} setTheme={setTheme}
                    customTheme={customTheme} updateCustomTheme={updateCustomTheme}
                    activeStyle={activeStyle} handleToggleTheme={handleToggleTheme}
                  />
               ) : activeTab === "codes" ? (
                  <AccessCodesSettings 
                    codes={codes} isGenerating={isGenerating}
                    handleGenerateCode={handleGenerateCode} handleRevokeCode={handleRevokeCode}
                    copyToClipboard={copyToClipboard}
                  />
               ) : activeTab === "import" ? (
                  <ImportBridge 
                    importEmail={importEmail} setImportEmail={setImportEmail}
                    importPassword={importPassword} setImportPassword={setImportPassword}
                    connectionStatus={connectionStatus} setConnectionStatus={setConnectionStatus}
                    testConnection={testConnection} preview={preview} execute={execute}
                    importPreviewData={importPreviewData} setImportPreviewData={setImportPreviewData}
                    toggleGroupExpand={() => {}} handlePurge={handlePurge}
                    isDeletingAll={isDeletingAll} showPurgeConfirm={showPurgeConfirm}
                    setShowPurgeConfirm={setShowPurgeConfirm}
                  />
               ) : activeTab === "notifications" ? (
                  <CommsRelay 
                    adminEmail={adminEmail} setAdminEmail={setAdminEmail}
                    adminAppPassword={adminAppPassword} setAdminAppPassword={setAdminAppPassword}
                    isSaving={isSaving} handleSave={handleSave} testEmail={testEmail}
                  />
               ) : (
                  <SecurityPanel />
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default SettingsPage;

