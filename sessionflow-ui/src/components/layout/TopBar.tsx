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
  AlertTriangle
} from "lucide-react";

import { format } from "date-fns";
import { useAuthStore, useAppStore, useUIStore } from "../../store/stores";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import NotificationCenter from "./NotificationCenter";
import CommandPalette from "./CommandPalette";
import { useNotifications } from "../../queries/useNotificationQueries";
import { ConfirmDialog } from "../ui";

const TopBar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { connectionMode, networkQuality } = useAppStore();

  const [notifOpen, setNotifOpen] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(format(new Date(), "HH:mm:ss"));
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);

  // Notification Sync
  const { data: notificationData } = useNotifications();
  const unreadCount = notificationData?.unreadCount || 0;

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), "HH:mm:ss"));
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

  const [isMaximized, setIsMaximized] = React.useState(false);

  // Helper to access the native host bridge
  const getHost = () => (window as any).chrome?.webview?.hostObjects?.sessionFlowHost;

  const setMinimized = useUIStore((s) => s.setMinimized);

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
    <header className="h-[80px] bg-[var(--ui-sidebar-bg)] border-b border-white/5 flex items-center justify-between px-6 relative z-40 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--ui-accent)] to-transparent opacity-30" />
      
      <div className="flex items-center gap-3 flex-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/5">
             <LayoutGrid className="w-5 h-5 text-[var(--ui-accent)]" />
          </div>
          <div className="hidden sm:block text-start">
            <h1 className="text-sm font-bold text-white uppercase tracking-[0.2em]">{t("dashboard.title")}</h1>
            <div className="flex items-center gap-3 mt-0.5">
               <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full shadow-glow", connectionMode === "full" ? "bg-[var(--ui-accent)]" : "bg-rose-500 shadow-rose-500/50")} />
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                     {connectionMode === "full" ? "Neural Link Online" : "Disconnected"}
                  </span>
               </div>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.02] border border-white/5">
                   {networkQuality === "excellent" ? (
                     <Zap className="w-3 h-3 text-emerald-500 shadow-glow shadow-emerald-500/50" />
                   ) : networkQuality === "good" ? (
                     <Wifi className="w-3 h-3 text-[var(--ui-accent)] shadow-glow shadow-[var(--ui-accent)]/50" />
                   ) : networkQuality === "weak" ? (
                     <AlertTriangle className="w-3 h-3 text-amber-500 shadow-glow shadow-amber-500/50" />
                   ) : (
                     <WifiOff className="w-3 h-3 text-rose-500 shadow-glow shadow-rose-500/50" />
                   )}
                   <span className={cn(
                     "text-[8px] font-black uppercase tracking-widest",
                     networkQuality === "excellent" ? "text-emerald-500" :
                     networkQuality === "good" ? "text-[var(--ui-accent)]" :
                     networkQuality === "weak" ? "text-amber-500" : "text-rose-500"
                   )}>
                      {networkQuality.toUpperCase()}
                   </span>
                </div>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5">
                   <Clock className="w-3 h-3 text-slate-600" />
                   <span className="text-[9px] font-mono font-bold text-[var(--ui-accent)] tracking-tighter tabular-nums">
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
        <div className="hidden lg:flex items-center gap-4 border-r border-white/5 pe-6">
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
          className="flex items-center gap-4 px-6 group transition-all border-r border-white/5 h-[80px]" 
        >
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-white uppercase tracking-widest leading-none group-hover:text-[var(--ui-accent)] transition-colors">{user?.name}</p>
            <p className="text-[8px] font-bold text-[var(--ui-accent)] uppercase tracking-widest mt-1.5 opacity-80">{user?.role} NODE</p>
          </div>
          <div className="relative">
             <div className="w-10 h-10 rounded-xl bg-[var(--ui-surface)] border border-white/5 flex items-center justify-center text-white overflow-hidden shadow-xl transition-all duration-300 group-hover:border-[var(--ui-accent)]/50 group-hover:shadow-[var(--ui-accent)]/10 ring-0 group-hover:ring-4 ring-[var(--ui-accent)]/5">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : <div className="text-xs font-black">{user?.name?.charAt(0)}</div>}
             </div>
          </div>
        </Link>

        {/* Windows-style Window Controls on the FAR Right */}
        <div className="flex items-center h-[80px]">
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
