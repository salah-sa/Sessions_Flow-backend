import React from "react";
import { 
  BarChart3, 
  Users, 
  UsersRound,
  Settings, 
  MessageSquare, 
  Calendar, 
  ShieldCheck, 
  Zap,
  Target,
  Clock,
  Archive,
  User,
  UserCircle,
  Lock,
  CheckCircle,
  Crown,
  ShieldBan,
  Wallet,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  Brain,
  TrendingUp,
  Flag
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore, useSectionBadgeStore, useChatStore, selectEffectiveTier, useAIAgentStore, useUIStore } from "../../store/stores";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePendingEngineers } from "../../queries/useAdminQueries";
import { usePendingStudentRequests } from "../../queries/useEngineerQueries";
import { useQuery } from "@tanstack/react-query";
import { walletApi } from "../../api/walletApi";

const LanguageBridge: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggleLang = () => {
    const next = currentLang === "en" ? "ar" : "en";
    i18n.changeLanguage(next);
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  };

  return (
    <div className="px-6 py-3">
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Language Bridge</span>
        <button 
          onClick={toggleLang}
          className="relative w-16 h-8 bg-black rounded-full border border-white/5 p-1 flex items-center gap-1 overflow-hidden group"
        >
          <motion.div 
            animate={{ x: currentLang === "en" ? 0 : 32 }}
            className="absolute inset-y-1 w-6 h-6 bg-[var(--ui-accent)] rounded-full shadow-glow shadow-[var(--ui-accent)]/20 z-10"
          />
          <span className={cn("text-[8px] font-black uppercase tracking-widest flex-1 z-0 transition-opacity", currentLang === "en" ? "text-white" : "text-slate-600")}>EN</span>
          <span className={cn("text-[8px] font-black uppercase tracking-widest flex-1 z-0 transition-opacity", currentLang === "ar" ? "text-white" : "text-slate-600")}>AR</span>
        </button>
      </div>
    </div>
  );
};

const NavItem = ({ to, icon: Icon, label, badge, locked, premiumLocked, pageBlocked, walletVerified }: { to: string; icon: any; label: string; badge?: number; locked?: boolean; premiumLocked?: boolean; pageBlocked?: boolean; walletVerified?: boolean | null }) => {
  const user = useAuthStore((s) => s.user);
  
  const handleClick = (e: React.MouseEvent) => {
    if (pageBlocked) {
      e.preventDefault();
      const reason = user?.restrictionReason ? ` Reason: ${user.restrictionReason}` : "";
      toast.error(`Access to this page has been restricted by an administrator.${reason}`);
    } else if (locked) {
      e.preventDefault();
      toast.error("Not allowed, only for engineer");
    } else if (premiumLocked) {
      e.preventDefault();
      toast.error("Premium Feature. Please upgrade your subscription to access.");
    }
  };

  return (
    <NavLink
      to={to}
      onClick={handleClick}
      className={({ isActive }) => cn(
        "group relative flex items-center gap-4 px-6 py-2.5 rounded-xl transition-all duration-300 overflow-hidden",
        isActive && !locked && !pageBlocked ? "bg-[var(--ui-accent)]/10 text-white" : "text-slate-500 hover:text-white hover:bg-white/[0.02]",
        (locked || pageBlocked) && "opacity-75"
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && !locked && (
            <motion.div 
              layoutId="active-indicator"
              className="absolute start-0 w-1 h-6 bg-[var(--ui-accent)] rounded-e-full shadow-glow shadow-[var(--ui-accent)]/40"
            />
          )}
          <div className="relative">
            <Icon className={cn("w-5 h-5 transition-all duration-300", 
              isActive && !locked ? "text-[var(--ui-accent)]" : "group-hover:text-[var(--ui-accent)]",
              locked && "text-rose-500 group-hover:text-rose-500"
            )} />
            {walletVerified !== undefined && walletVerified !== null && (
              <span className={cn(
                "absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full border border-[var(--ui-sidebar-bg)]",
                walletVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              )} />
            )}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] flex-1">{label}</span>
          
          {locked || pageBlocked ? (
            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center backdrop-blur-md", pageBlocked ? "bg-rose-500/10 border border-rose-500/20 shadow-glow shadow-rose-500/10" : "bg-rose-500/10 border border-rose-500/20 shadow-glow shadow-rose-500/10")}>
               {pageBlocked ? (
                 <ShieldBan className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
               ) : (
                 <Lock className="w-3 h-3 text-rose-500" />
               )}
            </div>
          ) : premiumLocked ? (
            <div className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-glow shadow-purple-500/10 backdrop-blur-md">
               <Crown className="w-3 h-3 text-purple-400" />
            </div>
          ) : badge !== undefined && badge > 0 ? (
            <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[8px] font-bold shadow-glow shadow-rose-500/20">
              {badge}
            </span>
          ) : null}
          
          {isActive && !locked && (
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--ui-accent)]/5 to-transparent pointer-events-none" />
          )}
        </>
      )}
    </NavLink>
  );
};

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  const isStudent = user?.role === "Student";
  const isAdmin = user?.role === "Admin";
  const isEngineer = user?.role === "Engineer";

  const pendingEngineersReq = usePendingEngineers({ enabled: isAdmin });
  const pendingStudentsReq = usePendingStudentRequests({ enabled: isAdmin || isEngineer });

  const getUnseenCount = useSectionBadgeStore((s) => s.getUnseenCount);
  const markSectionSeen = useSectionBadgeStore((s) => s.markSectionSeen);
  
  const chatUnreadCounts = useChatStore((s) => s.unreadCounts);
  const chatBadgeCount = Object.values(chatUnreadCounts).reduce((a, b) => a + b, 0);

  const pendingEngineerIds = (pendingEngineersReq.data || []).map((x: any) => x.id);
  const pendingStudentIds = (pendingStudentsReq.data || []).map((x: any) => x.id);

  const adminBadgeCount = isAdmin 
    ? getUnseenCount("admin_engineers", pendingEngineerIds) + getUnseenCount("admin_students", pendingStudentIds)
    : 0;
    
  const staffBadgeCount = isEngineer 
    ? getUnseenCount("staff_students", pendingStudentIds)
    : 0;

  React.useEffect(() => {
    if (location.pathname.startsWith("/admin") && isAdmin) {
       markSectionSeen("admin_engineers", pendingEngineerIds);
       markSectionSeen("admin_students", pendingStudentIds);
    }
    if (location.pathname.startsWith("/staff") && isEngineer) {
       markSectionSeen("staff_students", pendingStudentIds);
    }
  }, [location.pathname, isAdmin, isEngineer, pendingEngineerIds.join(","), pendingStudentIds.join(","), markSectionSeen]);

  // Step 6: Use selectEffectiveTier so Admin always shows Enterprise, not Free
  const userTier = useAuthStore(selectEffectiveTier);
  const isPremium = isAdmin || userTier === "Pro" || userTier === "Enterprise" || userTier === "Ultra";
  const blockedPages = user?.blockedPages ?? [];
  const isBlocked = (routePath: string) => {
    let key = routePath.replace("/", "");
    if (key === "plans") key = "pricing";
    return blockedPages.includes(key);
  };

  const walletQuery = useQuery({ queryKey: ["wallet-me"], queryFn: walletApi.getMe, retry: 1, staleTime: 60_000 });
  const walletVerified = walletQuery.data ? walletQuery.data.isPhoneVerified : (walletQuery.isError ? false : null);

  const sidebarMode = useAIAgentStore((s) => s.sidebarMode);
  const setSidebarMode = useAIAgentStore((s) => s.setSidebarMode);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const isFloating = sidebarMode === 'floating';

  const SidebarContent = (
    <aside className="h-full w-[280px] bg-[var(--ui-sidebar-bg)] border-e border-white/5 flex flex-col z-[50]">
      <div className="px-6 py-4 mb-1 relative">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--ui-accent)] flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/20 relative overflow-hidden">
               <Zap className="w-6 h-6 text-white relative z-10" />
               <div className="absolute inset-0 bg-white/20 blur-xl scale-150 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white tracking-widest uppercase">SessionFlow</h2>
              <p className="text-[8px] font-bold text-[var(--ui-accent)] tracking-[0.4em] uppercase opacity-60">Neural Engine</p>
            </div>
            {/* Dock / Float toggle */}
            <button
              onClick={() => setSidebarMode(isFloating ? 'docked' : 'floating')}
              title={isFloating ? 'Dock sidebar' : 'Float sidebar'}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all flex-shrink-0"
              id="sidebar-mode-toggle"
            >
              {isFloating
                ? <PanelLeftClose className="w-4 h-4" />
                : <PanelLeftOpen className="w-4 h-4" />}
            </button>
         </div>
         {/* Tier Badge */}
         {userTier !== "Free" && (
           <div className={cn(
             "mt-3 mx-auto flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-[0.2em]",
             userTier === "Ultra"
               ? "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)] animate-pulse"
               : userTier === "Pro" 
               ? "bg-[var(--ui-accent)]/5 border-[var(--ui-accent)]/20 text-[var(--ui-accent)]" 
               : "bg-amber-500/5 border-amber-500/20 text-amber-400"
           )}>
             <Crown className={cn("w-3 h-3", userTier === "Enterprise" && "text-amber-400", userTier === "Ultra" && "text-fuchsia-400")} />
             {userTier}
           </div>
         )}
         <div className="absolute bottom-0 start-10 end-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto min-h-0 custom-scrollbar">
        <NavItem to="/dashboard" icon={BarChart3} label={t("nav.dashboard")} pageBlocked={isBlocked("/dashboard")} />
        <NavItem to="/groups" icon={Users} label={t("nav.groups") || "Groups"} locked={isStudent} pageBlocked={isBlocked("/groups")} />
        <NavItem to="/sessions" icon={Target} label={t("nav.sessions") || "Sessions"} locked={isStudent} pageBlocked={isBlocked("/sessions")} />
        <NavItem to="/students" icon={User} label={t("nav.students")} locked={isStudent} premiumLocked={isAdmin && !isPremium} pageBlocked={isBlocked("/students")} />
        <NavItem to="/timetable" icon={Calendar} label={t("nav.timetable")} pageBlocked={isBlocked("/timetable")} />
        <NavItem to="/attendance" icon={CheckCircle} label={t("nav.attendance") || "Attendance"} locked={isStudent} premiumLocked={isAdmin && !isPremium} pageBlocked={isBlocked("/attendance")} />
        {/* Step 8: My Attendance History — visible only for Students */}
        {isStudent && (
          <NavItem to="/attendance/history" icon={ClipboardList} label="My Attendance" />
        )}
        <NavItem to="/chat" icon={MessageSquare} label={t("nav.chat")} badge={chatBadgeCount} pageBlocked={isBlocked("/chat")} />
        <NavItem to="/wallet" icon={Wallet} label="Wallet" pageBlocked={isBlocked("/wallet")} walletVerified={walletVerified} />
        <NavItem to="/history" icon={Clock} label={t("nav.history") || "History"} pageBlocked={isBlocked("/history")} />
        
        <div className="py-3 px-6">
           <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mb-4">Core Modules</p>
           <div className="h-px bg-white/5" />
        </div>

        {user?.role === "Admin" && (
          <NavItem to="/admin" icon={ShieldCheck} label={t("staff.portal_title")} badge={adminBadgeCount} />
        )}
        {user?.role === "Admin" && (
          <NavItem to="/users" icon={UsersRound} label="Users" />
        )}
        {user?.role === "Engineer" && (
          <NavItem to="/staff" icon={Zap} label={t("staff.portal_title")} badge={staffBadgeCount} />
        )}
        
        {/* Intelligence Section — Admin Only */}
        {user?.role === "Admin" && (
          <>
            <div className="py-3 px-6">
              <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mb-4">Intelligence</p>
              <div className="h-px bg-white/5" />
            </div>
            <NavItem to="/ai-center" icon={Brain} label="AI Center" />
            <NavItem to="/analytics" icon={TrendingUp} label="Analytics" />
            <NavItem to="/session-timeline" icon={Clock} label="Session Timeline" />
            <NavItem to="/feature-flags" icon={Flag} label="Feature Flags" />
            <NavItem to="/broadcast" icon={MessageSquare} label="Broadcast" />
          </>
        )}

        {/* Engineers get AI Center + Timeline */}
        {user?.role === "Engineer" && (
          <>
            <div className="py-3 px-6">
              <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mb-4">Intelligence</p>
              <div className="h-px bg-white/5" />
            </div>
            <NavItem to="/ai-center" icon={Brain} label="AI Center" />
            <NavItem to="/session-timeline" icon={Clock} label="Session Timeline" />
          </>
        )}

        <NavItem to="/archive" icon={Archive} label={t("nav.archive") || "Archive"} locked={isStudent} />
        <NavItem to="/plans" icon={Crown} label={t("nav.plans") || "Plans & Upgrades"} locked={isStudent} />
        <NavItem to="/profile" icon={UserCircle} label={t("nav.profile") || "Profile"} />
        <NavItem to="/settings" icon={Settings} label={t("nav.settings")} locked={isStudent} />

        <LanguageBridge />
      </nav>


    </aside>
  );

  if (isFloating) {
    return (
      <AnimatePresence>
        <motion.div
          key="floating-sidebar-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm"
          onClick={() => { setSidebarMode('docked'); }}
        />
        <motion.div
          key="floating-sidebar"
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed left-0 top-0 h-full z-[9991] shadow-[8px_0_40px_rgba(0,0,0,0.6)]"
        >
          {SidebarContent}
        </motion.div>
      </AnimatePresence>
    );
  }

  return SidebarContent;
};

export default Sidebar;
