import React, { useState, useEffect, useRef, useCallback } from "react";
import { Users, Plus, Edit2, Trash2, GraduationCap, ChevronRight, Search, LayoutGrid, List, Loader2, X, AlertTriangle, Eye, Info, Settings, Calendar, PlayCircle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, Button, Input, Badge, Modal, Skeleton, ConfirmDialog } from "../components/ui";
import { useInfiniteGroups, useGroupMutations } from "../queries/useGroupQueries";
import { Group } from "../types";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";

const scheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be HH:mm"),
  durationMinutes: z.number().min(30).max(480),
});

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      slots.push({ value: `${hh}:${mm}`, label: `${h12}:${mm} ${ampm}` });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const groupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  level: z.number().min(1).max(4),
  colorTag: z.string().default("blue"),
  numberOfStudents: z.number().min(1).max(10),
  totalSessions: z.number().min(1).max(50).default(13),
  frequency: z.number().min(1).max(3).default(1),
  startingSessionNumber: z.number().min(1).max(20),
  schedules: z.array(scheduleSchema).min(1, "At least one schedule is required"),
  cadets: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    studentId: z.string().optional()
  })).optional(),
}).superRefine((data, ctx) => {
  // Level-based Student Capacity
  const maxStudents = data.level === 4 ? 2 : 4;
  if (data.numberOfStudents > maxStudents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Max students for Level ${data.level} is ${maxStudents}`,
      path: ["numberOfStudents"],
    });
  }

  // Level-based Starting Session Limit
  const limitForLevel = data.level === 2 ? 12 : 13;
  if (data.startingSessionNumber > limitForLevel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Starting number cannot exceed ${limitForLevel} sessions`,
      path: ["startingSessionNumber"],
    });
  }

  // Level-based Session Count
  if (data.totalSessions !== limitForLevel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Level ${data.level} must have exactly ${limitForLevel} sessions`,
      path: ["totalSessions"],
    });
  }

  // Frequency consistency
  if (data.schedules.length !== data.frequency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Must define exactly ${data.frequency} schedule slot(s) for ${data.frequency}x frequency`,
      path: ["schedules"],
    });
  }
});

type GroupFormValues = z.infer<typeof groupSchema>;

const GroupsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const groupFilters = React.useMemo(() => ({ 
    search: debouncedSearch || undefined,
    status: "Active",
    pageSize: 20
  }), [debouncedSearch]);

  const { 
    data, 
    isLoading: loading, 
    isFetchingNextPage: loadingMore, 
    hasNextPage: hasMore, 
    fetchNextPage: loadMore, 
    refetch 
  } = useInfiniteGroups(groupFilters);

  const groups = data?.pages.flatMap(page => page.items) || [];
  const { createMutation, updateMutation, deleteMutation, enrollStudentMutation } = useGroupMutations();
  const submitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || enrollStudentMutation.isPending;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);


  // Scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore && !loading) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loadingMore, loading]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [wizardStep, setWizardStep] = useState(1);

  const { register, handleSubmit, reset, control, setValue, watch, getValues, formState: { errors } } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { 
      level: 1, 
      colorTag: "blue", 
      numberOfStudents: 4, 
      frequency: 1,
      totalSessions: 13,
      startingSessionNumber: 1, 
      schedules: [{ dayOfWeek: 1, startTime: "17:00", durationMinutes: 60 }], 
      cadets: Array(4).fill({ name: "", studentId: "" }) 
    }
  });

  const currentColorTag = watch("colorTag");
  const currentLevel = watch("level");

  // ── Phase 11: Auto-fill logic based on Level ─────────────────────
  // STRICT RULES:
  // Level 1-4 sessions are fixed. User CANNOT override session count.
  const LEVEL_SESSION_MAP: Record<number, number> = { 1: 13, 2: 12, 3: 13, 4: 13 };
  const LEVEL_CAPACITY_MAP: Record<number, number> = { 1: 4, 2: 4, 3: 4, 4: 2 };

  useEffect(() => {
    const sessions = LEVEL_SESSION_MAP[currentLevel] ?? 13;
    const capacity = LEVEL_CAPACITY_MAP[currentLevel] ?? 4;
    
    // Use a single update cycle if possible by checking all values
    const currentSessions = getValues("totalSessions");
    const currentStudents = getValues("numberOfStudents");
    const currentStartOffset = getValues("startingSessionNumber");

    if (currentSessions !== sessions) {
      setValue("totalSessions", sessions);
    }
    
    // Automatically clamp current values if they exceed new level limits
    if (currentStudents > capacity) {
      setValue("numberOfStudents", capacity);
    }
    if (currentStartOffset > sessions) {
      setValue("startingSessionNumber", sessions);
    }

    // Force default capacity in create mode step 1
    if (modalMode === "create" && wizardStep === 1) {
      if (getValues("numberOfStudents") !== capacity) {
        setValue("numberOfStudents", capacity);
      }
    }
  }, [currentLevel, modalMode, wizardStep, setValue, getValues]);

  // ── Phase 11: Sync Cadets with Capacity ───────────────────────────
  // Keep cadets array in sync with numberOfStudents to avoid index errors
  const watchedStudentCount = watch("numberOfStudents");
  
  useEffect(() => {
    const count = watchedStudentCount || 4;
    if (count > 0 && count <= 10) {
      const currentCadets = getValues("cadets") || [];
      if (currentCadets.length !== count) {
        const newCadets = Array.from({ length: count }, (_, i) => ({
          name: currentCadets[i]?.name || "",
          studentId: currentCadets[i]?.studentId || ""
        }));
        setValue("cadets", newCadets, { shouldDirty: true });
      }
    }
  }, [watchedStudentCount, setValue, getValues]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "schedules"
  });

  const fetchGroups = useCallback(() => refetch(), [refetch]);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedGroup(null);
    setWizardStep(1);
    const capacity = LEVEL_CAPACITY_MAP[1];
    reset({ 
      name: "", 
      description: "", 
      level: 1, 
      colorTag: "blue", 
      numberOfStudents: capacity, 
      frequency: 1,
      totalSessions: 13,
      startingSessionNumber: 1, 
      schedules: [{ dayOfWeek: 1, startTime: "17:00", durationMinutes: 60 }], 
      cadets: Array(capacity).fill({ name: "", studentId: "" }) 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setModalMode("edit");
    setSelectedGroup(group);
    reset({
      name: group.name,
      description: group.description,
      level: group.level,
      colorTag: group.colorTag,
      numberOfStudents: group.numberOfStudents,
      frequency: group.frequency || 1,
      totalSessions: group.totalSessions,
      startingSessionNumber: group.startingSessionNumber,
      schedules: group.schedules?.map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        durationMinutes: s.durationMinutes
      })) || []
    });
    setWizardStep(1);
    setIsModalOpen(true);
  };

  const openDeleteModal = (group: Group) => {
    setSelectedGroup(group);
    setIsDeleteOpen(true);
  };

  const openAddStudentModal = (group: Group) => {
    setSelectedGroup(group);
    setNewStudentName("");
    setIsAddStudentOpen(true);
  };

  const onSubmit = async (data: GroupFormValues) => {
    try {
      if (modalMode === "create") {
        await createMutation.mutateAsync(data);
        toast.success(t("groups.modal.create_success"));
      } else if (selectedGroup) {
        await updateMutation.mutateAsync({ id: selectedGroup.id, data });
        toast.success(t("groups.modal.update_success"));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteMutation.mutateAsync(selectedGroup.id);
      toast.success(t("common.success"));
      setIsDeleteOpen(false);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleAddStudent = async () => {
    if (!selectedGroup || !newStudentName.trim()) return;
    try {
      await enrollStudentMutation.mutateAsync({ groupId: selectedGroup.id, name: newStudentName.trim() });
      toast.success(t("groups.enroll.success", { name: newStudentName.trim(), group: selectedGroup.name }));
      setIsAddStudentOpen(false);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  // Server-side filtering is now handled by the hook; groups is already filtered
  const filteredGroups = groups;

  return (
    <div className="w-full h-full p-4 lg:p-8 space-y-8 animate-fade-in custom-scrollbar overflow-y-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-sora font-extrabold text-white tracking-tight">
            {t("groups.title")}
          </h1>
          <p className="text-slate-500 font-medium tracking-wide">
            {t("groups.subtitle")}
          </p>
        </div>
        
        <Button onClick={openCreateModal} className="h-12 shadow-xl shadow-brand-500/10 !font-extrabold uppercase tracking-widest text-xs">
          <Plus className="w-4 h-4 me-2" /> {t("groups.create")}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="card-base p-2 border-slate-800/30 bg-slate-900/20 backdrop-blur-3xl flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-brand-500" />
          <input 
            placeholder={t("common.search")} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 h-10 w-full bg-transparent border-none focus:outline-none text-sm text-slate-200"
          />
        </div>
        <div className="h-6 w-px bg-slate-800" />
        <div className="flex gap-1">
          <button 
            onClick={() => setViewMode("grid")}
            className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all", viewMode === "grid" ? "bg-brand-500/10 text-brand-400 shadow-inner" : "text-slate-600 hover:text-slate-400")}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode("list")}
            className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all", viewMode === "list" ? "bg-brand-500/10 text-brand-400 shadow-inner" : "text-slate-600 hover:text-slate-400")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="card-base h-48 bg-slate-900/50" />)}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-6 opacity-50">
          <div className="p-6 rounded-full bg-slate-900 shadow-2xl">
            <Users className="w-12 h-12 text-slate-700" />
          </div>
          <div className="text-center">
            <p className="text-lg font-sora font-extrabold text-white">{t("groups.empty.title")}</p>
            <p className="text-sm text-slate-500 font-medium">{t("groups.empty.subtitle")}</p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 p-2 pt-8">
          {filteredGroups.map((group) => (
            <div key={group.id} className="relative group/deck w-full h-[380px]">
               {/* Deck Stack Backgrounds */}
               <div className={cn(
                 "absolute inset-x-6 top-8 bottom-0 rounded-[2rem] border border-white/5 backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/deck:rotate-[10deg] group-hover/deck:translate-x-12 group-hover/deck:translate-y-6 group-hover/deck:scale-95 shadow-2xl opacity-50",
                 group.colorTag === "blue" ? "bg-blue-500/10" : 
                 group.colorTag === "violet" ? "bg-violet-500/10" :
                 group.colorTag === "emerald" ? "bg-emerald-500/10" : 
                 group.colorTag === "amber" ? "bg-amber-500/10" :
                 group.colorTag === "rose" ? "bg-rose-500/10" :
                 "bg-brand-500/10"
               )} />
               <div className={cn(
                 "absolute inset-x-3 top-4 bottom-4 rounded-[2rem] border border-white/5 backdrop-blur-md transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/deck:rotate-[-8deg] group-hover/deck:-translate-x-10 group-hover/deck:translate-y-2 group-hover/deck:scale-100 shadow-2xl z-[1] opacity-70",
                 group.colorTag === "blue" ? "bg-blue-500/20" : 
                 group.colorTag === "violet" ? "bg-violet-500/20" :
                 group.colorTag === "emerald" ? "bg-emerald-500/20" : 
                 group.colorTag === "amber" ? "bg-amber-500/20" :
                 group.colorTag === "rose" ? "bg-rose-500/20" :
                 "bg-brand-500/20"
               )} />
               
               {/* Main Card */}
               <div className="card-base absolute inset-0 group/card bg-slate-950/80 backdrop-blur-3xl p-0 flex flex-col z-10 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/deck:-translate-y-8 group-hover/deck:shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent opacity-0 group-hover/deck:opacity-100 transition-opacity duration-700 pointer-events-none" />
                 
                 <div className="p-6 space-y-6 flex-1 relative z-20">
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "p-3 rounded-2xl shadow-xl transition-all duration-500 group-hover/card:scale-110 group-hover/card:shadow-glow text-white",
                      group.colorTag === "blue" ? "bg-blue-500 shadow-blue-500/20" : 
                      group.colorTag === "violet" ? "bg-violet-500 shadow-violet-500/20" :
                      group.colorTag === "emerald" ? "bg-emerald-500 shadow-emerald-500/20" : 
                      group.colorTag === "amber" ? "bg-amber-500 shadow-amber-500/20" :
                      group.colorTag === "rose" ? "bg-rose-500 shadow-rose-500/20" :
                      "bg-brand-500 shadow-brand-500/20"
                    )}>
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover/deck:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(group)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(group)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <h3 className="text-xl font-sora font-black text-white tracking-tight uppercase truncate drop-shadow-md">{group.name}</h3>
                       <Badge variant="primary" className={cn(
                         "text-[8px] font-black uppercase border-none",
                         group.colorTag === "blue" ? "bg-blue-500/10 text-blue-400" : 
                         group.colorTag === "violet" ? "bg-violet-500/10 text-violet-400" :
                         group.colorTag === "emerald" ? "bg-emerald-500/10 text-emerald-400" : 
                         group.colorTag === "amber" ? "bg-amber-500/10 text-amber-400" :
                         group.colorTag === "rose" ? "bg-rose-500/10 text-rose-400" :
                         "bg-brand-500/10 text-brand-400"
                       )}>{t("sidebar.levels." + (group.level === 1 ? "fundamentals" : group.level === 2 ? "intermediate" : group.level === 3 ? "advanced" : "masterclass"))}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed line-clamp-2">{group.description || t("common.none")}</p>
                  </div>

                  <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-14 h-14 flex items-center justify-center drop-shadow-lg">
                          <svg className="w-full h-full -rotate-90 transform">
                            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800/50" />
                            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="150.8" strokeDashoffset={150.8 - (Math.min(1, (group.studentCount ?? group.students?.length ?? 0) / group.numberOfStudents) * 150.8)} className={cn("transition-all duration-1000", (group.studentCount ?? group.students?.length ?? 0) >= group.numberOfStudents ? "text-emerald-500 shadow-glow-emerald" : "text-brand-500 shadow-glow")} />
                          </svg>
                          <span className="absolute text-sm font-black text-white">
                            {group.studentCount ?? group.students?.length ?? 0}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.card.enrollment")}</p>
                          <p className="text-[10px] font-black text-white uppercase tabular-nums">{group.numberOfStudents} SLOTS</p>
                        </div>
                      </div>
                    <div className="w-px h-10 bg-slate-800" />
                    <div className="space-y-2 flex-1 ps-2 relative group/prog">
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] flex justify-between">
                         <span>{t("groups.card.progression")}</span>
                         <span className={cn(
                           "font-black drop-shadow-md",
                           group.colorTag === "blue" ? "text-blue-400" : 
                           group.colorTag === "violet" ? "text-violet-400" :
                           group.colorTag === "emerald" ? "text-emerald-400" : 
                           group.colorTag === "amber" ? "text-amber-400" :
                           group.colorTag === "rose" ? "text-rose-400" :
                           "text-brand-400"
                         )}>{group.currentSessionNumber} / {group.totalSessions}</span>
                       </p>
                       <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden shadow-inner relative">
                          {/* Neural Scan Line Effect */}
                          <div className="absolute top-0 bottom-0 w-2 bg-white/10 blur-sm animate-scan pointer-events-none z-10" />
                          
                          <div 
                            className={cn(
                              "h-full shadow-glow transition-all duration-1000 relative overflow-hidden",
                              group.colorTag === "blue" ? "bg-blue-500" : 
                              group.colorTag === "violet" ? "bg-violet-500" :
                              group.colorTag === "emerald" ? "bg-emerald-500" : 
                              group.colorTag === "amber" ? "bg-amber-500" :
                              group.colorTag === "rose" ? "bg-rose-500" :
                              "bg-brand-500"
                            )} 
                            style={{ width: `${Math.min(100, ((group.currentSessionNumber - 1) / group.totalSessions) * 100)}%` }}
                          >
                             {/* Inner sparkle */}
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-scan" />
                          </div>
                       </div>
                       {group.startingSessionNumber > 1 && (
                         <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest absolute -bottom-3 left-2">Level Offset Enabled</p>
                       )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 border-t border-white/5 bg-slate-900/40 flex flex-wrap gap-3 items-center justify-between mt-auto relative z-20">
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.card.next_session")}</p>
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                      {group.nextSession 
                        ? `${format(new Date(group.nextSession), "MMM dd • h:mm a")}` 
                        : t("groups.card.no_session")}
                     </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openAddStudentModal(group)} className="btn-ghost !p-2 !h-9 w-9 flex items-center justify-center hover:text-emerald-400">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => navigate(`/groups/${group.id}/sessions`)} className="h-9 px-4 rounded-xl bg-brand-500/10 text-brand-400 hover:bg-brand-500 hover:text-white font-black uppercase tracking-widest text-[9px] transition-all flex items-center gap-2 shadow-inner hover:shadow-glow">
                      {t("groups.card.manage")} <ChevronRight className="w-3 h-3 rtl:rotate-180 flex-shrink-0" />
                    </button>
                  </div>
                </div>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-base overflow-hidden border-white/5 bg-white/[0.02] p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-start border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-500 text-[9px] uppercase font-black tracking-[0.2em]">
                  <th className="px-6 py-5 text-start">{t("groups.wizard.step1.name")}</th>
                  <th className="px-6 py-5 text-center">{t("groups.modal.students")}</th>
                  <th className="px-6 py-5 text-center">{t("groups.wizard.step1.level")}</th>
                  <th className="px-6 py-5 text-start">{t("groups.card.next_session")}</th>
                  <th className="px-6 py-5 text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="border-b border-white/5 hover:bg-slate-900/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          group.colorTag === "blue" ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : 
                          group.colorTag === "violet" ? "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" :
                          group.colorTag === "emerald" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                          group.colorTag === "amber" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                          group.colorTag === "rose" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                          "bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        )} />
                        <span className="font-bold text-slate-300 group-hover:text-white">{group.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 font-extrabold">{group.studentCount ?? group.students?.length ?? 0}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="primary" className="text-[9px]">{t("dashboard.modal.level").toUpperCase()} {group.level}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {group.nextSession ? new Date(group.nextSession).toLocaleDateString() : t("common.none")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end space-x-2 rtl:space-x-reverse">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openAddStudentModal(group)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-400"
                      >
                         <Plus className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditModal(group)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openDeleteModal(group)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Infinite scroll sentinel + loading indicator */}
      {loadingMore && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Loading more groups...</span>
          </div>
        </div>
      )}
      <div ref={sentinelRef} className="h-1" />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === "create" ? t("groups.modal.create") : t("groups.modal.edit")}
        className="max-w-2xl"
      >
        <div className="flex gap-2 p-1 bg-slate-900 border border-white/5 rounded-2xl mb-10">
          {[
            { id: 1, label: t("groups.wizard.steps.identity"), icon: Info },
            { id: 2, label: t("groups.wizard.steps.params"), icon: Settings },
            ...(modalMode === "create" ? [{ id: 3, label: t("groups.wizard.steps.roster"), icon: Users }] : []),
            { id: 4, label: t("groups.wizard.steps.confirm"), icon: CheckCircle2 }
          ].map(step => (
            <div 
              key={step.id} 
              className={cn(
                "flex-1 h-10 px-4 rounded-xl flex items-center justify-center gap-2 transition-all",
                wizardStep === step.id ? "bg-brand-500 text-white shadow-glow" : "text-slate-600"
              )}
            >
              <step.icon className={cn("w-3.5 h-3.5", wizardStep === step.id ? "animate-pulse" : "")} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{step.label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {wizardStep === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ms-1">{t("groups.wizard.step1.name")}</label>
                  <input 
                    {...register("name")} 
                    placeholder={t("groups.modal.placeholder_name")} 
                    className="w-full h-12 rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-inner"
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ms-1">{errors.name.message}</p>}
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ms-1">{t("groups.wizard.step1.level")}</label>
                  <select 
                    {...register("level", { valueAsNumber: true })}
                    className="w-full h-12 rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-inner appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[position:right_1rem_center] bg-no-repeat"
                  >
                    <option value={1}>{t("sidebar.levels.fundamentals")}</option>
                    <option value={2}>{t("sidebar.levels.intermediate")}</option>
                    <option value={3}>{t("sidebar.levels.advanced")}</option>
                    <option value={4}>{t("sidebar.levels.masterclass")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ms-1">{t("groups.wizard.step1.identity")}</label>
                <div className="flex gap-4 p-4 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                  {["blue", "violet", "emerald", "amber", "rose"].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue("colorTag", color)}
                      className={cn(
                        "w-10 h-10 rounded-xl border-2 transition-all duration-300 relative group/color",
                        color === "blue" ? "bg-blue-500" :
                        color === "violet" ? "bg-violet-500" :
                        color === "emerald" ? "bg-emerald-500" :
                        color === "amber" ? "bg-amber-500" : "bg-rose-500",
                        currentColorTag === color ? "border-white scale-110 shadow-glow" : "border-transparent opacity-40 hover:opacity-100 hover:scale-105"
                      )}
                    >
                       {currentColorTag === color && <div className="absolute inset-0 flex items-center justify-center text-white"><Plus className="w-5 h-5" /></div>}
                    </button>
                  ))}
                  <div className="ms-auto flex items-center pe-2">
                     <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step1.color_hint")}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ms-1">{t("groups.wizard.step1.description")}</label>
                <textarea 
                  {...register("description")}
                  placeholder={t("groups.modal.placeholder_desc")}
                  className="w-full h-32 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-inner resize-none"
                />
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-slate-950 border border-red-500/10 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500/[0.03] animate-pulse" />
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-red-500/80 uppercase tracking-widest">{t("groups.wizard.step2.locked")}</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{t("groups.wizard.step2.locked_desc")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Capacity Counter */}
                <div className="space-y-3 bg-slate-950/50 p-5 rounded-2xl border border-white/5 shadow-inner">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t("groups.wizard.step2.capacity")}</label>
                  <div className="flex items-center justify-between">
                    <button 
                      type="button" 
                      onClick={() => setValue("numberOfStudents", Math.max(1, watch("numberOfStudents") - 1))}
                      className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4 rotate-45" />
                    </button>
                    <span className="text-2xl font-black text-white tabular-nums">{watch("numberOfStudents")}</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        const max = LEVEL_CAPACITY_MAP[currentLevel] || 4;
                        if (watch("numberOfStudents") < max) {
                          setValue("numberOfStudents", watch("numberOfStudents") + 1);
                        } else {
                          toast.error(`Max students for Level ${currentLevel} is ${max}`);
                        }
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">SLOTS REMAINING</p>
                </div>

                {/* Frequency Picker */}
                <div className="space-y-3 bg-slate-950/50 p-5 rounded-2xl border border-white/5 shadow-inner">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">Weekly Frequency</label>
                  <div className="flex items-center justify-between gap-1">
                    {[1, 2, 3].map(freq => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => {
                          setValue("frequency", freq);
                          // Sync schedules array length
                          const currentSchedules = watch("schedules");
                          if (currentSchedules.length < freq) {
                            for (let i = currentSchedules.length; i < freq; i++) {
                              append({ dayOfWeek: 1, startTime: "17:00", durationMinutes: 60 });
                            }
                          } else if (currentSchedules.length > freq) {
                            for (let i = currentSchedules.length - 1; i >= freq; i--) {
                              remove(i);
                            }
                          }
                        }}
                        className={cn(
                          "flex-1 h-10 rounded-xl text-[10px] font-black tracking-widest transition-all",
                          watch("frequency") === freq ? "bg-brand-500 text-white shadow-glow" : "bg-slate-900 text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {freq}X
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">SESSIONS/WEEK</p>
                </div>

                {/* Total Sessions (Locked) */}
                <div className="space-y-3 bg-slate-950/50 p-5 rounded-2xl border border-slate-950/30 shadow-inner group/locked">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ms-1">{t("groups.wizard.step2.total_sessions")}</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-slate-700">
                       <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-2xl font-black text-slate-700 tabular-nums">{watch("totalSessions")}</span>
                  </div>
                  <p className="text-[8px] text-slate-700 font-bold uppercase tracking-tight">STRICT LEVEL CAP</p>
                </div>

                {/* Start Session Counter */}
                <div className="space-y-3 bg-slate-950/50 p-5 rounded-2xl border border-white/5 shadow-inner">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ms-1">{t("groups.wizard.step2.starting_no")}</label>
                  <div className="flex items-center justify-between">
                    <button 
                      type="button" 
                      onClick={() => setValue("startingSessionNumber", Math.max(1, watch("startingSessionNumber") - 1))}
                      className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4 rotate-45" />
                    </button>
                    <span className="text-2xl font-black text-white tabular-nums">{watch("startingSessionNumber")}</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        const max = LEVEL_SESSION_MAP[currentLevel] || 13;
                        if (watch("startingSessionNumber") < max) {
                          setValue("startingSessionNumber", watch("startingSessionNumber") + 1);
                        } else {
                          toast.error(`Session Number cannot exceed total sessions (${max})`);
                        }
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">STARTING OFFSET</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between ps-1">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t("groups.wizard.step3.recurring")}</label>
                    <p className="text-[9px] text-slate-600 font-black uppercase">{t("groups.wizard.step3.recurring_desc")}</p>
                  </div>
                  <button type="button" onClick={() => fields.length < 3 && append({ dayOfWeek: 1, startTime: "09:00", durationMinutes: 60 })} disabled={fields.length >= 3} className={cn("h-8 px-4 rounded-lg font-black uppercase tracking-widest text-[9px] shadow-lg transition-colors", fields.length >= 3 ? "bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed" : "bg-slate-800 text-white hover:bg-brand-500")}>
                    <Plus className="w-3.5 h-3.5 me-2" /> {t("groups.wizard.step3.add_day")}
                  </button>
                </div>
                
                {fields.length > 0 && <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest ps-1">Strict Rule: {fields.length} session{fields.length > 1 ? "s" : ""} per week.</p>}
              
              <div className="grid gap-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-center bg-slate-950/80 p-4 rounded-2xl border border-slate-800 hover:border-brand-500/30 transition-colors group/row">
                    <div className="flex-1">
                      <select 
                        {...register(`schedules.${index}.dayOfWeek` as const, { valueAsNumber: true })}
                        className="w-full h-10 rounded-xl border border-slate-800 bg-slate-900 px-4 text-xs font-black text-slate-300 uppercase tracking-widest focus:ring-2 focus:ring-brand-500/50 outline-none"
                      >
                        {[
                          t("common.days.sunday"),
                          t("common.days.monday"),
                          t("common.days.tuesday"),
                          t("common.days.wednesday"),
                          t("common.days.thursday"),
                          t("common.days.friday"),
                          t("common.days.saturday")
                        ].map((day, i) => (
                          <option key={i} value={i}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <select 
                        {...register(`schedules.${index}.startTime` as const)}
                        className="w-full h-10 rounded-xl border border-slate-800 bg-slate-900 px-4 text-xs font-black text-slate-300 focus:ring-2 focus:ring-brand-500/50 outline-none tabular-nums"
                      >
                        {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="w-32">
                      <select 
                        {...register(`schedules.${index}.durationMinutes` as const, { valueAsNumber: true })}
                        className="w-full h-10 rounded-xl border border-slate-800 bg-slate-900 px-4 text-xs font-black text-slate-300 focus:ring-2 focus:ring-brand-500/50 outline-none"
                      >
                        <option value={60}>1 HOUR</option>
                        <option value={90}>1.5 HOURS</option>
                        <option value={120}>2 HOURS</option>
                      </select>
                    </div>
                    <button type="button" onClick={() => remove(index)} className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {fields.length === 0 ? (
                  <div className="p-10 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center grayscale opacity-30 gap-4">
                      <Calendar className="w-8 h-8 text-slate-600" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t("groups.wizard.step2.no_schedules")}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

          {wizardStep === 3 && modalMode === "create" && (
            <div className="space-y-6 animate-fade-in h-[400px] overflow-y-auto custom-scrollbar pe-2">
                <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl flex items-center gap-4 mb-8">
                   <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-glow shadow-brand-500/5">
                      <GraduationCap className="w-6 h-6 text-brand-400" />
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-sm font-black text-white uppercase tracking-tighter">{t("groups.wizard.step3.title")}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t("groups.wizard.step3.subtitle")}</p>
                   </div>
                </div>
              <div className="grid grid-cols-1 gap-4">
                {Array.from({ length: watch("numberOfStudents") || 4 }).map((_, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-slate-950/50 border border-white/5 rounded-2xl group/student transition-all hover:bg-slate-900/50">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="space-y-1">
                        <label className="ps-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step3.cadet")}</label>
                        <Input 
                          placeholder={t("groups.wizard.step3.name")}
                          {...register(`cadets.${index}.name`)}
                          className="h-11 bg-slate-950 border-white/5 text-[11px] font-black tracking-tight"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <div className="p-8 bg-brand-500/5 border border-brand-500/20 rounded-3xl text-center space-y-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-20 h-20 bg-brand-500 rounded-3xl mx-auto flex items-center justify-center shadow-glow shadow-brand-500/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                      <PlayCircle className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-sora font-black text-white uppercase tracking-tighter">{t("groups.wizard.step4.ready")}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mx-auto max-w-xs">{t("groups.wizard.step4.finalizing")}</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-950 border border-white/5 rounded-2xl space-y-1 hover:border-brand-500/20 transition-colors">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step4.confirm_req")}</p>
                      <p className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        {t("groups.wizard.step4.verified")}
                      </p>
                  </div>
                  <div className="p-5 bg-slate-950 border border-white/5 rounded-2xl space-y-1">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step4.target_group")}</p>
                      <p className="text-sm font-black text-brand-400 uppercase tracking-tight">{watch("name")}</p>
                  </div>
                  <div className="p-5 bg-slate-950 border border-white/5 rounded-2xl space-y-1">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t("groups.wizard.step4.cadet_count")}</p>
                      <p className="text-sm font-black text-white uppercase tracking-tight">{watch("cadets")?.filter((c: any) => c.name).length} / {watch("numberOfStudents")} {t("groups.wizard.step4.enrolled")}</p>
                  </div>
                  <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">{t("groups.wizard.step4.encryption_active")}</p>
                  </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-slate-800 mt-8">
            {wizardStep > 1 && (
              <Button type="button" variant="ghost" onClick={() => setWizardStep(w => w - 1)} className="flex-1">
                <ChevronRight className="w-4 h-4 me-2 rotate-180 rtl:rotate-0" /> {t("groups.modal.back")}
              </Button>
            )}
            
            {wizardStep < 4 ? (
              <Button 
                type="button" 
                onClick={() => {
                  if (wizardStep === 1) {
                    const name = watch("name");
                    if (!name || name.trim().length < 3) {
                      toast.error(t("groups.modal.name_min_length"));
                      return;
                    }
                  }
                  if (wizardStep === 2) {
                    if (fields.length === 0) {
                      toast.error("Strict Rule: At least 1 session per week schedule must be defined.");
                      return;
                    }
                    // In edit mode, skip the roster step (step 3) and jump straight to confirmation
                    if (modalMode === "edit") {
                      setWizardStep(4);
                      return;
                    }
                  }
                  if (wizardStep === 3) {
                    const cadets = watch("cadets") || [];
                    for(const c of cadets) {
                      if (!c.name || c.name.trim().length < 2) {
                        toast.error("Strict Rule: All cadet names must be provided to generate system UUIDs.");
                        return;
                      }
                    }
                  }
                  setWizardStep(w => w + 1);
                }} 
                className={cn("flex-1 h-12 shadow-brand-500/20", wizardStep === 1 ? "col-span-2" : "")}
              >
                {t("groups.modal.next", { next: wizardStep + 1 })} <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="flex-1 h-12 shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 text-white">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : modalMode === "create" ? t("groups.modal.submit_create") : t("groups.modal.submit_edit")}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("groups.modal.delete")}
        description={t("groups.delete.description", { name: selectedGroup?.name })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("groups.delete.abort")}
        variant="danger"
        isLoading={submitting}
      />

      {/* Add Student Modal */}
      <Modal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title={t("groups.modal.enrollment")}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ms-1">{t("groups.enroll.name")}</label>
            <Input 
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder={t("groups.enroll.placeholder")}
              className="h-11 shadow-inner focus:scale-[1.01] transition-transform"
              autoFocus
            />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ms-1">{t("groups.enroll.enrolling_in", { name: selectedGroup?.name })}</p>
          </div>
          <div className="flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={() => setIsAddStudentOpen(false)}>{t("groups.enroll.abort")}</Button>
             <Button disabled={submitting || !newStudentName.trim()} className="flex-1 h-12" onClick={handleAddStudent}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("groups.enroll.submit")}
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupsPage;
