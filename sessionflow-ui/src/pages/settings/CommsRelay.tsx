import React from "react";
import { Mail, Key, Info, Loader2, Save, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface CommsRelayProps {
  adminEmail: string;
  setAdminEmail: (val: string) => void;
  adminAppPassword: string;
  setAdminAppPassword: (val: string) => void;
  isSaving: boolean;
  handleSave: () => void;
  testEmail: any;
}

const CommsRelay: React.FC<CommsRelayProps> = ({
  adminEmail, setAdminEmail,
  adminAppPassword, setAdminAppPassword,
  isSaving, handleSave,
  testEmail
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-12 animate-fade-in text-start">
      <section className="space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-sora font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="w-1.5 h-6 bg-var(--ui-accent) rounded-full" />
            {t("settings.relay_protocols")}
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ps-5">{t("settings.relay_desc")}</p>
        </div>
        <div className="card-base space-y-8">
          {/* Gmail SMTP Direct Config */}
          <div className="flex items-center gap-6">
            <div className={cn(
              "w-16 h-16 rounded-2xl border flex items-center justify-center transition-all shadow-glow shrink-0",
              adminEmail && adminAppPassword ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-emerald-500/5" : "bg-var(--ui-bg) border-white/5 text-slate-500"
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
                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-var(--ui-accent)" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full h-12 bg-var(--ui-bg) border border-white/5 rounded-xl ps-12 pe-4 text-xs font-black text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-var(--ui-accent)/20 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ms-2">App Password</label>
              <div className="relative">
                <Key className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-var(--ui-accent)" />
                <input
                  type="password"
                  value={adminAppPassword}
                  onChange={(e) => setAdminAppPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full h-12 bg-var(--ui-bg) border border-white/5 rounded-xl ps-12 pe-4 text-xs font-black text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-var(--ui-accent)/20 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-var(--ui-accent)/5 border border-var(--ui-accent)/10 rounded-2xl flex gap-4">
            <Info className="w-5 h-5 text-var(--ui-accent) shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-black text-var(--ui-accent) uppercase tracking-widest">How to get an App Password</p>
              <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                Go to Google Account → Security → 2-Step Verification → App Passwords. Generate a password for "Mail" and paste it above.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !adminEmail || !adminAppPassword}
              className="h-12 px-10 bg-var(--ui-accent) text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow shadow-var(--ui-accent)/20 flex items-center justify-center gap-3 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="h-12 px-10 bg-var(--ui-sidebar-bg) text-white border border-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-var(--ui-surface) transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Send Test Message
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CommsRelay;
