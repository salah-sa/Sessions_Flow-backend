import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  History, 
  MessageSquare, 
  Settings, 
  ShieldCheck,
  GraduationCap,
  PlayCircle,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  ArchiveRestore
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore, useUIStore, useChatStore } from "../../store/stores";
import { useTranslation } from "react-i18next";
import { useHoverSound } from "../../hooks/useHoverSound";
import AnimatedChatIcon from "../ui/AnimatedChatIcon";

const Sidebar: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const playHover = useHoverSound();

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(nextLng);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    navigate("/login");
  };

  // PRIMARY NAVIGATION — Archive removed from here
  const navItems = [
    { name: t("common.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("common.groups"), href: "/groups", icon: Users },
    { name: t("common.sessions"), href: "/sessions", icon: PlayCircle },
    { name: t("common.timetable"), href: "/timetable", icon: Calendar },
    { name: t("common.students"), href: "/students", icon: GraduationCap },
    { name: t("common.history"), href: "/history", icon: History },
    { name: t("common.chat"), href: "/chat", icon: MessageSquare },
  ];

  const adminItems = [
    { name: t("common.operations"), href: "/admin", icon: ShieldCheck },
    { name: t("common.settings"), href: "/settings", icon: Settings },
  ];

  const handleLinkClick = () => {
    // On small screens, auto-close sidebar when a link is clicked
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  const renderNavLink = (item: { name: string; href: string; icon: React.ComponentType<any> }) => {
    const isChat = item.href === "/chat";
    const totalUnreadChat = Object.values(useChatStore((s) => s.unreadCounts)).reduce((a, b) => a + b, 0);

    return (
    <NavLink
      key={item.name}
      to={item.href}
      onClick={handleLinkClick}
      onMouseEnter={playHover}
      title={!sidebarOpen ? item.name : undefined}
      className={({ isActive }) => cn(
        "flex items-center gap-3 py-2.5 rounded-xl transition-all duration-300 relative group",
        sidebarOpen ? "px-3" : "px-0 justify-center w-11 mx-auto",
        isActive
          ? "bg-emerald-500/10 text-emerald-400"
          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute start-[-12px] w-1 h-5 bg-emerald-500 rounded-e-full shadow-[4px_0_12px_rgba(16,185,129,0.4)]" />
          )}
          <div className="relative shrink-0">
            {isChat ? (
              <AnimatedChatIcon 
                size={20} 
                state={totalUnreadChat > 0 ? "ping" : isActive ? "active" : "idle"}
                className={cn("transition-transform group-hover:scale-110", isActive && "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]")}
              />
            ) : (
              <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]")} />
            )}
            {isChat && totalUnreadChat > 0 && (
              <div className="absolute -top-1.5 -end-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
                {totalUnreadChat > 9 ? "9+" : totalUnreadChat}
              </div>
            )}
          </div>
          {(sidebarOpen || window.innerWidth < 1024) && (
            <span className={cn("font-bold text-[11px] uppercase tracking-widest transition-colors", isActive ? "text-emerald-400" : "text-slate-500")}>
              {item.name}
            </span>
          )}
        </>
      )}
    </NavLink>
  )};

  return (
    <aside
      className={cn(
        "h-full bg-[rgba(10,15,26,0.9)] backdrop-blur-xl border-e border-emerald-500/10 transition-all duration-300 flex flex-col z-50",
        sidebarOpen ? "w-64" : "w-0 lg:w-16 overflow-hidden"
      )}
    >
      {/* Aero Noir Branding */}
      <div className={cn("py-6 border-b border-emerald-500/10", sidebarOpen ? "px-5" : "px-2")}>
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-brand font-black text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              SF
            </div>
            <div>
              <p className="text-[14px] font-sora font-black text-white tracking-tighter uppercase leading-none">Session<span className="text-emerald-400">Flow</span></p>
              <p className="text-[8px] text-slate-500 font-sora font-black uppercase tracking-[0.25em] mt-0.5">Creative Intelligence</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-brand font-black text-[10px] shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              SF
            </div>
          </div>
        )}

        {/* Project Selector */}
        {sidebarOpen && (
          <button 
            onMouseEnter={playHover}
            className="mt-4 w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-500/15 transition-all group"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
            <span className="flex-1 text-start truncate">{user?.role === "Admin" ? "Admin Console" : "My Workspace"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════ */}
      {/* PRIMARY NAVIGATION */}
      {/* ════════════════════════════════════════ */}
      <div className={cn("flex-1 py-4 space-y-1 overflow-y-auto custom-scrollbar", sidebarOpen ? "px-3" : "px-2")}>
        {navItems.filter(item => {
          if (user?.role === "Student") {
            return [t("common.dashboard"), t("common.history"), t("common.chat")].includes(item.name);
          }
          return true;
        }).map(renderNavLink)}

        {/* Admin Section */}
        {user?.role === "Admin" && (
          <>
            <div className="pt-6 pb-3">
              <div className={cn("h-px bg-emerald-500/10", sidebarOpen ? "mx-2" : "mx-4")} />
              {(sidebarOpen || window.innerWidth < 1024) && (
                <p className="text-[10px] uppercase font-extrabold text-slate-600 mt-5 px-4 tracking-[0.2em] rtl:tracking-normal">{t("common.admin")}</p>
              )}
            </div>
            {adminItems.map(renderNavLink)}
          </>
        )}
      </div>

      {/* ════════════════════════════════════════ */}
      {/* LANGUAGE SWITCHER + ARCHIVE SECTION */}
      {/* Visually separated from primary nav */}
      {/* ════════════════════════════════════════ */}
      <div className={cn("border-t border-emerald-500/10 py-3 space-y-1", sidebarOpen ? "px-3" : "px-2")}>
        {/* Language Switcher — Above Archive */}
        <button
          onClick={toggleLanguage}
          onMouseEnter={playHover}
          className={cn(
            "flex items-center gap-3 py-2.5 rounded-xl transition-all duration-300 text-slate-500 hover:text-slate-300 hover:bg-white/5 w-full",
            sidebarOpen ? "px-3" : "px-0 justify-center w-11 mx-auto"
          )}
          title={!sidebarOpen ? (i18n.language === 'en' ? 'العربية' : 'English') : undefined}
        >
          <span className={cn(
            "w-5 h-5 shrink-0 rounded-md border border-current flex items-center justify-center text-[9px] font-black",
            i18n.language === 'ar' ? "text-emerald-400 border-emerald-500/30" : "text-slate-500"
          )}>
            {i18n.language === 'en' ? 'ع' : 'EN'}
          </span>
          {(sidebarOpen || window.innerWidth < 1024) && (
            <span className="font-bold text-[11px] uppercase tracking-widest">
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </span>
          )}
        </button>

        {/* ═══ Archive — WhatsApp-style dedicated section ═══ */}
        <NavLink
          to="/archive"
          onClick={handleLinkClick}
          onMouseEnter={playHover}
          title={!sidebarOpen ? t("common.archive") : undefined}
          className={({ isActive }) => cn(
            "flex items-center gap-3 py-2.5 rounded-xl transition-all duration-300 relative group",
            sidebarOpen ? "px-3" : "px-0 justify-center w-11 mx-auto",
            isActive
              ? "bg-amber-500/10 text-amber-400"
              : "text-slate-500 hover:text-amber-400/70 hover:bg-amber-500/5"
          )}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute start-[-12px] w-1 h-5 bg-amber-500 rounded-e-full shadow-[4px_0_12px_rgba(245,158,11,0.4)]" />
              )}
              {/* WhatsApp-style Archive Icon — box with down arrow */}
              <div className={cn(
                "w-5 h-5 shrink-0 relative flex items-center justify-center transition-transform group-hover:scale-110",
                isActive && "drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              )}>
                <ArchiveRestore className={cn("w-5 h-5", isActive ? "text-amber-400" : "text-slate-500 group-hover:text-amber-400/70")} />
              </div>
              {(sidebarOpen || window.innerWidth < 1024) && (
                <span className={cn("font-bold text-[11px] uppercase tracking-widest transition-colors", isActive ? "text-amber-400" : "text-slate-500")}>
                  {t("common.archive")}
                </span>
              )}
            </>
          )}
        </NavLink>
      </div>

      {/* ════════════════════════════════════════ */}
      {/* FOOTER — Theme + Logout */}
      {/* ════════════════════════════════════════ */}
      <div className="p-4 border-t border-emerald-500/10 bg-[rgba(10,15,26,0.6)] space-y-2">
        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center justify-center p-2 rounded-xl border border-emerald-500/10 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/10 transition-all",
              sidebarOpen ? "flex-1" : "w-11 mx-auto",
              theme === 'dark' ? "text-amber-400" : "text-emerald-400"
            )}
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 py-2.5 rounded-xl text-red-500/80 hover:bg-red-500/10 hover:text-red-400 transition-all group",
              !sidebarOpen ? "justify-center w-11 mx-auto px-0" : "flex-1 px-3"
            )}
            title={t("common.logout")}
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
            {sidebarOpen && <span className="font-bold text-[11px] uppercase tracking-widest">{t("common.logout")}</span>}
          </button>
        </div>

        <button
          onClick={toggleSidebar}
          className="hidden lg:flex w-full items-center justify-center p-2 rounded-md hover:bg-emerald-500/10 text-slate-400 transition-colors"
        >
          <div className={cn("flex flex-col gap-1 transition-all", sidebarOpen ? "rotate-0" : "rotate-90")}> 
            <div className="w-4 h-0.5 bg-current rounded-full" />
            <div className="w-4 h-0.5 bg-current rounded-full" />
            <div className="w-4 h-0.5 bg-current rounded-full" />
          </div>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-sm bg-slate-950 border border-emerald-500/20 rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <LogOut className="w-7 h-7 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-sora font-black text-white uppercase tracking-widest">{t("sidebar.logout.confirm_title")}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t("sidebar.logout.confirm_desc")}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 h-11 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
                >
                  {t("common.logout")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
