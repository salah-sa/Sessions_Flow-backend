import React, { useMemo } from "react";
import { X, Shield, User as UserIcon, Crown, Wifi, WifiOff, Phone, Activity, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getTierBorderClass, getStudentBorderStyle } from "../../lib/utils";
import { Group, Student } from "../../types";
import { toast } from "sonner";
import { usePresenceStore, PresenceStatus } from "../../store/presenceStore";
import { useAuthStore } from "../../store/stores";
import { useCallStore } from "../../store/callStore";
import { useSignalR } from "../../providers/SignalRProvider";
import { useTranslation } from "react-i18next";

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
  subscriptionTier?: string;
}

const StatusDot: React.FC<{ status: PresenceStatus; confidence: number }> = ({ status, confidence }) => {
  let bg = "bg-[var(--ui-surface)]";
  let shadow = "";
  let label = "Offline";
  let pulse = false;

  switch (status) {
    case "online":
      bg = "bg-[var(--ui-accent)]";
      shadow = "shadow-[0_0_12px_rgba(var(--ui-accent-rgb),0.6)]";
      label = "Active";
      pulse = confidence > 0.8;
      break;
    case "away":
      bg = "bg-[#7c3aed]";
      shadow = "shadow-[0_0_8px_rgba(124,58,237,0.4)]";
      label = "Standby";
      break;
    case "unknown":
      bg = "bg-[var(--ui-accent)]/40";
      label = "Syncing...";
      pulse = true;
      break;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={cn("w-2 h-2 rounded-full transition-all duration-500", bg, shadow)} />
        {pulse && (
          <motion.div
            animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className={cn("absolute inset-0 rounded-full", bg)}
          />
        )}
      </div>
      <span className={cn("text-[8px] font-bold uppercase tracking-[0.2em]", status === "online" ? "text-[var(--ui-accent)]" : "text-slate-600")}>
        {label}
      </span>
    </div>
  );
};

const MemberRow: React.FC<{ member: MemberEntry }> = ({ member }) => {
  const status = usePresenceStore((s) => s.getPresence(member.userId).status);
  const confidence = usePresenceStore((s) => s.getPresence(member.userId).confidence);
  const user = useAuthStore((s) => s.user);
  const isMe = member.userId === user?.id;
  const { invoke } = useSignalR();

  const handleCall = () => {
    if (isMe) return;
    useCallStore.getState().startCall(member.userId, member.name, member.avatarUrl || undefined);
    invoke("CallUser", member.userId).catch((err) => {
      console.error("SignalR CallUser failed:", err);
      toast.error("Failed to reach member node");
    });
  };

  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-3 xs:gap-4 px-3 xs:px-4 py-3.5 xs:py-4 rounded-xl transition-all duration-300 group/member border",
        status === "online"
          ? "bg-[var(--ui-accent)]/5 border-[var(--ui-accent)]/10"
          : "bg-transparent border-transparent hover:bg-white/[0.02]"
      )}
    >
      <div className="relative shrink-0">
        <div
          className={cn("rounded-full", (member.role === "Engineer" || member.role === "Admin" || ['ultra', 'pro', 'enterprise'].includes(member.subscriptionTier?.toLowerCase() || "")) ? getTierBorderClass(member.subscriptionTier, member.role) : "")}
          style={(member.role === "Student" && !['ultra', 'pro', 'enterprise'].includes(member.subscriptionTier?.toLowerCase() || "")) ? getStudentBorderStyle(member.id) : undefined}
        >
          <div className={cn(
            "w-9 h-9 xs:w-10 xs:h-10 rounded-full flex items-center justify-center text-[10px] xs:text-xs font-bold uppercase overflow-hidden relative z-10",
            member.role === "Engineer" ? "bg-[var(--ui-accent)]/10 text-white shadow-glow shadow-[var(--ui-accent)]/10" : "bg-[var(--ui-sidebar-bg)] text-slate-500"
          )}>
            {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" /> : member.name?.charAt(0)}
          </div>
        </div>
        <div className="absolute -bottom-0.5 -end-0.5">
          <div className={cn("w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full border border-[var(--ui-bg)] transition-all duration-500 relative", status === "online" ? "bg-[var(--ui-accent)] shadow-[0_0_8px_rgba(var(--ui-accent-rgb),0.6)]" : "bg-[var(--ui-surface)]")}>
            {status === "online" && (
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-[var(--ui-accent)]"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] xs:text-[11px] font-bold text-white uppercase tracking-widest truncate">
            {member.name} {isMe && <span className="text-[var(--ui-accent)] lowercase opacity-50 ms-1">(node)</span>}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "text-[7px] xs:text-[8px] font-bold uppercase tracking-[0.2em] px-1 xs:px-1.5 py-0.5 rounded-md border",
            member.role === "Engineer" ? "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border-[var(--ui-accent)]/20" : "bg-white/[0.02] text-slate-600 border-white/5"
          )}>
            {member.role}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 xs:gap-3 shrink-0">
        {!isMe && (
          <button 
            onClick={handleCall} 
            disabled={status === "unknown"}
            className={cn(
              "w-8 h-8 xs:w-9 xs:h-9 rounded-lg flex items-center justify-center transition-all opacity-100 md:opacity-0 md:group-hover/member:opacity-100 touch-show touch-target-min",
              status === "online" 
                ? "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] hover:bg-[var(--ui-accent)] hover:text-white" 
                : "bg-white/[0.05] text-slate-500 hover:bg-white/[0.1] hover:text-white"
            )}
            title={status === "online" ? "Initiate Direct Neural Link" : "Signal Node (User Offline)"}
          >
            <Phone className={cn("w-3.5 h-3.5", status === "online" && "animate-pulse")} />
          </button>
        )}
        <StatusDot status={status} confidence={confidence} />
      </div>
    </motion.div>
  );
};

const MembersPanel: React.FC<MembersPanelProps> = ({ group, isOpen, onClose }) => {
  const { t } = useTranslation();
  const isOnline = usePresenceStore((s) => s.isOnline);
  const currentUser = useAuthStore((s) => s.user);

  const members = useMemo(() => {
    const result: MemberEntry[] = [];
    if (group.engineerId) result.push({ id: group.engineerId, userId: group.engineerId, name: group.engineerName || "Engineer", role: "Engineer", avatarUrl: group.engineer?.avatarUrl, subscriptionTier: currentUser?.subscriptionTier });
    
    if (group.students) {
      // Deduplicate by ID to prevent masking students with identical names
      const uniqueStudentsMap = new Map<string, Student>();
      group.students.forEach(s => {
        uniqueStudentsMap.set(s.id, s);
      });

      Array.from(uniqueStudentsMap.values()).forEach(s => {
        result.push({ 
          id: s.id, 
          userId: s.userId || s.id, 
          name: s.name, 
          role: "Student",
          avatarUrl: undefined // Students don't currently have avatars in this mapping, but could be added
        });
      });
    }
    return result;
  }, [group]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aOnline = isOnline(a.userId) ? 0 : 1;
      const bOnline = isOnline(b.userId) ? 0 : 1;
      if (aOnline !== bOnline) return aOnline - bOnline;
      return a.name.localeCompare(b.name);
    });
  }, [members, isOnline]);

  const onlineCount = useMemo(() => members.filter(m => isOnline(m.userId)).length, [members, isOnline]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] md:hidden"
          />

          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "h-full border-s border-white/5 bg-[var(--ui-sidebar-bg)]/95 backdrop-blur-3xl overflow-hidden flex flex-col shrink-0 transition-all",
              "fixed inset-y-0 end-0 z-[60] w-full xs:w-[320px] sm:w-[340px] md:relative md:w-[280px] lg:w-[360px] md:z-auto"
            )}
          >
          <div className="absolute top-0 end-0 w-full h-[300px] bg-[var(--ui-accent)]/5 blur-[100px] pointer-events-none" />

          <div className="px-4 py-5 xs:px-5 sm:px-6 md:px-8 md:py-8 border-b border-white/5 flex items-center justify-between flex-none relative z-10">
            <div>
              <h3 className="text-xs xs:text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 xs:gap-3">
                <Users className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-[var(--ui-accent)]" />
                {t("chat.members")}
              </h3>
              <p className="text-[8px] xs:text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">
                 Network Presence Active
              </p>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 hover:text-white transition-all touch-target-min"><X className="w-4 h-4" /></button>
          </div>

          <div className="px-4 py-2 xs:px-5 sm:px-6 md:px-8 border-b border-white/[0.02] bg-white/[0.01] flex items-center justify-between gap-3 relative z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-[var(--ui-accent)]/60" />
              <span className="text-[7px] xs:text-[8px] font-bold text-[var(--ui-accent)]/60 uppercase tracking-widest">Neural Stream Matrix Established</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/10">
              <div className="w-1 h-1 rounded-full bg-[var(--ui-accent)] animate-pulse" />
              <span className="text-[7px] font-bold text-[var(--ui-accent)] tracking-widest">{onlineCount}/{members.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar relative z-10">
            <AnimatePresence mode="popLayout">
              {sortedMembers.map((m) => <MemberRow key={m.id} member={m} />)}
            </AnimatePresence>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MembersPanel;

