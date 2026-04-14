import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationPopupStore } from "../../store/notificationStore";
import { MessageSquare, X } from "lucide-react";
import { useChatStore } from "../../store/stores";
import { useNavigate } from "react-router-dom";
import AnimatedChatIcon from "../ui/AnimatedChatIcon";
import { cn } from "../../lib/utils";

// ═══════════════════════════════════════════════════════════════
// Notification Popup — Stacking real-time message alerts
// Supports up to 3 simultaneous notifications with glassmorphism
// ═══════════════════════════════════════════════════════════════

const NotificationPopup: React.FC = () => {
  const { notifications, dismiss } = useNotificationPopupStore();
  const setActiveGroup = useChatStore(s => s.setActiveGroup);
  const navigate = useNavigate();

  const handleClick = (groupId: string, id: string) => {
    setActiveGroup(groupId);
    navigate("/chat");
    dismiss(id);
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 pointer-events-none flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{
              opacity: 1 - (index * 0.15),
              y: 0,
              scale: 1 - (index * 0.03),
            }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="pointer-events-auto"
          >
            <div 
              className="bg-slate-900/85 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] cursor-pointer group relative overflow-hidden"
              onClick={() => handleClick(notification.groupId, notification.id)}
            >
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              {/* Auto-dismiss progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                <motion.div
                  className="h-full bg-brand-500/40"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); dismiss(notification.id); }}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 rounded-2xl bg-brand-500/20 text-brand-500 flex items-center justify-center border border-brand-500/30 overflow-hidden">
                  {notification.avatarUrl ? (
                    <img src={notification.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <AnimatedChatIcon size={20} state="ping" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-[12px] font-bold text-white uppercase tracking-widest truncate">
                    {notification.senderName}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {notification.text}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationPopup;
