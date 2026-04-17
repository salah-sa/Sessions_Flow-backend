import React, { useEffect, useState } from "react";
import { Minus, Square, X, Target, Menu, Bell, User, Search, HelpCircle } from "lucide-react";
import { getHost, cn } from "../../lib/utils";
import { useUIStore, useAuthStore, useAppStore } from "../../store/stores";
import NotificationCenter from "./NotificationCenter";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TopBar: React.FC = () => {
  const { t } = useTranslation();
  const [isDesktop, setIsDesktop] = useState(false);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const isOnline = useAppStore((s) => s.isOnline);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const [cairoTime, setCairoTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const checkHost = async () => {
      const host = await getHost();
      setIsDesktop(!!host);
    };
    checkHost();

    const timer = setInterval(() => {
      setCairoTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMinimize = async () => {
    const host = await getHost();
    host?.minimizeWindow();
  };

  const handleMaximize = async () => {
    const host = await getHost();
    host?.maximizeWindow();
  };

  const handleClose = async () => {
    const host = await getHost();
    host?.closeWindow();
  };

  // Helper for Cairo Time without external tz library
  const getCairoTimeString = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  };

  return (
    <div className="h-16 w-full flex items-center justify-between bg-[rgba(10,15,26,0.85)] backdrop-blur-xl border-b border-emerald-500/10 select-none app-drag-region z-50">
      <div className="flex items-center gap-4 px-5 h-full">
        {/* Mobile Hamburger Menu */}
        <button 
          onClick={toggleSidebar}
          aria-label="Toggle sidebar menu"
          className="lg:hidden p-2 -ms-2 text-slate-400 hover:text-white transition-colors app-no-drag"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500 rounded-xl shadow-[0_0_20px_-5px_rgba(16,185,129,0.6)]">
            <Target className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-sora font-extrabold text-[12px] tracking-tight text-white uppercase hidden sm:inline-block">
            Session<span className="text-emerald-400">Flow</span>
          </span>
        </div>

        <div className="ms-4 h-6 w-px bg-white/10" />
        
        {/* Welcome Back Greeting (from mockup) */}
        <div className="hidden md:flex items-center gap-3 app-no-drag">
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-white leading-none">
              {t("dashboard.welcome", "Welcome Back")}, <span className="text-emerald-400">{user?.name || "User"}</span>
            </span>
            {(() => {
              const isReady = isOnline && connectionStatus === "Connected";
              const isTransitioning = isOnline && connectionStatus === "Reconnecting";
              
              const statusColor = isReady ? "bg-emerald-500" : isTransitioning ? "bg-amber-500" : "bg-red-500";
              const statusGlow = isReady ? "shadow-[0_0_8px_rgba(16,185,129,0.5)]" : isTransitioning ? "shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "shadow-[0_0_8px_rgba(239,68,68,0.5)]";
              const statusText = !isOnline ? "Offline" : connectionStatus;
              
              return (
                <span className={cn("text-[10px] font-bold flex items-center gap-1.5 mt-1", isReady ? "text-emerald-500/70" : isTransitioning ? "text-amber-500/70" : "text-red-500/70")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusColor, statusGlow)} />
                  {statusText}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Center: Search Bar (from mockup) */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8 app-no-drag">
        <div className="relative w-full group">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <input 
            type="text"
            placeholder="Search..."
            className="w-full h-10 ps-11 pe-4 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center h-full app-no-drag">
        <div className="flex items-center gap-2 me-4 pe-4 border-e border-white/5 h-8">
           {/* Cairo Time Chip */}
           <div className="hidden xl:flex items-center gap-2.5 px-4 h-8 bg-white/[0.03] border border-white/5 rounded-full me-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <span className="text-[10px] font-black font-mono text-slate-400 tracking-wider">
               CAI {getCairoTimeString(cairoTime)}
             </span>
           </div>

           <NotificationCenter />
           
           {/* Help Button (from mockup) */}
           <button aria-label="Help" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:bg-white/5 transition-all">
             <HelpCircle className="w-4.5 h-4.5" />
           </button>

           <button 
             onClick={() => navigate("/profile")}
             aria-label="User profile"
             className="flex items-center gap-3 ms-2 p-1.5 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-emerald-500/20 group/profile"
           >
              <div className="text-end hidden lg:block">
                 <p className="text-[10px] font-black text-white leading-none uppercase tracking-widest group-hover/profile:text-emerald-400 transition-colors">{user?.name || "Member"}</p>
                 <p className="text-[8px] font-black text-slate-500 leading-none mt-1 uppercase tracking-tighter opacity-70">{user?.role || "ENGINEER"}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-emerald-500/20 flex items-center justify-center text-[11px] font-black text-white shadow-lg overflow-hidden relative group-hover/profile:border-emerald-500/50 transition-all">
                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
                 {user?.avatarUrl ? (
                   <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                 ) : (
                   user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />
                 )}
              </div>
           </button>
        </div>

        {isDesktop && (
          <div className="flex items-center h-full">
            <button
              onClick={handleMinimize}
              className="h-full px-4 hover:bg-slate-800 transition-colors"
              title="Minimize"
            >
              <Minus className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={handleMaximize}
              className="h-full px-4 hover:bg-slate-800 transition-colors"
              title="Maximize"
            >
              <Square className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={handleClose}
              className="h-full px-6 hover:bg-red-500/90 transition-colors group"
              title="Close to Tray"
            >
              <X className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
