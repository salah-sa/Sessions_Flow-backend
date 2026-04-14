import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import ConnectionBanner from "./ConnectionBanner";
import NotificationPopup from "../chat/NotificationPopup";
import { useRealtimeNotifications } from "../../hooks/realtime";
import { useHeartbeat } from "../../hooks/useHeartbeat";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useUIStore, useAuthStore } from "../../store/stores";
import { cn } from "../../lib/utils";

const Shell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s._hasHydrated);
  
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

  // Cinematic Page Transitions
  React.useEffect(() => {
    gsap.fromTo(".transition-content-wrapper", 
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.6, ease: "expo.out", clearProps: "all" }
    );
  }, [location.pathname]);

  // Don't render Shell content if not authenticated
  if (!token) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0f1a] text-slate-50 overflow-hidden font-sans selection:bg-emerald-500/30">   
      <NotificationPopup />
      {/* Cinematic Ambient Nebula System */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-10 lg:opacity-20 transition-opacity duration-1000">
        {/* Dynamic Orbs */}
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[50%] bg-emerald-600/30 blur-[140px] rounded-full animate-breathe" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[60%] bg-blue-600/20 blur-[160px] rounded-full animate-breathe" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[30%] right-[-15%] w-[40%] h-[40%] bg-cyan-400/10 blur-[120px] rounded-full animate-breathe" style={{ animationDelay: "1s" }} />
      </div>

      <div className="z-50 border-b border-white/[0.03] bg-[rgba(10,15,26,0.7)] backdrop-blur-3xl shadow-[0_1px_20px_rgba(0,0,0,0.5)]">
        <TopBar />
      </div>

      {/* Degradation Engine Banner — visible only in hybrid/degraded modes */}
      <ConnectionBanner />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-30 transition-opacity"
              onClick={toggleSidebar}
            />
          )}
        </AnimatePresence>

        <div className={cn(
          "fixed lg:relative h-full z-40 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) transform lg:!transform-none",
          "border-r border-white/[0.03] bg-[rgba(10,15,26,0.8)] backdrop-blur-3xl shadow-2xl",
          sidebarOpen 
            ? "translate-x-0" 
            : "-translate-x-full rtl:translate-x-full lg:!translate-x-0"
        )}>
          <Sidebar />
        </div>

        <main className="flex-1 relative overflow-hidden bg-transparent h-full">
          {/* Spatial Depth Layer */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.03),transparent)] pointer-events-none" />
          
          <div 
            key={location.pathname}
            className="h-full w-full page-transition-container"
          >
            <div className="h-full transition-content-wrapper max-w-8xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Shell;
