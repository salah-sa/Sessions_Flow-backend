import React, { useState, useEffect } from "react";
import { Settings, Mail, Sun, Moon, Info, Bell, Shield, Save, RotateCcw, Terminal, DollarSign, Key, Plus, Trash2, Copy, CheckCircle2, User as UserIcon, Calendar, Download, Globe, Loader2, AlertCircle, CheckCircle, Users, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, Button, Input, Badge, Skeleton, ConfirmDialog } from "../components/ui";
import { useSettings, useSettingsMutations } from "../queries/useSettingsQueries";
import { useEngineerCodes, useEngineerMutations, usePurgeMutation } from "../queries/useAdminQueries";
import { useImportMutations, useGmailStatus } from "../queries/useImportQueries";
import { Setting, EngineerCode } from "../types";
import { useUIStore, useAuthStore } from "../store/stores";
import { UIStyleManager, UIStyleConfig, useActiveUIStyle } from "../styles/UIStyleManager";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

/* TAILWIND JIT SAFELIST
  bg-brand-500 bg-brand-600 text-brand-500 text-brand-400
  bg-purple-500 bg-purple-600 text-purple-500 text-purple-400
  bg-emerald-500 bg-emerald-600 text-emerald-500 text-emerald-400
  bg-amber-500 bg-amber-600 text-amber-500 text-amber-400
  bg-cyan-500 bg-cyan-600 text-cyan-500 text-cyan-400
*/

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const currentUser = useAuthStore((s) => s.user);
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
  const [importResult, setImportResult] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
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

  const toggleGroupExpand = (index: number) => {
    setExpandedGroups(prev => ({ ...prev, [index]: !prev[index] }));
  };


  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    toast(t("settings.theme_switched", { mode: next }), { 
      icon: next === "dark" ? <Moon className="w-4 h-4 text-brand-500" /> : <Sun className="w-4 h-4 text-amber-500" />
    });
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        "AppName": appName,
        "SmtpHost": smtpHost,
        "SmtpPort": smtpPort,
        "session_price_level_1": priceL1,
        "session_price_level_2": priceL2,
        "session_price_level_3": priceL3,
        "session_price_level_4": priceL4,
        "admin_email": adminEmail,
        "admin_email_app_password": adminAppPassword
      });
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

  return (
    <div className="h-full flex flex-col bg-slate-950 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-slate-950/50 backdrop-blur-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-sora font-black text-white tracking-tighter uppercase flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 shadow-glow shadow-brand-500/5">
               <Settings className="w-8 h-8 text-brand-500" />
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
             className="h-12 px-10 bg-white text-black hover:bg-brand-50 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-white/5 transition-all flex items-center gap-3"
           >
             {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             {t("settings.commit_changes")}
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
         {/* Hexagonal Command Hive Nav */}
         <div className="w-full md:w-[340px] border-b md:border-b-0 md:border-e border-white/5 bg-slate-900/40 p-6 md:p-10 flex flex-col shrink-0 relative z-10 before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0ibTEyIDBsMTAuMzkgNnYxMmwtMTAuMzkgNi0xMC4zOS02di0xMnoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIvPjwvc3ZnPg==')] before:opacity-50">
            <div className="relative z-10">
              <p className="mb-4 md:mb-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-brand-500 shadow-glow" />
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
                    {/* Hexagon Icon Container */}
                    <div className="relative w-10 h-10 md:w-16 md:h-16 flex-shrink-0 flex items-center justify-center filter drop-shadow-xl">
                      <div 
                        className={cn(
                          "absolute inset-0 transition-colors duration-500",
                          activeTab === item.id 
                            ? `bg-${item.color}-500 shadow-glow` 
                            : "bg-slate-900 border border-white/10 group-hover:bg-slate-800"
                        )}
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      />
                      <div 
                        className={cn("absolute inset-[2px] transition-colors duration-500", activeTab === item.id ? `bg-${item.color}-600` : "bg-slate-950")}
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      />
                      <item.icon className={cn(
                        "w-4 h-4 md:w-6 md:h-6 relative z-10 transition-colors duration-500",
                        activeTab === item.id ? "text-white" : `text-${item.color}-500`
                      )} />
                    </div>
                    
                    {/* Label */}
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
              
              <div className="hidden md:block mt-16 p-5 bg-slate-950/80 backdrop-blur-md border border-white/5 space-y-4 shadow-xl" style={{ clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)' }}>
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
                  <div className="space-y-12 animate-fade-in text-start">
                     {/* Appearance & Skins */}
                     <section className="space-y-8">
                        <div className="flex flex-col gap-2">
                           <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
                              <span className="w-1.5 h-6 bg-brand-500 rounded-full" />
                              {t("settings.display_interface")}
                           </h2>
                           <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.display_desc")}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {/* Binary Theme Toggle */}
                           <div className="card-base flex items-center justify-between group hover:bg-slate-900 transition-all">
                              <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform shadow-inner">
                                    {theme === "dark" ? <Moon className="w-7 h-7" /> : <Sun className="w-7 h-7 text-amber-500" />}
                                 </div>
                                 <div className="space-y-1">
                                    <p className="text-sm font-black text-white uppercase tracking-tighter">{t("settings.theme_synthesis")}</p>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t("settings.system.current_mode", { mode: theme.toUpperCase() })} {t("settings.protocol_active")}</p>
                                 </div>
                              </div>
                              <button 
                                onClick={handleToggleTheme} 
                                className="h-12 px-8 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                              >
                                 {t("settings.switch_mode")}
                              </button>
                           </div>

                           {/* Language Toggle */}
                           <div className="card-base flex items-center justify-between group hover:bg-slate-900 transition-all">
                              <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform shadow-inner">
                                    <Globe className="w-7 h-7" />
                                 </div>
                                 <div className="space-y-1">
                                    <p className="text-sm font-black text-white uppercase tracking-tighter">Current Locale</p>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{language === 'ar' ? 'العربية' : 'English (US)'} Active</p>
                                 </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const newLang = language === "ar" ? "en" : "ar";
                                  i18n.changeLanguage(newLang);
                                  useUIStore.getState().setLanguage(newLang);
                                }}
                                className="h-12 px-8 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                              >
                                {language === 'ar' ? 'SWITCH TO ENGLISH' : 'تبديل للعربية'}
                              </button>
                           </div>
                        </div>

                        {/* UI Protocol Switcher */}
                        <div className="space-y-6">
                           <div className="flex flex-col gap-1.5 ps-5">
                              <p className="text-xs font-black text-white uppercase tracking-widest">{t("settings.ui_protocol")}</p>
                              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">{t("settings.ui_protocol_desc")}</p>
                           </div>

                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {UIStyleConfig.available.map((styleName) => (
                                 <button
                                    key={styleName}
                                    onClick={() => UIStyleManager.apply(styleName)}
                                    className={cn(
                                       "flex flex-col items-start p-5 card-base text-left group transition-all duration-500",
                                       activeStyle === styleName 
                                          ? "border-brand-500 ring-4 ring-brand-500/10 bg-brand-500/5 translate-y-[-2px]" 
                                          : "hover:border-white/10 hover:bg-slate-900/40"
                                    )}
                                 >
                                    <div className="flex items-center justify-between w-full mb-3">
                                       <span className={cn(
                                          "text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
                                          activeStyle === styleName ? "text-brand-500" : "text-slate-500"
                                       )}>
                                          {styleName}
                                       </span>
                                       {activeStyle === styleName && (
                                          <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center animate-pulse-slow">
                                             <CheckCircle2 className="w-3 h-3 text-white" />
                                          </div>
                                       )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <div className={cn(
                                          "w-2.5 h-2.5 rounded-sm rotate-45 transition-all duration-500",
                                          activeStyle === styleName ? "bg-brand-500 shadow-glow" : "bg-slate-800"
                                       )} />
                                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                          {styleName === "Glassmorphism" ? "Standard Default" : "Experimental Identity"}
                                       </span>
                                    </div>
                                 </button>
                              ))}
                           </div>
                        </div>


                     </section>

                     {/* General Configuration */}
                     <section className="space-y-8">
                        <div className="flex flex-col gap-2">
                           <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
                              <span className="w-1.5 h-6 bg-brand-500 rounded-full" />
                              {t("settings.general_ops")}
                           </h2>
                           <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.general_ops_desc")}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="card-base space-y-4">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("settings.app_id")}</label>
                              <div className="relative">
                                 <Terminal className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
                                 <input 
                                   value={appName} 
                                   onChange={(e) => setAppName(e.target.value)}
                                   className="w-full h-12 bg-slate-950 border border-white/5 rounded-xl ps-12 pe-4 text-xs font-black text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                 />
                              </div>
                           </div>

                           <div className="card-base space-y-4">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("settings.system_language")}</label>
                              <button 
                                onClick={() => {
                                  const newLang = language === "ar" ? "en" : "ar";
                                  i18n.changeLanguage(newLang);
                                  useUIStore.getState().setLanguage(newLang);
                                }}
                                className="w-full h-12 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-between px-6 group"
                              >
                                 <div className="flex items-center gap-3">
                                    <Globe className="w-4 h-4 text-brand-500" />
                                    <span className="text-xs font-black text-white uppercase tracking-widest">{language === 'ar' ? 'العربية' : 'English (US)'}</span>
                                 </div>
                                 <Badge variant="primary" className="bg-brand-500/10 text-brand-500 border-none text-[8px] font-black tracking-widest">ACTIVE</Badge>
                              </button>
                           </div>
                        </div>
                     </section>

                     {/* Financial Telemetry */}
                     <section className="space-y-8">
                        <div className="flex flex-col gap-2">
                           <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
                              <span className="w-1.5 h-6 bg-brand-500 rounded-full" />
                              {t("settings.billing_protocols")}
                           </h2>
                           <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.billing_desc")}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           {[
                             { label: "Lvl 1", value: priceL1, setter: setPriceL1, color: "text-blue-500" },
                             { label: "Lvl 2", value: priceL2, setter: setPriceL2, color: "text-emerald-500" },
                             { label: "Lvl 3", value: priceL3, setter: setPriceL3, color: "text-amber-500" },
                             { label: "Lvl 4", value: priceL4, setter: setPriceL4, color: "text-rose-500" },
                           ].map((item) => (
                             <div key={item.label} className="card-base space-y-4 hover:border-white/10 transition-all">
                                <p className={cn("text-[9px] font-black uppercase tracking-widest", item.color)}>{item.label} Rate</p>
                                <div className="relative">
                                   <input 
                                     type="number"
                                     value={item.value}
                                     onChange={(e) => item.setter(e.target.value)}
                                     className="w-full h-10 bg-slate-950 border border-white/5 rounded-lg ps-10 pe-4 text-sm font-black text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                   />
                                   <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                                </div>
                             </div>
                           ))}
                        </div>
                     </section>
                  </div>
               ) : activeTab === "codes" ? (
                  <div className="space-y-12 animate-fade-in text-start">
                     <section className="space-y-8">
                        <div className="flex items-center justify-between">
                           <div className="flex flex-col gap-2">
                              <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
                                 <span className="w-1.5 h-6 bg-brand-500 rounded-full" />
                                 {t("settings.engineer_clearance")}
                              </h2>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.engineer_clearance_desc")}</p>
                           </div>
                           <button 
                             disabled={isGenerating} 
                             onClick={handleGenerateCode}
                             className="h-12 px-8 bg-brand-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow shadow-brand-500/20 flex items-center gap-3 hover:scale-105 transition-all"
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
                               "card-base p-6 bg-slate-900/50 border-white/5 relative overflow-hidden group",
                               code.isUsed ? "opacity-60 border-emerald-500/10" : "border-brand-500/10"
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
                                           <Badge variant="primary" className="bg-brand-500/10 text-brand-500 border-none text-[8px] font-black px-2">{t("settings.valid")}</Badge>
                                         )}
                                         <span className="text-[9px] font-black text-slate-700 uppercase">{format(new Date(code.createdAt), "MMM dd, yyyy")}</span>
                                      </div>
                                      {code.isUsed && (
                                         <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                                            <UserIcon className="w-3 h-3" />
                                            {t("settings.target")}: <span className="text-emerald-500">{code.usedByEngineerName}</span>
                                         </div>
                                      )}
                                   </div>
                                   <div className="flex gap-2">
                                      {!code.isUsed && (
                                         <>
                                            <button onClick={() => copyToClipboard(code.code, "Token")} className="w-10 h-10 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                                               <Copy className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleRevokeCode(code.id)} className="w-10 h-10 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all">
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
               ) : activeTab === "import" ? (
                  <div className="space-y-12 animate-fade-in text-start">
                     <section className="space-y-8">
                        <div className="flex flex-col gap-2">
                           <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
                              <span className="w-1.5 h-6 bg-brand-500 rounded-full" />
                              {t("settings.external_bridge")}
                           </h2>
                           <div className="space-y-1">
                              <p className="text-xs font-black text-white uppercase tracking-widest">{t("settings.import.bridge_title")}</p>
                              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("settings.import.bridge_desc")}</p>
                           </div>
                        </div>

                         <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ms-2">{t("settings.import.email")}</label>
                                  <Input 
                                    value={importEmail}
                                    onChange={(e) => setImportEmail(e.target.value)}
                                    placeholder="admin@3cschool.local"
                                    className="h-11 bg-slate-950 border-white/5 text-[10px] font-black uppercase tracking-widest"
                                  />
                               </div>
                               <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ms-2">{t("settings.import.password")}</label>
                                  <Input 
                                    type="password"
                                    value={importPassword}
                                    onChange={(e) => setImportPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="h-11 bg-slate-950 border-white/5 text-[10px] font-black uppercase tracking-widest"
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
                                        toast.success(res.message);
                                      } else {
                                        setConnectionStatus("error");
                                        toast.error(res.message);
                                      }
                                    } catch (err: any) {
                                      setConnectionStatus("error");
                                      toast.error(err.message || t("settings.import.preview_error"));
                                    }
                                  }}
                                  disabled={testConnection.isPending || !importEmail || !importPassword}
                                  className={cn(
                                    "h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 border",
                                    connectionStatus === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                    connectionStatus === "error" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                    "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"
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
                                      toast.success(t("settings.import.preview_success", { count: res.groupsFound }));
                                    } catch (err: any) {
                                      toast.error(err.message || t("settings.import.preview_error"));
                                    }
                                  }}
                                  disabled={preview.isPending || !importEmail}
                                  className="h-12 px-10 bg-brand-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow shadow-brand-500/20 flex items-center justify-center gap-3"
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
                                         const res = await execute.mutateAsync({ email: importEmail, password: importPassword });
                                         setImportResult(res);
                                         toast.success(t("settings.import.execute_success", { groups: res.groupsImported, students: res.studentsImported }));
                                      } catch (err: any) {
                                         toast.error(err.message || t("common.error"));
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
                                      "p-4 rounded-2xl border bg-slate-950/40 flex items-center justify-between group",
                                      group.alreadyExists ? "border-amber-500/10 opacity-70" : "border-white/5 hover:border-brand-500/20"
                                   )}>
                                      <div className="flex items-center gap-4">
                                         <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            group.alreadyExists ? "bg-amber-500/10 text-amber-500" : "bg-brand-500/10 text-brand-500"
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
               ) : activeTab === "notifications" ? (
                  <div className="space-y-12 animate-fade-in text-start">
                     <section className="space-y-8">
                        <div className="flex flex-col gap-2">
                           <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
                              <span className="w-1.5 h-6 bg-brand-500 rounded-full" />
                              {t("settings.relay_protocols")}
                           </h2>
                           <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.relay_desc")}</p>
                        </div>
                        <div className="card-base space-y-8">
                           {/* Gmail SMTP Direct Config */}
                           <div className="flex items-center gap-6">
                              <div className={cn(
                                "w-16 h-16 rounded-2xl border flex items-center justify-center transition-all shadow-glow shrink-0",
                                adminEmail && adminAppPassword ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-emerald-500/5" : "bg-slate-950 border-white/5 text-slate-500"
                              )}>
                                 <Mail className="w-8 h-8" />
                              </div>
                              <div className="space-y-1">
                                 <p className="text-sm font-black text-white uppercase tracking-tighter">Gmail SMTP Direct</p>
                                 <p className={cn("text-[9px] font-black uppercase tracking-widest", adminEmail && adminAppPassword ? "text-emerald-500" : "text-slate-500")}>
                                    {adminEmail && adminAppPassword ? "BRIDGE ONLINE — " + adminEmail : "BRIDGE OFFLINE — Configure below"}
                                 </p>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ms-2">Admin Gmail Address</label>
                                 <div className="relative">
                                    <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
                                    <input
                                      type="email"
                                      value={adminEmail}
                                      onChange={(e) => setAdminEmail(e.target.value)}
                                      placeholder="your.email@gmail.com"
                                      className="w-full h-12 bg-slate-950 border border-white/5 rounded-xl ps-12 pe-4 text-xs font-black text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-700"
                                    />
                                 </div>
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ms-2">App Password</label>
                                 <div className="relative">
                                    <Key className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
                                    <input
                                      type="password"
                                      value={adminAppPassword}
                                      onChange={(e) => setAdminAppPassword(e.target.value)}
                                      placeholder="••••••••••••••••"
                                      className="w-full h-12 bg-slate-950 border border-white/5 rounded-xl ps-12 pe-4 text-xs font-black text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-700"
                                    />
                                 </div>
                              </div>
                           </div>

                           <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl flex gap-4">
                              <Info className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">How to get an App Password</p>
                                 <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                                    Go to Google Account → Security → 2-Step Verification → App Passwords. Generate a password for "Mail" and paste it above.
                                 </p>
                              </div>
                           </div>

                           <div className="flex flex-col sm:flex-row gap-3 pt-2">
                              <button
                                onClick={handleSave}
                                disabled={isSaving || !adminEmail || !adminAppPassword}
                                className="h-12 px-10 bg-brand-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow shadow-brand-500/20 flex items-center justify-center gap-3 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Email Config
                              </button>
                              <button
                                onClick={async () => {
                                  if (!adminEmail) {
                                    toast.error("Please fill in email address");
                                    return;
                                  }
                                  try {
                                    await testEmail.mutateAsync(adminEmail);
                                    toast.success("Test email sent to " + adminEmail + "!");
                                  } catch (err: any) {
                                    toast.error(err.message || "Test email failed");
                                  }
                                }}
                                disabled={testEmail.isPending || !adminEmail}
                                className="h-12 px-10 bg-slate-900 text-white border border-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {testEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                Send Test Message
                              </button>
                           </div>
                        </div>
                     </section>
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-40 animate-fade-in relative">
                     <Shield className="w-24 h-24 text-slate-800 mb-8" />
                     <h2 className="text-xl font-sora font-black text-white tracking-[0.4em] uppercase">{t("settings.firewall_active")}</h2>
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{t("settings.security.desc")}</p>
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent)]" />
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default SettingsPage;
