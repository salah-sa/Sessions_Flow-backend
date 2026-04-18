import React from "react";
import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

const SecurityPanel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-32 opacity-40 animate-fade-in relative text-start">
      <Shield className="w-24 h-24 text-var(--ui-surface) mb-8" />
      <h2 className="text-xl font-sora font-black text-white tracking-[0.4em] uppercase">{t("settings.firewall_active")}</h2>
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{t("settings.security.desc")}</p>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent)]" />
    </div>
  );
};

export default SecurityPanel;
