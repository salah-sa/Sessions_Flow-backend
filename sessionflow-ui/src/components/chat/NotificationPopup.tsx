import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationPopupStore } from "../../store/notificationStore";
import { MessageSquare, X } from "lucide-react";
import { useChatStore } from "../../store/stores";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

const NotificationPopup: React.FC = () => {
  const { notification, clear } = useNotificationPopupStore();
  const setActiveGroup = useChatStore(s => s.setActiveGroup);
  const navigate = useNavigate();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clear();
      }, 5000); // 5-second auto-dismiss
      return () => clearTimeout(timer);
    }
  }, [notification, clear]);

  const handleClick = () => {
    if (notification) {
      setActiveGroup(notification.groupId);
      navigate("/chat");
      clear();
    }
  };

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 pointer-events-none"
        >
          <div 
            className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] cursor-pointer pointer-events-auto group relative overflow-hidden"
            onClick={handleClick}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <button 
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-brand-500/20 text-brand-500 flex items-center justify-center border border-brand-500/30 overflow-hidden">
                {notification.avatarUrl ? (
                  <img src={notification.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <MessageSquare className="w-5 h-5" />
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
      )}
    </AnimatePresence>
  );
};

export default NotificationPopup;
