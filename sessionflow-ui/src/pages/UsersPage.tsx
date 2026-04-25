import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAllUsers, useUserGovernanceMutations } from "../queries/useUsersQueries";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Card, Badge, Button, Input, Skeleton, ConfirmDialog } from "../components/ui";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Users, Search, Shield, ShieldAlert, ShieldOff, ShieldCheck,
  Filter, ChevronDown, X, Lock, Unlock, Eye, EyeOff, Clock,
  Ban, RotateCcw, UserCircle2, Mail, Crown, Calendar, FileWarning,
  BarChart3, Target, User, CheckCircle, MessageSquare, Settings, Map
} from "lucide-react";

// Available platform pages for blocking
const PLATFORM_PAGES = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "groups", label: "Groups", icon: Users },
  { key: "sessions", label: "Sessions", icon: Target },
  { key: "students", label: "Students", icon: User },
  { key: "attendance", label: "Attendance", icon: CheckCircle },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "history", label: "History", icon: Clock },
  { key: "plans", label: "Plans & Pricing", icon: Crown },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "timetable", label: "Timetable", icon: Calendar },
  { key: "map", label: "Student Map", icon: Map },
];

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionTier: string;
  isApproved: boolean;
  restrictedUntil?: string;
  restrictionReason?: string;
  blockedPages: string[];
  createdAt: string;
  avatarUrl?: string;
  status: "Active" | "Restricted" | "Banned" | "Pending";
}

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  Active: { color: "emerald", icon: ShieldCheck, label: "Active" },
  Restricted: { color: "amber", icon: ShieldAlert, label: "Restricted" },
  Banned: { color: "red", icon: ShieldOff, label: "Banned" },
  Pending: { color: "slate", icon: Shield, label: "Pending" },
};

const UsersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [showRestrictionPanel, setShowRestrictionPanel] = useState(false);
  const [showBlockedPagesPanel, setShowBlockedPagesPanel] = useState(false);
  const [pendingBlockedPages, setPendingBlockedPages] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: UserItem; days?: number } | null>(null);

  const { data, isLoading } = useAllUsers({ search: searchQuery, role: roleFilter || undefined });
  const { restrictMutation, restoreMutation, blockPagesMutation } = useUserGovernanceMutations();

  const users: UserItem[] = useMemo(() => data?.items ?? [], [data]);
  const totalCount = data?.totalCount ?? 0;

  // Stats
  const stats = useMemo(() => ({
    total: totalCount,
    active: users.filter(u => u.status === "Active").length,
    restricted: users.filter(u => u.status === "Restricted" || u.status === "Banned").length,
    students: users.filter(u => u.role === "Student").length,
    engineers: users.filter(u => u.role === "Engineer").length,
  }), [users, totalCount]);

  const handleRestrict = async (userId: string, days: number) => {
    try {
      await restrictMutation.mutateAsync({ id: userId, days });
      toast.success(days === -1 ? "User banned permanently." : `User restricted for ${days} day(s).`);
      setConfirmAction(null);
      setSelectedUser(null);
    } catch {
      toast.error("Failed to restrict user.");
    }
  };

  const handleRestore = async (userId: string) => {
    try {
      await restoreMutation.mutateAsync(userId);
      toast.success("User access restored.");
      setSelectedUser(null);
    } catch {
      toast.error("Failed to restore user.");
    }
  };

  const handleSaveBlockedPages = async (userId: string) => {
    try {
      await blockPagesMutation.mutateAsync({ id: userId, pages: pendingBlockedPages });
      toast.success("Page restrictions updated.");
      setShowBlockedPagesPanel(false);
    } catch {
      toast.error("Failed to update page restrictions.");
    }
  };

  const openBlockedPages = (user: UserItem) => {
    setSelectedUser(user);
    setPendingBlockedPages(user.blockedPages || []);
    setShowBlockedPagesPanel(true);
  };

  const togglePage = (key: string) => {
    setPendingBlockedPages(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] animate-fade-in overflow-hidden">
      {/* ── HEADER ── */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-[var(--ui-bg)]/50 backdrop-blur-3xl shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 text-start">
            <h1 className="text-2xl md:text-3xl font-sora font-semibold text-white tracking-tighter uppercase flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-glow shadow-purple-500/5">
                <Users className="w-7 h-7 text-purple-400" />
              </div>
              Users Dashboard
            </h1>
            <p className="text-slate-500 font-semibold text-xs uppercase ps-1">
              Administrative governance • User lifecycle management
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          {[
            { label: "Total", value: stats.total, color: "purple" },
            { label: "Active", value: stats.active, color: "emerald" },
            { label: "Restricted", value: stats.restricted, color: "amber" },
            { label: "Students", value: stats.students, color: "blue" },
            { label: "Engineers", value: stats.engineers, color: "cyan" },
          ].map(s => (
            <div key={s.label} className={cn(
              "p-3 rounded-xl border bg-[var(--ui-surface)] text-start",
              `border-${s.color}-500/10`
            )}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">{s.label}</p>
              <p className={cn("text-xl font-bold", `text-${s.color}-400`)}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SEARCH & FILTERS ── */}
      <div className="px-6 md:px-8 py-4 border-b border-white/5 flex flex-col md:flex-row gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full h-10 pl-10 pr-4 bg-[var(--ui-surface)] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {["", "Student", "Engineer"].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "h-10 px-4 rounded-xl text-xs font-semibold transition-all border",
                roleFilter === role
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : "bg-[var(--ui-surface)] border-white/10 text-slate-400 hover:text-white hover:border-white/20"
              )}
            >
              {role || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* ── USER LIST ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <Users className="w-16 h-16 text-slate-600 mb-4" />
            <p className="text-slate-500 font-semibold text-sm">No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => {
              const cfg = statusConfig[user.status] || statusConfig.Active;
              const StatusIcon = cfg.icon;
              return (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group p-4 rounded-2xl border bg-[var(--ui-surface)] hover:bg-white/[0.03] transition-all duration-300 cursor-pointer",
                    `border-${cfg.color}-500/10 hover:border-${cfg.color}-500/30`
                  )}
                  onClick={() => {
                    setSelectedUser(user);
                    setShowRestrictionPanel(true);
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={cn(
                      "relative w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                      `bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20`
                    )}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--ui-bg)]",
                        user.status === "Active" ? "bg-emerald-500" :
                        user.status === "Restricted" ? "bg-amber-500" :
                        user.status === "Banned" ? "bg-red-500" : "bg-slate-500"
                      )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-start">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                          user.role === "Student" ? "bg-blue-500/10 text-blue-400" :
                          user.role === "Engineer" ? "bg-cyan-500/10 text-cyan-400" :
                          "bg-purple-500/10 text-purple-400"
                        )}>{user.role}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {user.blockedPages?.length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg">
                          <Lock className="w-3 h-3 text-orange-400" />
                          <span className="text-[10px] font-bold text-orange-400">{user.blockedPages.length} blocked</span>
                        </div>
                      )}
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                        `bg-${cfg.color}-500/10`
                      )}>
                        <StatusIcon className={cn("w-3.5 h-3.5", `text-${cfg.color}-400`)} />
                        <span className={cn("text-[10px] font-bold uppercase", `text-${cfg.color}-400`)}>
                          {cfg.label}
                        </span>
                      </div>
                      {user.status === "Restricted" && user.restrictedUntil && (
                        <span className="text-[10px] text-amber-400/70 font-semibold">
                          {formatDistanceToNow(new Date(user.restrictedUntil), { addSuffix: true, locale: dateLocale })}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── USER GOVERNANCE PANEL (Side Sheet) ── */}
      <AnimatePresence>
        {showRestrictionPanel && selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => { setShowRestrictionPanel(false); setSelectedUser(null); }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-[var(--ui-bg)] border-l border-white/10 z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-sora font-bold text-white uppercase tracking-tight">User Governance</h2>
                  <button
                    onClick={() => { setShowRestrictionPanel(false); setSelectedUser(null); }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* User Identity Card */}
                <div className="p-4 rounded-2xl bg-[var(--ui-surface)] border border-white/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-400">
                      {selectedUser.avatarUrl ? (
                        <img src={selectedUser.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-start">
                      <p className="text-sm font-bold text-white">{selectedUser.name}</p>
                      <p className="text-xs text-slate-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-[9px] text-slate-500 font-semibold uppercase">Role</p>
                      <p className="text-xs font-bold text-white">{selectedUser.role}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-[9px] text-slate-500 font-semibold uppercase">Tier</p>
                      <p className="text-xs font-bold text-white">{selectedUser.subscriptionTier}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-[9px] text-slate-500 font-semibold uppercase">Status</p>
                      <p className={cn("text-xs font-bold", `text-${statusConfig[selectedUser.status]?.color || "slate"}-400`)}>
                        {selectedUser.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Access Restrictions */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5" /> Access Restrictions
                  </p>

                  {selectedUser.status !== "Active" && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-start">
                      <p className="text-xs font-semibold text-amber-400">
                        {selectedUser.status === "Banned" ? "🚫 Permanently Banned" : "⏳ Temporarily Restricted"}
                      </p>
                      {selectedUser.restrictionReason && (
                        <p className="text-[11px] text-amber-400/60 mt-1">{selectedUser.restrictionReason}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setConfirmAction({ type: "restrict", user: selectedUser, days: 7 })}
                      disabled={restrictMutation.isPending}
                      className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all text-start group"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="w-4 h-4 text-amber-400" /></div>
                      <div>
                        <p className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">Restrict 1 Week</p>
                        <p className="text-[10px] text-slate-500">Prevent access for 7 days</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setConfirmAction({ type: "restrict", user: selectedUser, days: 30 })}
                      disabled={restrictMutation.isPending}
                      className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/30 hover:bg-orange-500/10 transition-all text-start group"
                    >
                      <div className="p-2 rounded-lg bg-orange-500/10"><Calendar className="w-4 h-4 text-orange-400" /></div>
                      <div>
                        <p className="text-xs font-semibold text-white group-hover:text-orange-300 transition-colors">Restrict 1 Month</p>
                        <p className="text-[10px] text-slate-500">Prevent access for 30 days</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setConfirmAction({ type: "ban", user: selectedUser, days: -1 })}
                      disabled={restrictMutation.isPending}
                      className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all text-start group"
                    >
                      <div className="p-2 rounded-lg bg-red-500/10"><Ban className="w-4 h-4 text-red-400" /></div>
                      <div>
                        <p className="text-xs font-semibold text-white group-hover:text-red-300 transition-colors">Lifetime Ban</p>
                        <p className="text-[10px] text-slate-500">Permanently prevent access</p>
                      </div>
                    </button>

                    {(selectedUser.status === "Restricted" || selectedUser.status === "Banned") && (
                      <button
                        onClick={() => handleRestore(selectedUser.id)}
                        disabled={restoreMutation.isPending}
                        className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all text-start group"
                      >
                        <div className="p-2 rounded-lg bg-emerald-500/10"><RotateCcw className="w-4 h-4 text-emerald-400" /></div>
                        <div>
                          <p className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">Restore Access</p>
                          <p className="text-[10px] text-slate-500">Remove all restrictions immediately</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5" />

                {/* Page Blocking */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" /> Page Restrictions
                    </p>
                    <button
                      onClick={() => openBlockedPages(selectedUser)}
                      className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 transition-colors uppercase"
                    >
                      {showBlockedPagesPanel ? "Close" : "Manage"}
                    </button>
                  </div>

                  {selectedUser.blockedPages?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.blockedPages.map(p => (
                        <span key={p} className="px-2 py-1 rounded-md bg-orange-500/10 text-[10px] font-bold text-orange-400 border border-orange-500/20 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> {PLATFORM_PAGES.find(pp => pp.key === p)?.label || p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">No pages blocked</p>
                  )}

                  {showBlockedPagesPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {PLATFORM_PAGES.map(page => (
                        <button
                          key={page.key}
                          onClick={() => togglePage(page.key)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-start",
                            pendingBlockedPages.includes(page.key)
                              ? "bg-red-500/10 border-red-500/30 text-red-300"
                              : "bg-[var(--ui-surface)] border-white/5 text-slate-400 hover:border-white/20"
                          )}
                        >
                          <span className="text-sm"><page.icon className="w-4 h-4 text-slate-400" /></span>
                          <span className="text-xs font-semibold flex-1">{page.label}</span>
                          {pendingBlockedPages.includes(page.key) ? (
                            <EyeOff className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-emerald-500/50" />
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => handleSaveBlockedPages(selectedUser.id)}
                        disabled={blockPagesMutation.isPending}
                        className="w-full h-10 rounded-xl bg-purple-500 text-white text-xs font-semibold uppercase hover:bg-purple-600 transition-all flex items-center justify-center gap-2"
                      >
                        Save Page Restrictions
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CONFIRMATION DIALOG ── */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === "ban" ? "Confirm Lifetime Ban" : "Confirm Access Restriction"}
        description={
          confirmAction?.type === "ban"
            ? `This will permanently ban ${confirmAction.user.name}. They will lose access to all features but can still log in to view their status. Are you sure?`
            : `This will restrict ${confirmAction?.user.name}'s access for ${confirmAction?.days} day(s). They will be restricted from using platform features during this period.`
        }
        confirmLabel={confirmAction?.type === "ban" ? "Ban Permanently" : "Apply Restriction"}
        variant="danger"
        onConfirm={() => {
          if (confirmAction) handleRestrict(confirmAction.user.id, confirmAction.days ?? 7);
        }}
      />
    </div>
  );
};

export default UsersPage;
