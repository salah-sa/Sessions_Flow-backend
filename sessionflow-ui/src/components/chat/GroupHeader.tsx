import React, { useMemo } from "react";
import { Users, Volume2, VolumeX, ChevronDown, Shield, Pencil } from "lucide-react";
import { cn } from "../../lib/utils";
import { Group, User } from "../../types";
import { usePresenceStore } from "../../store/presenceStore";
import { useAuthStore } from "../../store/stores";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

// ═══════════════════════════════════════════════════════════
// Group Header — Social Live Status Panel
// ═══════════════════════════════════════════════════════════
// Displays: group name, description, member count,
// online/offline counters, avatar stack with live dots,
// and mute/members toggle.
// ═══════════════════════════════════════════════════════════

interface GroupHeaderProps {
  group: Group;
  onToggleMembers: () => void;
  onToggleMute: () => void;
  onEditDescription?: () => void;
  isMuted: boolean;
  membersOpen: boolean;
}

// ── Presence Dot ───────────────────────────────────────
const PresenceDot: React.FC<{ userId: string; size?: "sm" | "md" }> = ({ userId, size = "sm" }) => {
  const status = usePresenceStore((s) => s.getPresence(userId).status);
  const dotSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
  
  let bgColor = "bg-slate-600"; // offline
  let shadow = "";
  
  if (status === "online") {
    bgColor = "bg-emerald-500";
    shadow = "shadow-[0_0_6px_rgba(16,185,129,0.6)]";
  } else if (status === "away") {
    bgColor = "bg-amber-500";
    shadow = "shadow-[0_0_6px_rgba(245,158,11,0.4)]";
  } else if (status === "unknown") {
    bgColor = "bg-amber-500/60";
  }
  
  return (
    <div
      className={cn(
        dotSize,
        "rounded-full border-2 border-slate-950 transition-colors duration-500",
        bgColor,
        shadow
      )}
    />
  );
};

// ── Member Avatar with Live Dot ─────────────────────────
const MemberAvatar: React.FC<{
  name: string;
  userId: string;
  avatarUrl?: string | null;
  isEngineer?: boolean;
}> = ({ name, userId, avatarUrl, isEngineer }) => {
  const initial = name?.charAt(0).toUpperCase() || "?";
  
  return (
    <div className="relative group/avatar" title={name}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase overflow-hidden transition-transform duration-300 hover:scale-110 hover:z-10",
          isEngineer
            ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white ring-2 ring-blue-500/30"
            : "bg-slate-800 text-slate-400 ring-1 ring-white/10"
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      {/* Live presence dot */}
      <div className="absolute -bottom-0.5 -right-0.5">
        <PresenceDot userId={userId} size="sm" />
      </div>
    </div>
  );
};

const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  onToggleMembers,
  onToggleMute,
  onEditDescription,
  isMuted,
  membersOpen,
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isOnline = usePresenceStore((s) => s.isOnline);
  const isArchived = group.status === "Completed" || group.status === "Archived";
  const canEdit = user?.role === "Admin" || user?.role === "Engineer";

  // Derive member list
  const members = useMemo(() => {
    const result: Array<{ id: string; userId: string; name: string; avatarUrl?: string | null; isEngineer: boolean }> = [];

    // Engineer first
    if (group.engineer) {
      result.push({
        id: group.engineerId,
        userId: group.engineer.id || group.engineerId,
        name: group.engineerName || group.engineer.name || "Engineer",
        avatarUrl: group.engineer.avatarUrl,
        isEngineer: true,
      });
    } else if (group.engineerId) {
      result.push({
        id: group.engineerId,
        userId: group.engineerId,
        name: group.engineerName || "Engineer",
        isEngineer: true,
      });
    }

    // Students
    if (group.students) {
      for (const student of group.students) {
        result.push({
          id: student.id,
          userId: student.userId || student.id,
          name: student.name,
          isEngineer: false,
        });
      }
    }

    return result;
  }, [group]);

  const serverOnline = usePresenceStore((s) => s.serverOnline);
  const clientOnline = usePresenceStore((s) => s.clientOnline);
  const isOnlineFunc = usePresenceStore((s) => s.isOnline);

  const totalMembers = members.length;
  const onlineCount = useMemo(
    () => members.filter((m) => isOnlineFunc(m.userId)).length,
    [members, isOnlineFunc, serverOnline, clientOnline]
  );
  const offlineCount = totalMembers - onlineCount;

  // Avatar stack: show max 5 + overflow
  const visibleAvatars = members.slice(0, 5);
  const overflow = totalMembers - visibleAvatars.length;

  // Color tag mapping
  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-cyan-500",
    red: "from-red-500 to-rose-500",
    green: "from-emerald-500 to-green-500",
    purple: "from-violet-500 to-purple-500",
    orange: "from-orange-500 to-amber-500",
    pink: "from-pink-500 to-rose-400",
    yellow: "from-yellow-500 to-amber-400",
    indigo: "from-indigo-500 to-blue-500",
  };
  const gradient = colorMap[group.colorTag] || colorMap.blue;

  return (
    <div className="relative px-6 py-4 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5 flex-none">
      {/* Gradient accent line */}
      <div className={cn("absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r opacity-60", gradient)} />

      <div className="flex items-center justify-between gap-4">
        {/* Left: Group Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Group Icon */}
          <div
            className={cn(
              "w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-sm shadow-lg",
              gradient
            )}
          >
            L{group.level}
          </div>

          <div className="min-w-0 flex-1">
            {/* Group Name + Archive Badge */}
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-sora font-black text-white uppercase tracking-wider truncate leading-none">
                {group.name}
              </h2>
              {isArchived && (
                <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                  {t("common.archived", "Archived")}
                </span>
              )}
            </div>

            {/* Member Status Line */}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {totalMembers} {t("chat.members", "members")}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {onlineCount} {t("chat.online", "online")}
              </span>
              {offlineCount > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    {offlineCount} {t("chat.offline", "offline")}
                  </span>
                </>
              )}
            </div>

            {/* Description preview */}
            {group.description && (
              <p className="text-[10px] text-slate-500 mt-1 truncate max-w-md leading-tight">
                {group.description}
                {canEdit && onEditDescription && (
                  <button
                    onClick={onEditDescription}
                    className="inline-flex items-center ml-2 text-slate-600 hover:text-emerald-400 transition-colors"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Center: Avatar Stack */}
        <div className="hidden md:flex items-center">
          <div className="flex -space-x-2">
            {visibleAvatars.map((member) => (
              <MemberAvatar
                key={member.id}
                name={member.name}
                userId={member.userId}
                avatarUrl={member.avatarUrl}
                isEngineer={member.isEngineer}
              />
            ))}
            {overflow > 0 && (
              <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-[9px] font-black text-slate-400">
                +{overflow}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mute Toggle */}
          <button
            onClick={onToggleMute}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300 group/btn",
              isMuted
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
            )}
            title={isMuted ? t("chat.unmute", "Unmute") : t("chat.mute", "Mute")}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
            ) : (
              <Volume2 className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
            )}
          </button>

          {/* Members Panel Toggle */}
          <button
            onClick={onToggleMembers}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 group/btn",
              membersOpen
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
            )}
            title={t("chat.toggle_members", "Toggle Members")}
          >
            <Users className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
            {totalMembers > 0 && (
              <span className="text-[10px] font-black">{totalMembers}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupHeader;
