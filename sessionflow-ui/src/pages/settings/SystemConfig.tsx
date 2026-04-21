import React from "react";
import { Mail, Sun, Moon, Globe, Terminal, DollarSign, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { useUIStore, CustomTheme } from "../../store/stores";
import { UIStyleManager, UIStyleConfig } from "../../styles/UIStyleManager";
import { Badge } from "../../components/ui";

interface SystemConfigProps {
  appName: string;
  setAppName: (val: string) => void;
  priceL1: string;
  setPriceL1: (val: string) => void;
  priceL2: string;
  setPriceL2: (val: string) => void;
  priceL3: string;
  setPriceL3: (val: string) => void;
  priceL4: string;
  setPriceL4: (val: string) => void;
  theme: string;
  setTheme: (theme: any) => void;
  customTheme: CustomTheme | null;
  updateCustomTheme: (theme: Partial<CustomTheme>) => void;
  activeStyle: string;
  handleToggleTheme: () => void;
}

const SystemConfig: React.FC<SystemConfigProps> = ({
  appName, setAppName,
  priceL1, setPriceL1,
  priceL2, setPriceL2,
  priceL3, setPriceL3,
  priceL4, setPriceL4,
  theme, setTheme,
  customTheme, updateCustomTheme,
  activeStyle, handleToggleTheme
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  return (
    <div className="space-y-12 animate-fade-in text-start">
      {/* Appearance & Skins */}
      <section className="space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="w-1.5 h-6 bg-[var(--ui-accent)] rounded-full" />
            {t("settings.display_interface")}
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.display_desc")}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Binary Theme Toggle */}
          <div className="card-base flex items-center justify-between group hover:bg-[var(--ui-sidebar-bg)] transition-all">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[var(--ui-bg)] rounded-2xl border border-white/5 flex items-center justify-center text-[var(--ui-accent)] group-hover:scale-110 transition-transform shadow-inner">
                {theme === "dark" ? <Moon className="w-7 h-7" /> : <Sun className="w-7 h-7 text-amber-500" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-white uppercase tracking-tighter">{t("settings.theme_mode", "Interface Mode")}</p>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t("settings.system.current_mode", { mode: theme.toUpperCase() })} {t("settings.status_active", "Active")}</p>
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
          <div className="card-base flex items-center justify-between group hover:bg-[var(--ui-sidebar-bg)] transition-all">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[var(--ui-bg)] rounded-2xl border border-white/5 flex items-center justify-center text-[var(--ui-accent)] group-hover:scale-110 transition-transform shadow-inner">
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
            <p className="text-xs font-black text-white uppercase tracking-widest">{t("settings.ui_interface", "Interface Style")}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">{t("settings.ui_interface_desc", "Customize the application interaction model")}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {UIStyleConfig.available.map((styleName) => (
              <button
                key={styleName}
                onClick={() => UIStyleManager.apply(styleName)}
                className={cn(
                  "flex flex-col items-start p-5 card-base text-left group transition-all duration-500",
                  activeStyle === styleName 
                    ? "border-[var(--ui-accent)] ring-4 ring-[var(--ui-accent)]/10 bg-[var(--ui-accent)]/5 translate-y-[-2px]" 
                    : "hover:border-white/10 hover:bg-[var(--ui-sidebar-bg)]/40"
                )}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
                    activeStyle === styleName ? "text-[var(--ui-accent)]" : "text-slate-500"
                  )}>
                    {styleName}
                  </span>
                  {activeStyle === styleName && (
                    <div className="w-5 h-5 rounded-full bg-[var(--ui-accent)] flex items-center justify-center animate-pulse-slow">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-sm rotate-45 transition-all duration-500",
                    activeStyle === styleName ? "bg-[var(--ui-accent)] shadow-glow" : "bg-[var(--ui-surface)]"
                  )} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    {styleName === "Obsidian" ? "Standard Style" : "Legacy Style"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Zenith Theme Customizer */}
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex flex-col gap-1.5 ps-5 border-t border-white/5 pt-8">
            <p className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[var(--ui-accent)]" />
              System Color Management
            </p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Live UI branding adjustments</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: "accent", label: "Accent", icon: <div className="w-2 h-2 rounded-full bg-[var(--ui-accent)] shadow-glow" /> },
              { key: "background", label: "Background", icon: <div className="w-2 h-2 rounded-full bg-[var(--ui-bg)] border border-white/10" /> },
              { key: "surface", label: "Surface", icon: <div className="w-2 h-2 rounded-full bg-[var(--ui-surface)] border border-white/10" /> },
              { key: "sidebar", label: "Sidebar", icon: <div className="w-2 h-2 rounded-full bg-[var(--ui-sidebar-bg)] border border-white/10" /> },
            ].map((color) => (
              <div key={color.key} className="card-base p-4 space-y-3 hover:border-[var(--ui-accent)]/20 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {color.icon}
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{color.label}</span>
                  </div>
                  <button 
                    onClick={() => updateCustomTheme({ [color.key]: "" })}
                    className="text-[8px] font-black text-slate-600 hover:text-[var(--ui-accent)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Reset
                  </button>
                </div>
                <div className="relative h-10 w-full rounded-xl overflow-hidden border border-white/5 bg-black/20">
                  <input 
                    type="color"
                    value={(customTheme?.[color.key as keyof CustomTheme] as string) || "#000000"}
                    onChange={(e) => updateCustomTheme({ [color.key]: e.target.value })}
                    className="absolute inset-[-10px] w-[150%] h-[150%] cursor-pointer bg-transparent"
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-mono font-black text-white/50 uppercase">
                      {(customTheme?.[color.key as keyof CustomTheme] as string) || "DEFAULT"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* General Configuration */}
      <section className="space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="w-1.5 h-6 bg-[var(--ui-accent)] rounded-full" />
            {t("settings.general_ops")}
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.general_ops_desc")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card-base space-y-4">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("settings.app_id")}</label>
            <div className="relative">
              <Terminal className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ui-accent)]" />
              <input 
                value={appName} 
                onChange={(e) => setAppName(e.target.value)}
                className="w-full h-12 bg-[var(--ui-bg)] border border-white/5 rounded-xl ps-12 pe-4 text-xs font-black text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/20 transition-all"
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
              className="w-full h-12 bg-[var(--ui-bg)] border border-white/5 rounded-xl flex items-center justify-between px-6 group"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-[var(--ui-accent)]" />
                <span className="text-xs font-black text-white uppercase tracking-widest">{language === 'ar' ? 'العربية' : 'English (US)'}</span>
              </div>
              <Badge variant="primary" className="bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border-none text-[8px] font-black tracking-widest">ACTIVE</Badge>
            </button>
          </div>
        </div>
      </section>

      {/* Financial Telemetry */}
      <section className="space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="w-1.5 h-6 bg-[var(--ui-accent)] rounded-full" />
            {t("settings.billing_config", "Billing Rates")}
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.billing_desc", "Configure session pricing for different student levels")}</p>
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
                  className="w-full h-10 bg-[var(--ui-bg)] border border-white/5 rounded-lg ps-10 pe-4 text-sm font-black text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent)]/20"
                />
                <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SystemConfig;
