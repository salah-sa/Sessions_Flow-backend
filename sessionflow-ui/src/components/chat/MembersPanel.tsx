import React, { useMemo } from "react";
import { X, User as UserIcon, Phone, Activity, Users, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
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
}

const StatusLabel: React.FC<{ status: PresenceStatus }> = ({ status }) => {
  const isOnline = status === "online";
  const isAway = status === "away";
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-1.5 h-1.5 rounded-full",
        isOnline ? "bg-emerald-400" : isAway ? "bg-amber-400" : "bg-slate-600"
      )} />
      <span className={cn(
        "text-[9px] font-bold uppercase tracking-widest",
        isOnline ? "text-emerald-400" : isAway ? "text-amber-400" : "text-slate-500"
      )}>
        {isOnline ? "Active" : isAway ? "Away" : "Offline"}
      </span>
    </div>
  );
};

const MemberRow: React.FC<{ member: MemberEntry }> = ({ member }) => {
  const status = usePresenceStore((s) => s.getPresence(member.userId).status);
  const user = useAuthStore((s) => s.user);
  const isMe = member.userId === user?.id;
  const { invoke } = useSignalR();

  const handleCall = () => {
    if (isMe) return;
    useCallStore.getState().startCall(member.userId, member.name, member.avatarUrl || undefined);
    invoke("CallUser", member.userId).catch(() => {
      toast.error("Failed to initiate call");
    });
  };

  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group/member border border-transparent hover:bg-white/[0.03] hover:border-white/5",
        isMe && "bg-white/[0.01]"
      )}
    >
      <div className="relative shrink-0">
        <div className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold overflow-hidden border",
          member.role === "Engineer" ? "bg-[var(--chat-accent-warm)]/10 border-[var(--chat-accent-warm)]/20 text-white" : "bg-white/5 border-white/10 text-slate-400"
        )}>
          {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" /> : member.name?.charAt(0)}
        </div>
        <div className="absolute -bottom-1 -end-1">
          <div className={cn(
            "w-3.5 h-3.5 rounded-full border-2 border-[#12141a] transition-all duration-500 relative",
            status === "online" ? "bg-emerald-400" : status === "away" ? "bg-amber-400" : "bg-slate-700"
          )} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-white font-display truncate">
            {member.name}
          </span>
          {isMe && <span className="text-[10px] text-slate-500 font-medium lowercase">(you)</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn(
            "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
            member.role === "Engineer" ? "bg-[var(--chat-accent-warm)]/10 text-[var(--chat-accent-warm)] border-[var(--chat-accent-warm)]/20" : "bg-white/5 text-slate-500 border-white/5"
          )}>
            {member.role}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {!isMe && (
          <button 
            onClick={handleCall} 
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover/member:opacity-100",
              status === "online" 
                ? "bg-[var(--chat-accent-warm)]/10 text-[var(--chat-accent-warm)] hover:bg-[var(--chat-accent-warm)] hover:text-white" 
                : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white"
            )}
            title="Start Audio Call"
          >
            <Phone className={cn("w-4 h-4", status === "online" && "animate-pulse")} />
          </button>
        )}
        <StatusLabel status={status} />
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
          avatarUrl: undefined
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] md:hidden"
          />

          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "h-full border-s border-white/5 bg-[#0c0e12]/95 backdrop-blur-3xl overflow-hidden flex flex-col shrink-0 transition-all shadow-2xl",
              "fixed inset-y-0 end-0 z-[60] w-full sm:w-[360px] md:relative md:z-auto"
            )}
          >
            <div className="px-6 py-6 border-b border-white/5 flex items-center justify-between flex-none">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3 font-display">
                  <Users className="w-4 h-4 text-[var(--chat-accent-warm)]" />
                  {t("chat.members")}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                   Connected to session
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-6 py-3 bg-white/[0.01] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Presence Overview</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/5 border border-emerald-400/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 tabular-nums">{onlineCount} / {members.length}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
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

