import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAllUsers, useUserGovernanceMutations } from "../queries/useUsersQueries";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Card, Badge, Button, Input, Skeleton, ConfirmDialog } from "../components/ui";
import { formatDistanceToNow, format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sendBroadcast, getBroadcastHistory } from "../api/newFeatures";
import {
  Users, Search, Shield, ShieldAlert, ShieldOff, ShieldCheck,
  Filter, ChevronDown, X, Lock, Unlock, Eye, EyeOff, Clock,
  Ban, RotateCcw, UserCircle2, Mail, Crown, Calendar, FileWarning,
  BarChart3, Target, User, CheckCircle, MessageSquare, Settings, Map,
  Megaphone, Send, Radio, Loader2, ChevronRight, AlertTriangle,
  CheckCircle2, History, Globe, Bell
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
    admins: users.filter(u => u.role === "Admin").length,
  }), [users, totalCount]);

  const handleRestrict = async (userId: string, days: number) => {
    try {
      await restrictMutation.mutateAsync({ id: userId, days });
      toast.success(days === -1 ? "User banned permanently." : `User restricted for ${days} day(s).`);
      setConfirmAction(null);
    } catch {
      toast.error("Failed to restrict user.");
    }
  };

  const handleRestore = async (userId: string) => {
    try {
      await restoreMutation.mutateAsync(userId);
      toast.success("User access restored.");
    } catch {
      toast.error("Failed to restore user.");
    }
  };

  // Keep selectedUser in sync with latest query data so UI updates immediately
  React.useEffect(() => {
    if (selectedUser && users.length > 0) {
      const updatedUser = users.find(u => u.id === selectedUser.id);
      if (updatedUser && updatedUser.status !== selectedUser.status) {
        setSelectedUser(updatedUser);
      } else if (updatedUser && JSON.stringify(updatedUser.blockedPages) !== JSON.stringify(selectedUser.blockedPages)) {
        setSelectedUser(updatedUser);
      }
    }
  }, [users, selectedUser]);

  const handleSaveBlockedPages = async (userId: string) => {
    try {
      await blockPagesMutation.mutateAsync({ id: userId, pages: pendingBlockedPages });
      toast.success("Page restrictions updated.");
      setShowBlockedPagesPanel(false);
    } catch {
      toast.error("Failed to update page restrictions.");
    }
  };

  const [isResending, setIsResending] = useState(false);
  const handleResendWelcome = async (userId: string) => {
    try {
      setIsResending(true);
      const { resendWelcomeEmail } = await import("../api/authService");
      const res = await resendWelcomeEmail(userId);
      if (res.success) {
        toast.success("Welcome email resent successfully.");
      } else {
        toast.error(res.error || "Failed to resend welcome email.");
      }
    } catch {
      toast.error("An error occurred while resending email.");
    } finally {
      setIsResending(false);
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

  const [broadcastOpen, setBroadcastOpen] = useState(false);

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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
          {[
            { label: "Total", value: stats.total, color: "purple" },
            { label: "Active", value: stats.active, color: "emerald" },
            { label: "Restricted", value: stats.restricted, color: "amber" },
            { label: "Students", value: stats.students, color: "blue" },
            { label: "Engineers", value: stats.engineers, color: "cyan" },
            { label: "Admins", value: stats.admins, color: "rose" },
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

      {/* ── BROADCAST COMMUNICATION MODULE ── */}
      <div className="px-6 md:px-8 py-4 border-b border-white/5 shrink-0">
        <button
          onClick={() => setBroadcastOpen(v => !v)}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-purple-500/5 border border-violet-500/20 hover:border-violet-500/40 hover:from-violet-500/10 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Megaphone className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-start">
              <p className="text-sm font-bold text-white">Admin Broadcast</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Compose &amp; send formal messages to all users</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-md bg-violet-500/10 text-[9px] font-black text-violet-400 uppercase tracking-widest">Email + In-App</span>
            <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", broadcastOpen && "rotate-180")} />
          </div>
        </button>

        <AnimatePresence>
          {broadcastOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <BroadcastComposer />
            </motion.div>
          )}
        </AnimatePresence>
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
          {["", "Student", "Engineer", "Admin"].map(role => (
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
                {selectedUser.role === "Admin" ? (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center mt-4">
                    <ShieldAlert className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold text-purple-400">Admin Protected</p>
                    <p className="text-xs text-purple-400/70 mt-1">Administrators cannot be restricted or have pages blocked.</p>
                  </div>
                ) : (
                  <>
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

                    {/* Quick Support Actions */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> Support Actions
                      </p>
                      
                      <button
                        onClick={() => handleResendWelcome(selectedUser.id)}
                        disabled={isResending}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all text-start group disabled:opacity-50"
                      >
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <RotateCcw className={cn("w-4 h-4 text-purple-400", isResending && "animate-spin")} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">Resend Welcome Email</p>
                          <p className="text-[10px] text-slate-500">Triggers credentials email delivery via Resend</p>
                        </div>
                      </button>
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
                </>
                )}
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

// ─────────────────────────────────────────────────────────────────────────────
// BroadcastComposer — Full Admin Email Broadcast Module
// ─────────────────────────────────────────────────────────────────────────────

type BroadcastStep = "compose" | "preview" | "confirm" | "sent";

const CHANNEL_OPTIONS = [
  { id: "Both",  label: "Email + In-App",  icon: Globe,  desc: "Reaches all users via email and in-app notification",  color: "violet" },
  { id: "Email", label: "Email Only",      icon: Mail,   desc: "Formal email delivery only (ideal for announcements)", color: "blue" },
  { id: "InApp", label: "In-App Only",     icon: Bell,   desc: "Silent push to in-app notification center",            color: "emerald" },
] as const;

const BroadcastComposer: React.FC = () => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<BroadcastStep>("compose");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<"InApp" | "Email" | "Both">("Both");
  const [showHistory, setShowHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["broadcast-history-users", historyPage],
    queryFn: () => getBroadcastHistory(historyPage, 5),
    staleTime: 60_000,
    enabled: showHistory,
  });

  const mutation = useMutation({
    mutationFn: () => sendBroadcast(subject.trim(), body.trim(), channel),
    onSuccess: (data) => {
      toast.success(`📢 Broadcast delivered to ${data.recipientCount} users`);
      setStep("sent");
      queryClient.invalidateQueries({ queryKey: ["broadcast-history-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Broadcast failed. Please try again.");
      setStep("compose");
    },
  });

  const canProceed = subject.trim().length >= 3 && body.trim().length >= 10;
  const bodyChars  = body.length;
  const bodyMax    = 2000;
  const bodyPct    = (bodyChars / bodyMax) * 100;

  const reset = () => {
    setStep("compose"); setSubject(""); setBody(""); setChannel("Both");
  };

  const selectedChannel = CHANNEL_OPTIONS.find(c => c.id === channel)!;

  return (
    <div className="mt-4 space-y-4">

      {/* Step indicator */}
      <div className="flex items-center gap-2 px-1">
        {(["compose","preview","confirm"] as BroadcastStep[]).map((s, i) => (
          <React.Fragment key={s}>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
              step === s
                ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                : (["compose","preview","confirm"].indexOf(step) > i)
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "border-white/10 text-slate-600"
            )}>
              {(["compose","preview","confirm"].indexOf(step) > i)
                ? <CheckCircle2 className="w-2.5 h-2.5" />
                : <span>{i + 1}</span>}
              {s}
            </div>
            {i < 2 && <div className="flex-1 h-px bg-white/5" />}
          </React.Fragment>
        ))}
      </div>

      {/* ─── COMPOSE ─── */}
      {step === "compose" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-4 p-5 rounded-2xl bg-black/20 border border-white/5"
        >
          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject Line</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value.slice(0, 120))}
              placeholder="e.g. Important Platform Update — Action Required"
              className="w-full h-11 px-4 bg-[var(--ui-surface)] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none transition-all"
            />
            <div className="flex justify-between">
              <p className="text-[9px] text-slate-600">Clear, formal subject for email delivery</p>
              <span className="text-[9px] text-slate-600 font-mono">{subject.length}/120</span>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message Body</label>
            <div className="relative">
              <textarea
                value={body}
                onChange={e => setBody(e.target.value.slice(0, bodyMax))}
                placeholder={"Dear valued user,\n\nWe are writing to inform you of an important update...\n\nBest regards,\nSessionFlow Team"}
                rows={7}
                className="w-full bg-[var(--ui-surface)] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-violet-500/40 transition-all leading-relaxed"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className={cn("text-[9px] font-bold tabular-nums", bodyPct >= 90 ? "text-red-400" : bodyPct >= 75 ? "text-amber-400" : "text-slate-600")}>
                  {bodyChars}/{bodyMax}
                </span>
                {bodyPct > 0 && (
                  <div className="w-14 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", bodyPct >= 90 ? "bg-red-500" : bodyPct >= 75 ? "bg-amber-500" : "bg-violet-500")}
                      style={{ width: `${Math.min(bodyPct, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Channel selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Delivery Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNEL_OPTIONS.map(ch => {
                const Icon = ch.icon;
                const active = channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setChannel(ch.id as any)}
                    className={cn(
                      "p-3 rounded-xl border text-start transition-all",
                      active
                        ? `bg-${ch.color}-500/10 border-${ch.color}-500/40`
                        : "bg-[var(--ui-surface)] border-white/10 hover:border-white/20"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 mb-1.5", active ? `text-${ch.color}-400` : "text-slate-500")} />
                    <p className={cn("text-[10px] font-bold uppercase tracking-wide", active ? `text-${ch.color}-300` : "text-slate-400")}>{ch.label}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5 leading-tight">{ch.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            disabled={!canProceed}
            onClick={() => setStep("preview")}
            className="w-full h-11 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-violet-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Preview Message <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* ─── PREVIEW ─── */}
      {step === "preview" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-4 p-5 rounded-2xl bg-black/20 border border-white/5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-violet-400" />
            <p className="text-xs font-bold text-white uppercase tracking-widest">Email Preview</p>
          </div>

          {/* Email mock */}
          <div className="rounded-2xl overflow-hidden border border-white/10">
            <div className="bg-slate-900 px-5 py-4 border-b border-white/5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-semibold w-14 shrink-0">FROM</span>
                <span className="text-[11px] text-slate-300">SessionFlow Admin &lt;noreply@sessionflow.app&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-semibold w-14 shrink-0">TO</span>
                <span className="text-[11px] text-slate-300">All Active Users</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] bg-violet-500/10 text-violet-400 font-bold border border-violet-500/20">BULK</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-semibold w-14 shrink-0">VIA</span>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                  channel === "Both" ? "bg-violet-500/10 text-violet-400" : channel === "Email" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                )}>{selectedChannel.label}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-white/5 mt-2">
                <span className="text-[10px] text-slate-500 font-semibold w-14 shrink-0">SUBJECT</span>
                <span className="text-sm font-semibold text-white">{subject}</span>
              </div>
            </div>
            <div className="bg-[#0d0d12] px-5 py-5 min-h-[120px]">
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{body}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("compose")}
              className="flex-1 h-11 rounded-xl border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-white/20 hover:text-white transition-all"
            >
              ← Edit
            </button>
            <button
              onClick={() => setStep("confirm")}
              className="flex-1 h-11 rounded-xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-violet-500 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" /> Confirm & Send
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── CONFIRM ─── */}
      {step === "confirm" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-5"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-start">
              <p className="text-sm font-bold text-white">Confirm Broadcast</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                You are about to send <span className="text-amber-400 font-bold">"{subject}"</span> to <span className="text-amber-400 font-bold">all active users</span> via <span className="text-amber-400 font-bold">{selectedChannel.label}</span>. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("preview")}
              disabled={mutation.isPending}
              className="flex-1 h-11 rounded-xl border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-white/20 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Send Now</>}
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── SENT ─── */}
      {step === "sent" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center gap-4 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <p className="text-base font-bold text-white">Broadcast Sent Successfully</p>
            <p className="text-xs text-slate-400 mt-1">
              Your message <span className="text-emerald-400 font-semibold">"{subject}"</span> has been queued for delivery to all active users.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={reset}
              className="flex-1 h-10 rounded-xl border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
            >
              New Broadcast
            </button>
            <button
              onClick={() => { setShowHistory(true); }}
              className="flex-1 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 transition-all"
            >
              <History className="w-3.5 h-3.5" /> View History
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── HISTORY LOG ─── */}
      <div>
        <button
          onClick={() => setShowHistory(v => !v)}
          className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-slate-300 transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          Broadcast History
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHistory && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mt-3"
            >
              {historyLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-800/40 rounded-xl animate-pulse" />)}
                </div>
              ) : !history?.items?.length ? (
                <p className="text-xs text-slate-600 font-medium py-4 text-center">No broadcasts sent yet</p>
              ) : (
                <div className="space-y-2">
                  {history.items.map((b: any) => (
                    <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                      <div className="p-2 rounded-lg bg-violet-500/10 shrink-0">
                        <Megaphone className="w-3 h-3 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0 text-start">
                        <p className="text-xs font-semibold text-white truncate">{b.subject || "Broadcast"}</p>
                        <p className="text-[10px] text-slate-500 truncate">{b.message}</p>
                      </div>
                      <div className="text-end shrink-0 space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">{b.channel} · {b.recipientCount} users</p>
                        <p className="text-[9px] text-slate-700 font-mono">{format(new Date(b.createdAt), "dd MMM HH:mm")}</p>
                        {b.emailCompleted && <span className="inline-block px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold rounded uppercase">Delivered</span>}
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {history.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        disabled={historyPage <= 1}
                        onClick={() => setHistoryPage(p => p - 1)}
                        className="h-7 px-3 rounded-lg border border-white/10 text-[10px] text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                      >← Prev</button>
                      <span className="text-[10px] text-slate-500">{historyPage} / {history.totalPages}</span>
                      <button
                        disabled={historyPage >= history.totalPages}
                        onClick={() => setHistoryPage(p => p + 1)}
                        className="h-7 px-3 rounded-lg border border-white/10 text-[10px] text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                      >Next →</button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UsersPage;
