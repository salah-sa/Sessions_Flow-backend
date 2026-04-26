import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationPopupStore } from "../../store/notificationStore";
import { X, MessageCircle } from "lucide-react";
import { useChatStore } from "../../store/stores";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

const NotificationPopup: React.FC = () => {
  const notifications = useNotificationPopupStore((s) => s.notifications);
  const dismiss = useNotificationPopupStore((s) => s.dismiss);
  const setActiveGroup = useChatStore(s => s.setActiveGroup);
  const navigate = useNavigate();

  const handleClick = (groupId: string, id: string) => {
    setActiveGroup(groupId);
    navigate("/chat");
    dismiss(id);
  };

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-6 pointer-events-none flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{
              opacity: 1 - (index * 0.1),
              y: index * 4,
              scale: 1 - (index * 0.02),
            }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="pointer-events-auto"
          >
            <div 
              className="bg-[#0c0e12]/90 backdrop-blur-2xl border border-white/10 p-5 rounded-[2rem] shadow-2xl cursor-pointer group relative overflow-hidden"
              onClick={() => handleClick(notification.groupId, notification.id)}
            >
              {/* Background gradient flare */}
              <div className="absolute top-0 left-0 w-24 h-24 bg-[var(--chat-accent-warm)]/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              
              {/* Auto-dismiss timer progress */}
              <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--chat-accent-warm)] to-[var(--chat-accent-rose)]"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); dismiss(notification.id); }}
                className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-[var(--chat-accent-warm)] to-[var(--chat-accent-rose)] flex items-center justify-center text-white shadow-lg shadow-[var(--chat-accent-warm)]/20 overflow-hidden">
                  {notification.avatarUrl ? (
                    <img src={notification.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MessageCircle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-white font-display truncate">
                      {notification.senderName}
                    </p>
                    <span className="text-[9px] font-bold text-[var(--chat-accent-warm)] uppercase tracking-widest bg-[var(--chat-accent-warm)]/10 px-1.5 py-0.5 rounded-md">New</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1 leading-tight">
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
