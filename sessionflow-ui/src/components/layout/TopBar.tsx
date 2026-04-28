import React from "react";
import { 
  Bell, 
  Search, 
  Plus, 
  HelpCircle, 
  ChevronDown, 
  Maximize2, 
  MessageCircle,
  Zap,
  LayoutGrid,
  X,
  Minus,
  Maximize,
  Minimize2,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Monitor,
  Smartphone
} from "lucide-react";

import { format } from "date-fns";
import { useAuthStore, useAppStore, useUIStore } from "../../store/stores";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { cn, getTierBorderClass } from "../../lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import NotificationCenter from "./NotificationCenter";
import CommandPalette from "./CommandPalette";
import { useNotifications } from "../../queries/useNotificationQueries";
import { useIPGeolocation } from "../../queries/useGeoQueries";
import { ConfirmDialog } from "../ui";

const TopBar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { connectionMode, networkQuality } = useAppStore();

  const [notifOpen, setNotifOpen] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(format(new Date(), "hh:mm:ss a"));
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);
  const [isMobileDevice, setIsMobileDevice] = React.useState(false);
  
  const { studentLocationData, setStudentLocationData } = useAuthStore();
  const geoMutation = useIPGeolocation();

  React.useEffect(() => {
    if (!studentLocationData && !geoMutation.isPending && !geoMutation.isSuccess) {
      geoMutation.mutate();
    }
  }, [studentLocationData]);

  React.useEffect(() => {
    if (geoMutation.isSuccess && geoMutation.data && !studentLocationData) {
      setStudentLocationData({
        ...geoMutation.data,
        source: 'auto',
        timestamp: Date.now()
      });
    }
  }, [geoMutation.isSuccess, geoMutation.data]);

  React.useEffect(() => {
    const checkMobile = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileDevice(isMobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Notification Sync
  const { data: notificationData } = useNotifications();
  const unreadCount = notificationData?.unreadCount || 0;

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), "hh:mm:ss a"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const getFlagEmoji = (countryCode?: string) => {
    if (!countryCode) return "🌐";
    try {
      const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch (e) {
      return "🌐";
    }
  };

  const [isMaximized, setIsMaximized] = React.useState(false);

  // Helper to access the native host bridge
  const getHost = () => (window as any).chrome?.webview?.hostObjects?.sessionFlowHost;

  const setMinimized = useUIStore((s) => s.setMinimized);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const handleMinimize = async () => {
    const host = getHost();
    if (host) {
      await host.minimizeWindow();
    } else {
      setMinimized(true);
      toast("UI Node Minimized", {
        icon: <Minus className="w-4 h-4 text-emerald-500" />,
      });
      window.blur();
    }
  };

  const handleClose = () => {
    setShowExitConfirm(true);
  };

  const onConfirmExit = async () => {
    setIsExiting(true);
    const host = getHost();
    
    if (host) {
      await host.exitApp();
    } else {
      // Manual Close Instruction for Web
      window.close();
      
      // If window.close() is blocked (usual browser behavior)
      setTimeout(() => {
        toast.error("AUTONOMOUS SHUTDOWN PREVENTED", {
          description: "SECURITY PROTOCOL ACTIVE: Please terminate the neural link manually via the host browser tab.",
          icon: <Zap className="w-4 h-4 text-rose-500 shadow-glow shadow-rose-500/50" />,
          duration: 10000,
        });
        setShowExitConfirm(false);
        setIsExiting(false);
      }, 500);
    }
  };

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isExiting) return;
      // In a desktop environment with WebView2, beforeunload might be ignored 
      // but we keep it for web parity.
      // e.preventDefault();
      // e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isExiting]);

  const toggleFullscreen = async () => {
    const host = getHost();
    if (host) {
      await host.maximizeWindow();
      // Toggle local state (approximate since we don't have a reverse event yet)
      setIsMaximized(!isMaximized);
    } else if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
         toast.error("Fullscreen protocol denied by host");
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };


  return (
    <header className="h-[56px] md:h-[80px] bg-[var(--ui-sidebar-bg)] border-b border-white/5 flex items-center justify-between px-4 md:px-6 relative z-40 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--ui-accent)] to-transparent opacity-30" />
      
      <div className="flex items-center gap-3 flex-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSidebar}
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/5 hover:bg-[var(--ui-accent)]/20 transition-all cursor-pointer active:scale-95"
          >
             <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 text-[var(--ui-accent)]" />
          </button>
          <div className="text-start flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="text-[10px] md:text-sm font-bold text-white uppercase tracking-[0.1em] md:tracking-[0.2em]">{t("dashboard.title")}</h1>
              <span className="text-sm md:text-base" title={studentLocationData?.city || "Unknown Location"}>
                {getFlagEmoji(studentLocationData?.countryCode)}
              </span>
            </div>
            <div className="flex items-center gap-2 md:gap-3 mt-0.5">
               <div className="flex items-center gap-1.5">
                  <div className={cn("w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shadow-glow", connectionMode === "full" ? "bg-[var(--ui-accent)]" : "bg-rose-500 shadow-rose-500/50")} />
                  <span className="text-[7px] md:text-[8px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap hidden xs:inline">
                     {connectionMode === "full" ? "Online" : "Offline"}
                  </span>
               </div>
                <div className="w-px h-2.5 md:h-3 bg-white/10 hidden xs:block" />
                <div className="flex items-center gap-1.5">
                   <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-600" />
                   <span className="text-[8px] md:text-[9px] font-mono font-bold text-[var(--ui-accent)] tracking-tighter tabular-nums whitespace-nowrap">
                      {currentTime}
                   </span>
                </div>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setCmdOpen(true)}
          className="hidden md:flex items-center max-w-sm w-full relative group cursor-pointer"
        >
          <Search className="absolute left-4 w-4 h-4 text-slate-600 group-hover:text-[var(--ui-accent)] transition-colors" />
          <div className="w-full h-11 bg-white/[0.03] border border-white/5 rounded-xl pl-12 pr-4 flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-all select-none">
            {t("common.search_placeholder", "COMMAND SEARCH...")}
          </div>
          <div className="absolute right-3 px-2 py-1 rounded bg-white/[0.05] border border-white/5 text-[8px] font-black text-slate-600 tracking-tighter shadow-sm">CTRL + K</div>
        </div>
      </div>

      <div className="flex items-center gap-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-1 md:gap-4 border-r border-white/5 pe-2 md:pe-6">
           <button 
              onClick={() => navigate("/chat")}
              className="p-2 text-slate-500 hover:text-white transition-colors relative"
           >
              <MessageCircle className="w-4 h-4" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--ui-accent)] rounded-full border border-[var(--ui-sidebar-bg)] shadow-glow" />
           </button>
           <button 
             onClick={() => setNotifOpen(true)} 
             className="p-2 text-slate-500 hover:text-white transition-all relative group"
           >
              <Bell className={cn("w-4 h-4 transition-all", unreadCount > 0 && "text-[var(--ui-accent)] animate-[pulse_2s_infinite]")} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 bg-[var(--ui-accent)] text-black text-[8px] font-black rounded-full flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/40 animate-in zoom-in-50 duration-500">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
           </button>
        </div>

        <Link 
          to="/profile" 
          className="flex items-center gap-2 md:gap-4 px-3 md:px-6 group transition-all border-r border-white/5 h-full" 
        >
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-white uppercase tracking-widest leading-none group-hover:text-[var(--ui-accent)] transition-colors">{user?.name}</p>
            <p className="text-[8px] font-bold text-[var(--ui-accent)] uppercase tracking-widest mt-1.5 opacity-80">{user?.role} NODE</p>
          </div>
          <div className="relative">
             <div className={cn("rounded-xl", getTierBorderClass(user?.subscriptionTier))}>
               <div className="w-10 h-10 rounded-xl bg-[var(--ui-surface)] flex items-center justify-center text-white overflow-hidden shadow-xl transition-all duration-300 group-hover:shadow-[var(--ui-accent)]/10 relative z-10">
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : <div className="text-xs font-black">{user?.name?.charAt(0)}</div>}
               </div>
             </div>
             
             {/* Device-aware Online Indicator LED */}
             <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0a0a0a] border border-white/10 rounded-lg flex items-center justify-center shadow-xl z-10">
                <div className="w-full h-full rounded-lg bg-emerald-500/10 flex items-center justify-center relative">
                   {isMobileDevice ? (
                     <Smartphone className="w-3 h-3 text-emerald-500 animate-pulse shadow-glow shadow-emerald-500/50" />
                   ) : (
                     <Monitor className="w-3 h-3 text-emerald-500 animate-pulse shadow-glow shadow-emerald-500/50" />
                   )}
                   <div className="absolute inset-0 bg-emerald-500/20 blur-[2px] rounded-full animate-pulse" />
                </div>
             </div>
          </div>
        </Link>

        {/* Windows-style Window Controls on the FAR Right - Hidden on Mobile */}
        <div className="hidden md:flex items-center h-full">
          <button 
            onClick={handleMinimize}
            className="w-[48px] h-full flex items-center justify-center text-slate-500 hover:bg-white/5 transition-colors"
            title="Minimize"
          >
            <Minus className="w-[14px] h-[14px]" />
          </button>
          <button 
            onClick={toggleFullscreen}
            className="w-[48px] h-full flex items-center justify-center text-slate-500 hover:bg-white/5 transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="w-[14px] h-[14px]" />
            ) : (
              <Maximize className="w-[14px] h-[14px]" />
            )}
          </button>
          <button 
            onClick={handleClose} 
            className="w-[48px] h-full flex items-center justify-center text-slate-500 hover:bg-rose-600 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-[14px] h-[14px]" />
          </button>
        </div>
      </div>
      
      <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      
      <ConfirmDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={onConfirmExit}
        title="Terminate Neural Link?"
        description="Are you sure you want to disconnect? Any unsaved telemetry and active session data may be purged from local cache."
        confirmLabel="Confirm Exit"
        cancelLabel="Stay Connected"
        variant="danger"
        isLoading={isExiting}
      />
    </header>
  );
};

export default TopBar;
