import React from "react";
import { 
  BarChart3, 
  Users, 
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
  Lock
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore, useSectionBadgeStore, useChatStore } from "../../store/stores";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePendingEngineers } from "../../queries/useAdminQueries";
import { usePendingStudentRequests } from "../../queries/useEngineerQueries";

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

const NavItem = ({ to, icon: Icon, label, badge, locked }: { to: string; icon: any; label: string; badge?: number; locked?: boolean }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (locked) {
      e.preventDefault();
      toast.error("Not allowed, only for engineer");
    }
  };

  return (
    <NavLink
      to={to}
      onClick={handleClick}
      className={({ isActive }) => cn(
        "group relative flex items-center gap-4 px-6 py-2.5 rounded-xl transition-all duration-300 overflow-hidden",
        isActive && !locked ? "bg-[var(--ui-accent)]/10 text-white" : "text-slate-500 hover:text-white hover:bg-white/[0.02]",
        locked && "opacity-75"
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && !locked && (
            <motion.div 
              layoutId="active-indicator"
              className="absolute left-0 w-1 h-6 bg-[var(--ui-accent)] rounded-r-full shadow-glow shadow-[var(--ui-accent)]/40"
            />
          )}
          <Icon className={cn("w-5 h-5 transition-all duration-300", 
            isActive && !locked ? "text-[var(--ui-accent)]" : "group-hover:text-[var(--ui-accent)]",
            locked && "text-rose-500 group-hover:text-rose-500"
          )} />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] flex-1">{label}</span>
          
          {locked ? (
            <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-glow shadow-rose-500/10 backdrop-blur-md">
               <Lock className="w-3 h-3 text-rose-500" />
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

  return (
    <aside className="h-full w-[280px] bg-[var(--ui-sidebar-bg)] border-e border-white/5 flex flex-col z-[50]">
      <div className="px-6 py-4 mb-1 relative">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--ui-accent)] flex items-center justify-center shadow-glow shadow-[var(--ui-accent)]/20 relative overflow-hidden">
               <Zap className="w-6 h-6 text-white relative z-10" />
               <div className="absolute inset-0 bg-white/20 blur-xl scale-150 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-widest uppercase">Zenith</h2>
              <p className="text-[8px] font-bold text-[var(--ui-accent)] tracking-[0.4em] uppercase opacity-60">Session Flow</p>
            </div>
         </div>
         <div className="absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto min-h-0 custom-scrollbar">
        <NavItem to="/dashboard" icon={BarChart3} label={t("nav.dashboard")} />
        <NavItem to="/groups" icon={Users} label={t("nav.groups") || "Groups"} locked={isStudent} />
        <NavItem to="/sessions" icon={Target} label={t("nav.sessions") || "Sessions"} locked={isStudent} />
        <NavItem to="/students" icon={User} label={t("nav.students")} locked={isStudent} />
        <NavItem to="/timetable" icon={Calendar} label={t("nav.timetable")} />
        <NavItem to="/chat" icon={MessageSquare} label={t("nav.chat")} badge={chatBadgeCount} />
        <NavItem to="/history" icon={Clock} label={t("nav.history") || "History"} />
        
        <div className="py-3 px-6">
           <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mb-4">Core Modules</p>
           <div className="h-px bg-white/5" />
        </div>

        {user?.role === "Admin" && (
          <NavItem to="/admin" icon={ShieldCheck} label={t("staff.portal_title")} badge={adminBadgeCount} />
        )}
        {user?.role === "Engineer" && (
          <NavItem to="/staff" icon={Zap} label={t("staff.portal_title")} badge={staffBadgeCount} />
        )}
        
        <NavItem to="/archive" icon={Archive} label={t("nav.archive") || "Archive"} locked={isStudent} />
        <NavItem to="/profile" icon={UserCircle} label={t("nav.profile") || "Profile"} />
        <NavItem to="/settings" icon={Settings} label={t("nav.settings")} locked={isStudent} />

        <LanguageBridge />
      </nav>


    </aside>
  );
};

export default Sidebar;
