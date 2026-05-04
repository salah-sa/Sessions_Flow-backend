import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Command,
  Users,
  Calendar,
  MessageSquare,
  Settings,
  X,
  Navigation,
  GraduationCap,
  Folder,
  Play,
  User as UserIcon,
  Clock,
  ArrowRight,
  Loader2,
  Zap,
  LayoutDashboard,
  Wallet,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { globalSearch, SearchResult } from "../../api/newFeatures";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_KEY = "sf_cmd_recent";
const MAX_RECENT = 5;

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Groups: Folder,
  Students: GraduationCap,
  Sessions: Play,
  Users: UserIcon,
  Pages: Navigation,
  Actions: Zap,
};

const CATEGORY_COLORS: Record<string, string> = {
  Groups: "text-blue-400 bg-blue-500/10",
  Students: "text-emerald-400 bg-emerald-500/10",
  Sessions: "text-amber-400 bg-amber-500/10",
  Users: "text-purple-400 bg-purple-500/10",
  Pages: "text-slate-400 bg-white/5",
  Actions: "text-[var(--ui-accent)] bg-[var(--ui-accent)]/10",
};

// Quick-nav pages + actions (static)
const STATIC_ITEMS: SearchResult[] = [
  { category: "Pages", id: "p-dash", label: "Dashboard", sublabel: "Overview & Metrics", route: "/" },
  { category: "Pages", id: "p-groups", label: "Groups", sublabel: "All Groups", route: "/groups" },
  { category: "Pages", id: "p-timetable", label: "Timetable", sublabel: "Schedule Management", route: "/timetable" },
  { category: "Pages", id: "p-chat", label: "Neural Chat", sublabel: "Messaging Hub", route: "/chat" },
  { category: "Pages", id: "p-attendance", label: "Attendance", sublabel: "Tracking & History", route: "/attendance" },
  { category: "Pages", id: "p-wallet", label: "Wallet", sublabel: "Balance & Transactions", route: "/wallet" },
  { category: "Pages", id: "p-settings", label: "Settings", sublabel: "Configuration", route: "/settings" },
  { category: "Actions", id: "a-create-group", label: "Create New Group", sublabel: "Quick Action", route: "/groups?create=1" },
];

function loadRecent(): SearchResult[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
}

function saveRecent(item: SearchResult) {
  const prev = loadRecent().filter(r => r.id !== item.id);
  const next = [item, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentItems, setRecentItems] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setSearchResults([]);
      setRecentItems(loadRecent());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await globalSearch(query.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Build combined items
  const staticFiltered = STATIC_ITEMS.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.sublabel.toLowerCase().includes(query.toLowerCase())
  );

  const allItems: SearchResult[] = query.trim().length >= 2
    ? [...searchResults, ...staticFiltered]
    : recentItems.length > 0
      ? recentItems
      : STATIC_ITEMS;

  // Group by category
  const grouped = allItems.reduce<Record<string, SearchResult[]>>((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // Flatten for keyboard nav
  const flatItems = Object.values(grouped).flat();

  const handleSelect = useCallback((item: SearchResult) => {
    saveRecent(item);
    navigate(item.route);
    onClose();
  }, [navigate, onClose]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (!isOpen) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(p => Math.min(p + 1, flatItems.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(p => Math.max(p - 1, 0)); }
      if (e.key === "Enter" && flatItems[activeIndex]) { e.preventDefault(); handleSelect(flatItems[activeIndex]); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, activeIndex, flatItems, handleSelect]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector(`[data-idx="${activeIndex}"]`);
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  let flatIdx = 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="w-full max-w-[600px] bg-[#0e1017]/95 backdrop-blur-3xl border border-white/[0.06] rounded-3xl shadow-[0_25px_100px_rgba(0,0,0,0.8)] overflow-hidden relative z-10"
        >
          {/* Search Input */}
          <div className="p-5 border-b border-white/5 flex items-center gap-4">
            <div className="relative">
              {isSearching ? (
                <Loader2 className="w-5 h-5 text-[var(--ui-accent)] animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <input
              ref={inputRef}
              autoFocus
              placeholder="Search students, groups, sessions, or navigate..."
              className="flex-1 bg-transparent border-none text-white focus:outline-none text-[15px] font-medium placeholder:text-slate-600"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            />
            <div className="flex items-center gap-2">
              {query && (
                <button onClick={() => setQuery("")} className="p-1 rounded-lg text-slate-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">
                ESC
              </div>
            </div>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
            {/* Section header if showing recent */}
            {query.trim().length < 2 && recentItems.length > 0 && (
              <div className="px-4 pt-3 pb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Recent
              </div>
            )}

            {Object.entries(grouped).length > 0 ? (
              Object.entries(grouped).map(([category, items]) => {
                const Icon = CATEGORY_ICONS[category] || Command;
                const colorClass = CATEGORY_COLORS[category] || "text-slate-400 bg-white/5";

                return (
                  <div key={category} className="mb-1">
                    {query.trim().length >= 2 && (
                      <div className="px-4 pt-3 pb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-2">
                        <div className={cn("w-4 h-4 rounded flex items-center justify-center", colorClass)}>
                          <Icon className="w-2.5 h-2.5" />
                        </div>
                        {category}
                        <span className="text-slate-700 ms-auto">{items.length}</span>
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const idx = flatIdx++;
                        const isActive = idx === activeIndex;
                        const CatIcon = CATEGORY_ICONS[item.category] || Command;
                        const catColor = CATEGORY_COLORS[item.category] || "text-slate-400 bg-white/5";

                        return (
                          <button
                            key={item.id}
                            data-idx={idx}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-150 group/item text-left",
                              isActive
                                ? "bg-[var(--ui-accent)]/[0.08] border border-[var(--ui-accent)]/20"
                                : "border border-transparent hover:bg-white/[0.03]"
                            )}
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
                              isActive ? "bg-[var(--ui-accent)]/15 text-[var(--ui-accent)]" : catColor
                            )}>
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "text-[13px] font-semibold truncate transition-colors",
                                isActive ? "text-white" : "text-slate-300"
                              )}>
                                {item.label}
                              </div>
                              <div className="text-[10px] font-medium text-slate-600 truncate mt-0.5">
                                {item.sublabel}
                              </div>
                            </div>
                            <ArrowRight className={cn(
                              "w-3.5 h-3.5 shrink-0 transition-all",
                              isActive ? "text-[var(--ui-accent)] opacity-100 translate-x-0" : "opacity-0 -translate-x-2 text-slate-600"
                            )} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto">
                  <Command className="w-7 h-7 text-slate-700" />
                </div>
                <p className="text-[13px] text-slate-500 font-medium">
                  {isSearching ? "Scanning databases..." : `No results for "${query}"`}
                </p>
                <p className="text-[10px] text-slate-700">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-black/30 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-black text-slate-700 uppercase tracking-[0.2em]">
            <div className="flex gap-5">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[8px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[8px]">⏎</kbd>
                Open
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[8px]">ESC</kbd>
                Close
              </span>
            </div>
            <span className="text-slate-800">⌘K</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CommandPalette;
