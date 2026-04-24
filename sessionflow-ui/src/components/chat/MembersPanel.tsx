import React, { useMemo } from "react";
import { X, Shield, User as UserIcon, Crown, Wifi, WifiOff, Phone, Activity, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Group } from "../../types";
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
}

const StatusDot: React.FC<{ status: PresenceStatus; confidence: number }> = ({ status, confidence }) => {
  let bg = "bg-[var(--ui-surface)]";
  let shadow = "";
  let label = "Offline";
  let pulse = false;

  switch (status) {
    case "online":
      bg = "bg-[var(--ui-accent)]";
      shadow = "shadow-[0_0_8px_rgba(var(--ui-accent-rgb),0.5)]";
      label = "Active";
      break;
    case "away":
      bg = "bg-[#7c3aed]";
      shadow = "shadow-[0_0_6px_rgba(124,58,237,0.4)]";
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
        {pulse && <div className={cn("absolute inset-0 rounded-full animate-ping", bg, "opacity-40")} />}
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
    if (status !== "online" || isMe) return;
    useCallStore.getState().startCall(member.userId, member.name, member.avatarUrl || undefined);
    invoke("CallUser", member.userId).catch(console.error);
  };

  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group/member border",
        status === "online"
          ? "bg-[var(--ui-accent)]/5 border-[var(--ui-accent)]/10"
          : "bg-transparent border-transparent hover:bg-white/[0.02]"
      )}
    >
      <div className="relative shrink-0">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold uppercase overflow-hidden border",
          member.role === "Engineer" ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/40 text-white shadow-glow shadow-[var(--ui-accent)]/10" : "bg-[var(--ui-sidebar-bg)] border-white/10 text-slate-500"
        )}>
          {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" /> : member.name?.charAt(0)}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <div className={cn("w-3 h-3 rounded-full border border-[var(--ui-bg)]", status === "online" ? "bg-[var(--ui-accent)]" : "bg-[var(--ui-surface)]")} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-white uppercase tracking-widest truncate">
            {member.name} {isMe && <span className="text-[var(--ui-accent)] lowercase opacity-50 ml-1">(node)</span>}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "text-[8px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-md border",
            member.role === "Engineer" ? "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border-[var(--ui-accent)]/20" : "bg-white/[0.02] text-slate-600 border-white/5"
          )}>
            {member.role}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status === "online" && !isMe && (
          <button onClick={handleCall} className="w-9 h-9 rounded-lg bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] hover:bg-[var(--ui-accent)] hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/member:opacity-100 touch-show"><Phone className="w-3.5 h-3.5" /></button>
        )}
        <StatusDot status={status} confidence={confidence} />
      </div>
    </motion.div>
  );
};

const MembersPanel: React.FC<MembersPanelProps> = ({ group, isOpen, onClose }) => {
  const { t } = useTranslation();
  const isOnline = usePresenceStore((s) => s.isOnline);

  const members = useMemo(() => {
    const result: MemberEntry[] = [];
    if (group.engineerId) result.push({ id: group.engineerId, userId: group.engineerId, name: group.engineerName || "Engineer", role: "Engineer", avatarUrl: group.engineer?.avatarUrl });
    
    if (group.students) {
      // Deduplicate by name to prevent legcay duplicate records from cluttering the UI
      const uniqueStudentsMap = new Map<string, any>();
      group.students.forEach(s => {
        const key = s.name.toLowerCase().trim();
        const existing = uniqueStudentsMap.get(key);
        // Prioritize records with a userId (linked to an account)
        if (!existing || (!existing.userId && s.userId)) {
          uniqueStudentsMap.set(key, s);
        }
      });

      Array.from(uniqueStudentsMap.values()).forEach(s => {
        result.push({ id: s.id, userId: s.userId || s.id, name: s.name, role: "Student" });
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
              "h-full border-s border-white/5 bg-[var(--ui-sidebar-bg)]/95 backdrop-blur-3xl overflow-hidden flex flex-col shrink-0",
              "fixed inset-y-0 right-0 z-[60] w-full sm:w-[340px] md:relative md:w-[340px] md:z-auto"
            )}
          >
          <div className="absolute top-0 right-0 w-full h-[300px] bg-[var(--ui-accent)]/5 blur-[100px] pointer-events-none" />

          <div className="px-4 py-5 sm:px-6 md:px-8 md:py-8 border-b border-white/5 flex items-center justify-between flex-none relative z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3">
                <Users className="w-4 h-4 text-[var(--ui-accent)]" />
                {t("chat.members")}
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">
                 Network Presence Active
              </p>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
          </div>

          <div className="px-4 py-3 sm:px-6 md:px-8 border-b border-white/[0.02] bg-white/[0.01] flex items-center gap-3 relative z-10">
            <Activity className="w-3.5 h-3.5 text-[var(--ui-accent)]/60" />
            <span className="text-[8px] font-bold text-[var(--ui-accent)]/60 uppercase tracking-widest">Neural Stream Matrix Established</span>
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

