import React, { useMemo } from "react";
import { X, Shield, User as UserIcon, Crown, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Group } from "../../types";
import { usePresenceStore, PresenceStatus } from "../../store/presenceStore";
import { useAuthStore } from "../../store/stores";
import { useTranslation } from "react-i18next";

// ═══════════════════════════════════════════════════════════
// Members Panel — Slide-in Real-Time Presence List
// ═══════════════════════════════════════════════════════════

interface MembersPanelProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
}

interface MemberEntry {
  id: string;
  userId: string;
  name: string;
  role: "Engineer" | "Student" | "Admin";
  avatarUrl?: string | null;
}

const StatusDot: React.FC<{ status: PresenceStatus; confidence: number }> = ({ status, confidence }) => {
  let bg = "bg-slate-600";
  let shadow = "";
  let label = "Offline";
  let pulse = false;

  switch (status) {
    case "online":
      bg = "bg-emerald-500";
      shadow = "shadow-[0_0_8px_rgba(16,185,129,0.5)]";
      label = "Online";
      break;
    case "away":
      bg = "bg-amber-500";
      shadow = "shadow-[0_0_6px_rgba(245,158,11,0.4)]";
      label = "Away";
      break;
    case "unknown":
      bg = "bg-amber-500/60";
      label = "Connecting...";
      pulse = true;
      break;
    case "offline":
      bg = "bg-slate-600";
      label = "Offline";
      break;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-colors duration-500",
            bg,
            shadow
          )}
        />
        {pulse && (
          <div className={cn("absolute inset-0 rounded-full animate-ping", bg, "opacity-40")} />
        )}
      </div>
      <span
        className={cn(
          "text-[9px] font-bold uppercase tracking-widest",
          status === "online"
            ? "text-emerald-400"
            : status === "away" || status === "unknown"
            ? "text-amber-400"
            : "text-slate-600"
        )}
      >
        {label}
      </span>
    </div>
  );
};

const MemberRow: React.FC<{ member: MemberEntry }> = ({ member }) => {
  // Pull primitive properties individually to prevent Zustand from constantly failing deep equality checks
  // and triggering cascade re-renders with framer-motion's layout engine.
  const status = usePresenceStore((s) => s.getPresence(member.userId).status);
  const confidence = usePresenceStore((s) => s.getPresence(member.userId).confidence);
  const source = usePresenceStore((s) => s.getPresence(member.userId).source);
  const { user } = useAuthStore();
  const isMe = member.userId === user?.id;

  const initial = member.name?.charAt(0).toUpperCase() || "?";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300",
        status === "online"
          ? "bg-emerald-500/5 hover:bg-emerald-500/10"
          : "bg-transparent hover:bg-white/5"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-black uppercase overflow-hidden",
            member.role === "Engineer"
              ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
              : "bg-slate-800 text-slate-400 border border-white/10"
          )}
        >
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <div
            className={cn(
              "w-3 h-3 rounded-full border-2 border-slate-950 transition-colors duration-500",
              status === "online"
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                : status === "away" || status === "unknown"
                ? "bg-amber-500"
                : "bg-slate-600"
            )}
          />
        </div>
      </div>

      {/* Name + Role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black text-white uppercase tracking-wider truncate">
            {member.name} {isMe && <span className="text-brand-500 lowercase ml-1">(me)</span>}
          </span>
          {member.role === "Engineer" && (
            <Shield className="w-3 h-3 text-blue-400 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
            member.role === "Admin" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
            member.role === "Engineer" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
            "bg-slate-900 text-slate-500 border border-white/5"
          )}>
            {member.role === "Admin" ? "Administrator" : member.role}
          </span>
          {source !== "server" && (
            <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest bg-slate-900 px-1.5 py-0.5 rounded">
              {source === "hybrid" ? "partial" : "local"}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <StatusDot status={status} confidence={confidence} />
    </motion.div>
  );
};

const MembersPanel: React.FC<MembersPanelProps> = ({ group, isOpen, onClose }) => {
  const { t } = useTranslation();
  const isOnline = usePresenceStore((s) => s.isOnline);

  // Derive member list
  const members: MemberEntry[] = useMemo(() => {
    const result: MemberEntry[] = [];

    // Engineer first
    if (group.engineer) {
      result.push({
        id: group.engineerId,
        userId: group.engineer.id || group.engineerId,
        name: group.engineerName || group.engineer.name || "Engineer",
        role: "Engineer",
        avatarUrl: group.engineer.avatarUrl,
      });
    } else if (group.engineerId) {
      result.push({
        id: group.engineerId,
        userId: group.engineerId,
        name: group.engineerName || "Engineer",
        role: "Engineer",
      });
    }

    // Students
    if (group.students) {
      for (const student of group.students) {
        result.push({
          id: student.id,
          userId: student.userId || student.id,
          name: student.name,
          role: "Student",
        });
      }
    }
    
    // Polyfill Current User if not present (backend might filter out self)
    const { user } = useAuthStore.getState();
    if (user && !result.some(m => m.userId === user.id)) {
      result.push({
        id: user.studentId || user.id,
        userId: user.id,
        name: user.name,
        role: user.role === "Admin" ? "Admin" : (user.role === "Engineer" ? "Engineer" : "Student"),
        avatarUrl: user.avatarUrl
      });
    }

    return result;
  }, [group]);

  // Sort: online first, then alphabetical
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aOnline = isOnline(a.userId) ? 0 : 1;
      const bOnline = isOnline(b.userId) ? 0 : 1;
      if (aOnline !== bOnline) return aOnline - bOnline;
      // Engineer always first within same status
      if (a.role === "Engineer" && b.role !== "Engineer") return -1;
      if (b.role === "Engineer" && a.role !== "Engineer") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [members, isOnline]);

  const onlineCount = members.filter((m) => isOnline(m.userId)).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="h-full border-s border-white/5 bg-slate-950/60 backdrop-blur-2xl overflow-hidden flex flex-col shrink-0"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-none">
            <div>
              <h3 className="text-[12px] font-sora font-black text-white uppercase tracking-widest flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-500" />
                {t("chat.members", "Members")}
              </h3>
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">
                {onlineCount} {t("chat.online", "online")} · {members.length - onlineCount} {t("chat.offline", "offline")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Presence Source Indicator */}
          <div className="px-5 py-2 border-b border-white/[0.03] bg-white/[0.02] flex items-center gap-2">
            <Wifi className="w-3 h-3 text-slate-700" />
            <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">
              {t("chat.presence_note", "Presence updates in real-time")}
            </span>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {sortedMembers.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </AnimatePresence>

            {sortedMembers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserIcon className="w-8 h-8 text-slate-700 mb-3" />
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  {t("chat.no_members", "No members in this group")}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MembersPanel;
