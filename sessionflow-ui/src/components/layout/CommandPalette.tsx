import React, { useState, useEffect } from "react";
import { 
  Search, 
  Command, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings,
  X,
  Navigation
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        isOpen ? onClose() : undefined; // This is handled by TopBar now
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const actions = [
    { icon: Navigation, label: "View Dashboard", shortcut: "G D", path: "/" },
    { icon: Users, label: "Manage Groups", shortcut: "G G", path: "/groups" },
    { icon: Calendar, label: "Timetable Ops", shortcut: "G T", path: "/timetable" },
    { icon: MessageSquare, label: "Neural Chat", shortcut: "G C", path: "/chat" },
    { icon: Settings, label: "System Config", shortcut: "G S", path: "/admin" },
  ];

  const filteredActions = actions.filter(a => 
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-xl bg-[#161922] border border-white/5 rounded-2xl shadow-2xl overflow-hidden relative z-10"
        >
          <div className="p-4 border-b border-white/5 flex items-center gap-4">
            <Search className="w-5 h-5 text-slate-500" />
            <input 
              autoFocus
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none text-white focus:outline-none text-sm font-medium"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              ESC
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredActions.length > 0 ? (
              <div className="space-y-1">
                {filteredActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => { navigate(action.path); onClose(); }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[var(--ui-accent)]/10 transition-colors">
                        <action.icon className="w-4 h-4 text-slate-400 group-hover:text-[var(--ui-accent)] transition-colors" />
                      </div>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{action.label}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{action.shortcut}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center space-y-2">
                <Command className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-sm text-slate-500">No operations found matching "{query}"</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-black/20 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <div className="flex gap-4">
              <span>↑↓ Navigate</span>
              <span>⏎ Select</span>
            </div>
            <span>System Index v1.0.4</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CommandPalette;
