import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import ConnectionBanner from "./ConnectionBanner";
import NotificationPopup from "../chat/NotificationPopup";
import CallOverlay from "../call/CallOverlay";
import OfflineNotification from "./OfflineNotification";
import { GeoAuthorization } from "../dashboard/GeoAuthorization";
import { StudentWelcomeModal } from "../StudentWelcomeModal";
import { AIAgentWidget } from "../ai";


import { useRealtimeNotifications } from "../../hooks/realtime";
import { useHeartbeat } from "../../hooks/useHeartbeat";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useNotificationHub } from "../../queries/useNotificationHub";
import { useUIStore, useAuthStore } from "../../store/stores";
import { UIStyleManager, UIStyleConfig } from "../../styles/UIStyleManager";
import { cn } from "../../lib/utils";
import { X, Gift } from "lucide-react";

const Shell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const customTheme = useUIStore((s) => s.customTheme);
  const hydrated = useAuthStore((s) => s._hasHydrated);

  // Student free-app banner (dismissed via localStorage)
  const bannerKey = "sf_student_free_banner_dismissed";
  const [showFreeBanner, setShowFreeBanner] = React.useState(() => {
    return !localStorage.getItem(bannerKey);
  });
  const dismissBanner = () => {
    localStorage.setItem(bannerKey, "1");
    setShowFreeBanner(false);
  };
  const isStudent = user?.role === "Student";
  
  // Apply visual theme identity on mount and changes
  React.useEffect(() => {
    if (hydrated) {
      // In this version, we strictly use Obsidian as the base
      UIStyleManager.apply(UIStyleConfig.current, customTheme);
    }
  }, [hydrated, customTheme]);

  // Auth guard: redirect to login if no token and hydration is complete
  React.useEffect(() => {
    if (hydrated && !token) {
      navigate("/login", { replace: true });
    }
  }, [token, hydrated, navigate]);

  // Initialize real-time notifications
  useRealtimeNotifications();
  
  // Initialize 3-layer adaptive presence (heartbeat + client signals)
  useHeartbeat();
  
  // Global keyboard shortcuts
  useKeyboardShortcuts();

  // Platform-wide analytics tracking (page views auto-tracked)
  useAnalytics();

  // Real-time push notification hub (live alerts + broadcast)
  useNotificationHub();

  const isMinimized = useUIStore((s) => s.isMinimized);
  const setMinimized = useUIStore((s) => s.setMinimized);

  // Cinematic Page Transitions
  React.useEffect(() => {
    gsap.fromTo(".transition-content-wrapper", 
      { opacity: 0, scale: 0.98, filter: "blur(10px)" },
      { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out", clearProps: "all" }
    );
  }, [location.pathname]);

  // Handle Minimize Visual Effect
  React.useEffect(() => {
    if (isMinimized) {
      gsap.to(".shell-container", { scale: 0.92, opacity: 0, filter: "blur(20px)", duration: 0.6, ease: "power4.inOut" });
    } else {
      gsap.to(".shell-container", { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power4.out" });
    }
  }, [isMinimized]);

  // Don't render Shell content if not authenticated
  if (!token) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--ui-bg)] text-slate-50 overflow-hidden font-sans selection:bg-[var(--ui-accent)]/30">   
      <NotificationPopup />
      <CallOverlay />
      <OfflineNotification />
      <GeoAuthorization />
      <StudentWelcomeModal />
      <AIAgentWidget />

      
      {/* Zenith Central Horizon Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-10 lg:opacity-20 transition-opacity duration-1000">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[120%] h-[40%] bg-gradient-to-b from-[var(--ui-accent)] to-transparent blur-[120px] rounded-full" />
      </div>

      <AnimatePresence>
        {isMinimized && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer group"
            onClick={() => setMinimized(false)}
          >
            <div className="flex flex-col items-center gap-6 animate-pulse">
              <div className="w-20 h-20 rounded-3xl bg-[var(--ui-accent)]/20 border border-[var(--ui-accent)]/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <div className="w-4 h-1 bg-[var(--ui-accent)] rounded-full" />
              </div>
              <p className="text-[10px] font-black text-[var(--ui-accent)] uppercase tracking-[0.3em]">Restoration Sequence Required</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full shell-container">
        {/* Boundless Top Overlay */}
        <div className="z-50 bg-transparent app-no-drag">
          <TopBar />
          {/* Student Free App Banner */}
          {isStudent && showFreeBanner && (
            <div className="relative flex items-center justify-center gap-3 px-4 py-2.5 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-violet-600/20 border-b border-violet-500/20 animate-in slide-in-from-top duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent animate-scan pointer-events-none" />
              <Gift className="w-4 h-4 text-violet-400 shrink-0" />
              <p className="text-xs font-bold text-violet-300 text-center">
                🎉 <span className="text-white">SessionFlow is completely free for students.</span> No subscriptions, no hidden fees — ever.
              </p>
              <button
                onClick={dismissBanner}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-violet-400 hover:text-white hover:bg-violet-500/20 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <ConnectionBanner />

        <div className="flex-1 flex overflow-hidden relative">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-xl z-30 transition-opacity"
                onClick={toggleSidebar}
              />
            )}
          </AnimatePresence>

          <div className={cn(
            "fixed lg:relative h-full z-40 transition-all duration-500 ease-in-out transform overflow-hidden",
            "bg-transparent flex-shrink-0",
            sidebarOpen ? "w-[280px] translate-x-0 opacity-100" : "w-0 -translate-x-full lg:translate-x-0 opacity-0"
          )}>
            <div className="w-[280px] h-full">
              <Sidebar />
            </div>
          </div>

          <main className="flex-1 relative overflow-hidden bg-transparent h-full">
            {/* Subtle Atmosphere Behind Main Workspace */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(var(--ui-accent-rgb),0.04),transparent_70%)] pointer-events-none" />
            
            <div key={location.pathname} className="h-full w-full page-transition-container">
              <div className="h-full transition-content-wrapper max-w-8xl mx-auto">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Shell;
