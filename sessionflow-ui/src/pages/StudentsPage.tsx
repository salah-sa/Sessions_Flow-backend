import React, { useState, useEffect, useRef } from "react";
import { GraduationCap, Search, Plus, MoreHorizontal, Filter, Download, ArrowUpRight, ArrowDownRight, User as UserIcon, Loader2, Trash2, Edit2, Users, Mail, Hash, Calendar, ShieldCheck, ChevronRight, LayoutGrid, List, Copy, CheckSquare, Square, X, Activity, BarChart, Clock, Database, CheckCircle2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card, Button, Input, Badge, Modal, Skeleton, ConfirmDialog } from "../components/ui";
import { useInfiniteStudents, useStudentMutations } from "../queries/useStudentQueries";
import { useGroups } from "../queries/useGroupQueries";
import { Student, Group } from "../types";
import { cn } from "../lib/utils";
import { getColorVars } from "../lib/colorUtils";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const StudentsPage: React.FC = () => {
  const { t } = useTranslation();

  const copyStudentId = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("students.copy_id_success"));
  };
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: groupsData } = useGroups();
  const groups = groupsData?.items || [];

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);
  const [formName, setFormName] = useState("");
  const [formGroupId, setFormGroupId] = useState("");

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading 
  } = useInfiniteStudents({ 
    search: debouncedSearch || undefined,
    groupId: filterGroup === "all" ? undefined : filterGroup
  });

  const students = data?.pages.flatMap(page => (page as any).items) || [];
  const loading = isLoading;
  const loadingMore = isFetchingNextPage;
  const hasMore = hasNextPage;

  const { createMutation, updateMutation, deleteMutation, bulkDeleteMutation } = useStudentMutations();

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
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore && !loading) fetchNextPage(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, fetchNextPage, loadingMore, loading]);

  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  // Server-side filtering is now handled by the hook
  const filteredStudents = students;

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.size === 0) return;
    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedStudentIds));
      toast.success(t("students.bulk_delete_success", { count: selectedStudentIds.size }));
      setSelectedStudentIds(new Set());
      setIsBulkDeleteModalOpen(false);
    } catch(err: any) {
      toast.error(t("students.bulk_delete_error"));
    }
  };

  const openAddModal = () => {
    setFormName("");
    setFormGroupId(groups[0]?.id || "");
    setIsAddModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormName(student.name);
    setFormGroupId(student.groupId);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const handleCreateStudent = async () => {
    if (!formName.trim() || !formGroupId) return;
    try {
      await createMutation.mutateAsync({ groupId: formGroupId, name: formName.trim() });
      toast.success(t("students.registration_success", { name: formName }));
      setIsAddModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent || !formName.trim()) return;
    try {
      await updateMutation.mutateAsync({ id: selectedStudent.id, name: formName.trim() });
      toast.success(t("students.identity_updated"));
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      await deleteMutation.mutateAsync(selectedStudent.id);
      toast.success(t("students.record_terminated"));
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  const exportToCSV = () => {
    const headers = [t("students.cadet_id"), t("students.table.name"), t("students.table.group"), t("common.date")];
    const rows = filteredStudents.map(s => [
      s.uniqueStudentCode || s.studentId || "N/A",
      s.name,
      s.group?.name || t("students.unassigned"),
      format(new Date(s.createdAt), "yyyy.MM.dd")
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Unit_Roster_Export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("students.export_done"));
  };

  const StudentAvatar = ({ name, color }: { name: string, color?: string }) => {
    const colors = ["from-blue-500", "from-purple-500", "from-emerald-500", "from-amber-500", "from-rose-500"];
    const colorClass = color || colors[name.length % colors.length];
    return (
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-xl bg-gradient-to-br", colorClass, "to-slate-900")}>
        <span className="text-sm font-black text-white tracking-widest">{name.substring(0, 2).toUpperCase()}</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-slate-950/50 backdrop-blur-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0">
        <div className="space-y-1 text-start">
          <h1 className="text-3xl font-sora font-black text-white tracking-tighter uppercase flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 shadow-glow shadow-brand-500/5">
               <GraduationCap className="w-8 h-8 text-brand-500" />
            </div>
            {t("students.title_roster")}
          </h1>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] opacity-80 ps-1">
             {t("students.subtitle_roster")}
          </p>
        </div>
        
        <div className="flex gap-4">
          <button onClick={exportToCSV} className="btn-ghost h-12 px-6 border border-white/5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Download className="w-4 h-4" /> {t("students.export_csv_btn")}
          </button>
          <button 
             onClick={openAddModal} 
             className="h-12 px-8 bg-brand-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow shadow-brand-500/20 flex items-center gap-3 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" /> {t("students.enroll_cadet")}
          </button>
        </div>
      </div>

      {/* Stats Summary Area */}
      <div className="px-8 py-6 border-b border-white/5 bg-slate-900/40 grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
        {[
          { label: t("students.stats.active"), value: students.length, icon: Users, color: "text-brand-500", bg: "bg-brand-500/10" },
          { label: t("students.stats.synced"), value: students.filter(s => s.userId).length, icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: t("students.stats.units"), value: groups.length, icon: LayoutGrid, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: t("students.stats.readiness"), value: "98.2%", icon: ArrowUpRight, color: "text-rose-500", bg: "bg-rose-500/10" }
        ].map((stat, i) => (
          <div key={i} className="card-base p-6 bg-slate-950/60 border-white/[0.03] flex items-center justify-between group hover:border-white/10 transition-all">
            <div className="space-y-1 text-start">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-sora font-black text-white tracking-tighter tabular-nums">{stat.value}</p>
            </div>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-white/5 transition-all group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar & Filters */}
      <div className="px-8 py-4 bg-slate-900/20 border-b border-white/5 flex flex-wrap gap-6 items-center shrink-0">
        <div className="relative flex-1 min-w-[320px] group">
           <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-brand-500" />
           <input 
             placeholder={t("students.search_placeholder_roster")} 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full h-11 bg-slate-950/50 border border-white/5 rounded-xl ps-12 pe-4 text-[10px] font-black uppercase tracking-widest text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-inner"
           />
        </div>
        
        <div className="flex items-center gap-4">
           {selectedStudentIds.size > 0 ? (
              <div className="flex items-center gap-4 bg-brand-500/10 px-4 py-2 rounded-xl border border-brand-500/20 shadow-glow shadow-brand-500/10 animate-fade-in">
                <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{selectedStudentIds.size} Selected</span>
                <div className="w-px h-4 bg-brand-500/20" />
                <button onClick={() => setIsBulkDeleteModalOpen(true)} className="flex items-center gap-2 text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors"><Trash2 className="w-3.5 h-3.5" /> {t("common.delete")}</button>
              </div>
           ) : (
             <button onClick={toggleAll} className="h-11 px-4 rounded-xl bg-slate-950/50 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors flex items-center gap-2">
               <CheckSquare className="w-4 h-4" /> {t("students.select_all")}
             </button>
           )}
           <select 
             value={filterGroup}
             onChange={(e) => setFilterGroup(e.target.value)}
             className="h-11 rounded-xl bg-slate-950/50 border border-white/5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
           >
             <option value="all">{t("students.all_units")}</option>
             {groups.map(g => (
               <option key={g.id} value={g.id} className="bg-slate-900">{g.name.toUpperCase()}</option>
             ))}
           </select>
           <div className="w-px h-6 bg-white/5 mx-2" />
           <div className="flex bg-slate-900/50 rounded-xl p-1 border border-white/5">
              <button 
                onClick={() => setViewMode("grid")}
                className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all", viewMode === "grid" ? "bg-brand-500 text-white shadow-glow" : "text-slate-600 hover:text-slate-400")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all", viewMode === "list" ? "bg-brand-500 text-white shadow-glow" : "text-slate-600 hover:text-slate-400")}
              >
                <List className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
         {loading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
             {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
           </div>
         ) : filteredStudents.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-6">
              <Users className="w-24 h-24 text-slate-600" />
              <p className="text-sm font-black uppercase tracking-[0.3em]">{t("students.no_personnel")}</p>
           </div>
         ) : viewMode === "grid" ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative px-2">
              {/* Constellation Grid Background */}
              <div className="absolute inset-0 pointer-events-none opacity-40" 
                style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
              />

              {filteredStudents.map((student) => {
                const isSelected = selectedStudentIds.has(student.id);
                const cv = getColorVars(student.group?.colorTag);
                
                return (
                <div key={student.id} onClick={() => setDrawerStudent(student)} className={cn(
                    "card-base relative group/cadet border-white/5 p-6 flex flex-col transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-md",
                    "hover:-translate-y-2 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]",
                    isSelected 
                      ? "bg-brand-500/10 border-brand-500/50 shadow-glow" 
                      : "bg-slate-900/40 hover:bg-slate-900/60",
                    cv.cardHoverBorder
                  )}>
                   
                   {/* Background Glow */}
                   <div className={cn(
                     "absolute inset-0 opacity-0 group-hover/cadet:opacity-20 transition-opacity duration-700 blur-2xl pointer-events-none",
                     cv.bgBase
                   )} />

                   {/* Selection Checkbox overlay */}
                   <div className="absolute top-4 start-4 z-10" onClick={(e) => toggleSelection(student.id, e)}>
                      {isSelected ? <CheckSquare className="w-5 h-5 text-brand-500" /> : <Square className="w-5 h-5 text-slate-700 opacity-0 group-hover/cadet:opacity-100 transition-opacity" />}
                   </div>

                   <div className="flex items-start justify-between mb-8 ps-10 relative z-20">
                      <div className="relative">
                         <StudentAvatar name={student.name} color={student.group?.colorTag} />
                         {/* Constellation Ping */}
                         <div className={cn("absolute -inset-2 rounded-full border border-white/10 opacity-0 scale-50 group-hover/cadet:opacity-100 group-hover/cadet:scale-100 transition-all duration-700 pointer-events-none", cv.ring)} />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover/cadet:opacity-100 transition-all">
                         <button onClick={(e) => { e.stopPropagation(); openDeleteModal(student); }} className="w-9 h-9 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm border border-white/5 rounded-xl hover:text-red-500 hover:border-red-500/30 transition-all shadow-inner">
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                   
                   <div className="space-y-4 flex-1 text-start relative z-20">
                      <div>
                         <h3 className={cn("text-lg font-sora font-black text-white uppercase truncate transition-colors duration-500", cv.textHover)}>
                           {student.name}
                         </h3>
                         <div className="flex items-center gap-2 mt-2">
                            <div className="px-3 py-1.5 bg-slate-950/80 border border-white/5 rounded-lg flex items-center gap-2 shadow-inner group/id hover:border-white/20 transition-all">
                               <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">{student.uniqueStudentCode || student.studentId || t("students.id_pending")}</span>
                               <button onClick={(e) => { e.stopPropagation(); copyStudentId(student.uniqueStudentCode || student.studentId || ""); }} className="text-slate-700 hover:text-brand-500 transition-colors">
                                  <Copy className="w-3 h-3" />
                               </button>
                            </div>
                            {student.userId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                         </div>
                      </div>

                      <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 flex items-center justify-between transition-all duration-500 group-hover/cadet:bg-slate-950/80">
                         <div className="space-y-0.5 relative z-10">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{t("students.deployed_node")}</p>
                            <p className={cn("text-[10px] font-black uppercase tracking-tight drop-shadow-md", student.group ? cv.textBase : "text-white")}>
                              {student.group?.name || t("students.reserve")}
                            </p>
                         </div>
                         <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/5 transition-all duration-500 group-hover/cadet:scale-110", cv.borderBaseHover, cv.bgLightHover)}>
                            <ChevronRight className={cn("w-3.5 h-3.5 text-slate-600 transition-colors duration-500", cv.textHover)} />
                         </div>
                      </div>
                   </div>
                   
                   <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between relative z-20">
                      <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
                         <Clock className="w-3 h-3" />
                         {format(new Date(student.createdAt), "MMM dd, yyyy")}
                      </div>
                      <Badge variant="outline" className={cn("text-[7px] font-black uppercase tracking-wider", student.group ? `${cv.textBase} ${cv.ring}` : "text-slate-500 border-white/5")}>
                         {t("students.operational")}
                      </Badge>
                   </div>
                </div>
              )})}
           </div>
         ) : (
           <div className="card-base overflow-hidden border-white/5 bg-slate-900/20 p-0">
              <table className="w-full text-start">
                 <thead>
                    <tr className="bg-slate-950 border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        <th className="w-12 px-8 py-5 text-start">
                           <div onClick={toggleAll} className="cursor-pointer">
                             {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare className="w-4 h-4 text-brand-500" /> : <Square className="w-4 h-4 text-slate-600" />}
                           </div>
                        </th>
                        <th className="px-8 py-5 text-start">{t("students.identity_protocol")}</th>
                       <th className="px-8 py-5 text-start">{t("students.assigned_node")}</th>
                       <th className="px-8 py-5 text-center">{t("students.sync_state")}</th>
                       <th className="px-8 py-5 text-end">{t("students.task_authorization")}</th>
                    </tr>
                 </thead>
                 <tbody>
                     {filteredStudents.map(student => {
                        const isSelected = selectedStudentIds.has(student.id);
                        return (
                        <tr key={student.id} onClick={() => setDrawerStudent(student)} className={cn("border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer", isSelected && "bg-brand-500/5")}>
                           <td className="px-8 py-5 text-start" onClick={(e) => toggleSelection(student.id, e)}>
                             {isSelected ? <CheckSquare className="w-4 h-4 text-brand-500" /> : <Square className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" />}
                           </td>
                           <td className="px-8 py-5">
                             <div className="flex items-center gap-4">
                                <StudentAvatar name={student.name} color={student.group?.colorTag} />
                                <div className="text-start">
                                   <p className="text-[11px] font-black text-white uppercase tracking-tight">{student.name}</p>
                                   <p className="text-[9px] font-mono font-black text-slate-600 uppercase tracking-[0.2em]">{student.uniqueStudentCode || student.studentId || t("students.id_pending")}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-5 text-start">
                             <div className="flex flex-col">
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", student.group ? getColorVars(student.group.colorTag).textBase : 'text-slate-400')}>
                                   {student.group?.name || t("students.idle")}
                                </span>
                                <span className="text-[8px] font-black text-slate-700 uppercase">Unit Level: {student.group?.level || "N/A"}</span>
                             </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                             {student.userId ? (
                                <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black px-3 py-1">SYNCED</Badge>
                             ) : (
                                <Badge className="bg-slate-800 text-slate-600 border-none text-[8px] font-black px-3 py-1 uppercase">Cloud-Offline</Badge>
                             )}
                          </td>
                           <td className="px-8 py-5 text-end">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={(e) => { e.stopPropagation(); openEditModal(student); }} className="p-2 hover:text-brand-500 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                 <button onClick={(e) => { e.stopPropagation(); openDeleteModal(student); }} className="p-2 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                           </td>
                        </tr>
                     )})}
                  </tbody>
               </table>
            </div>
          )}
       </div>

       {/* Infinite scroll sentinel + loading indicator */}
       {loadingMore && (
         <div className="flex justify-center py-6">
           <div className="flex items-center gap-3">
             <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
             <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Loading more students...</span>
           </div>
         </div>
       )}
       <div ref={sentinelRef} className="h-1" />

       {/* Slide-out Intelligence Drawer */}
       {drawerStudent && (
          <div className="absolute inset-y-0 end-0 w-[420px] bg-slate-950 border-s border-white/10 shadow-2xl z-50 flex flex-col animate-slide-in-right">
             <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-900/50">
                <div className="flex items-center gap-3">
                   <Activity className="w-5 h-5 text-brand-500" />
                   <h2 className="text-sm font-sora font-black text-white uppercase tracking-widest">Intelligence Profile</h2>
                </div>
                <button onClick={() => setDrawerStudent(null)} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-900 rounded-lg">
                   <X className="w-4 h-4" />
                </button>
             </div>
             
             <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-8 text-start">
                <div className="flex items-center gap-6">
                   <StudentAvatar name={drawerStudent.name} color={drawerStudent.group?.colorTag} />
                   <div>
                      <h3 className="text-xl font-sora font-black text-white uppercase">{drawerStudent.name}</h3>
                      <div className="flex items-center gap-2 mt-1 opacity-70">
                         <Hash className="w-3 h-3" />
                         <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em]">{drawerStudent.uniqueStudentCode || drawerStudent.studentId || t("students.id_pending")}</span>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("students.deployed_node")}</p>
                      <p className="text-xs font-black text-white uppercase">{drawerStudent.group?.name || "NONE"}</p>
                   </div>
                   <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("students.sync_state")}</p>
                      <div className="flex">
                         {drawerStudent.userId ? 
                           <Badge variant="success" className="text-[8px] bg-emerald-500/10 text-emerald-500">SYNCED</Badge> : 
                           <Badge className="text-[8px] bg-amber-500/10 text-amber-500">UNLINKED</Badge>
                         }
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
                      <Database className="w-3.5 h-3.5" />
                      System Telemetry
                   </h4>
                   <div className="space-y-3">
                      <div className="flex justify-between items-center bg-slate-920 p-3 rounded-xl border border-white/[0.02]">
                         <span className="text-[10px] text-slate-500 font-bold uppercase">{t("common.date")}</span>
                         <span className="text-[10px] text-white font-mono">{format(new Date(drawerStudent.createdAt), "yyyy.MM.dd")}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-920 p-3 rounded-xl border border-white/[0.02]">
                         <span className="text-[10px] text-slate-500 font-bold uppercase">App ID</span>
                         <span className="text-[9px] text-white font-mono break-all max-w-[200px] text-end">{drawerStudent.userId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-920 p-3 rounded-xl border border-white/[0.02]">
                         <span className="text-[10px] text-slate-500 font-bold uppercase">Primary Group ID</span>
                         <span className="text-[9px] text-white font-mono truncate max-w-[150px]">{drawerStudent.groupId}</span>
                      </div>
                   </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                   <button onClick={() => { setDrawerStudent(null); openEditModal(drawerStudent); }} className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                      <Edit2 className="w-3.5 h-3.5" /> {t("common.edit")}
                   </button>
                   <button onClick={() => { setDrawerStudent(null); openDeleteModal(drawerStudent); }} className="flex-1 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-red-500/20 flex items-center justify-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" /> {t("common.delete")}
                   </button>
                </div>
             </div>
          </div>
       )}

       <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t("students.modal.add_title")}>
          <div className="space-y-6">
             <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Zap className="w-4 h-4" /></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t("students.modal.add_description")}</p>
             </div>
         <div className="space-y-6">
            <div className="space-y-2 text-start">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ps-1">{t("students.modal.name_label")}</label>
               <input 
                 value={formName} 
                 onChange={(e) => setFormName(e.target.value)}
                 className="w-full h-12 bg-slate-950 border border-white/5 rounded-xl px-4 text-xs font-black text-white uppercase tracking-widest focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                 placeholder="NAME-ALPHA-BRAVO"
               />
            </div>
            <div className="space-y-2 text-start">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ps-1">{t("students.modal.group_label")}</label>
               <select 
                 value={formGroupId} 
                 onChange={(e) => setFormGroupId(e.target.value)}
                 className="w-full h-12 bg-slate-950 border border-white/5 rounded-xl px-4 text-xs font-black text-slate-400 uppercase tracking-widest focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
               >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>
                  ))}
               </select>
            </div>
         </div>
             <div className="flex gap-4 pt-4">
                <Button variant="ghost" className="flex-1 uppercase font-black text-[10px] tracking-widest" onClick={() => setIsAddModalOpen(false)}>{t("common.cancel")}</Button>
                <Button disabled={createMutation.isPending || !formName.trim() || !formGroupId} className="flex-1 h-12 bg-emerald-500 text-white font-black text-[10px] tracking-widest uppercase shadow-glow shadow-emerald-500/20" onClick={handleCreateStudent}>
                   {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("students.modal.enroll")}
                </Button>
             </div>
          </div>
       </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t("students.modal.edit_title")}>
         <div className="space-y-6 text-start">
            <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl flex items-center gap-4">
               <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500"><ShieldCheck className="w-4 h-4" /></div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Editing Restricted Identity: {selectedStudent?.uniqueStudentCode || t("students.id_unsaved")}</p>
            </div>
            <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ps-1">{t("students.modal.update_name_label")}</label>
               <input 
                 value={formName} 
                 onChange={(e) => setFormName(e.target.value)}
                 className="w-full h-12 bg-slate-950 border border-white/5 rounded-xl px-4 text-xs font-black text-white uppercase tracking-widest focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
               />
            </div>
            <div className="flex gap-4 pt-4">
               <Button variant="ghost" className="flex-1 uppercase font-black text-[10px] tracking-widest" onClick={() => setIsEditModalOpen(false)}>{t("common.cancel")}</Button>
               <Button disabled={updateMutation.isPending || !formName.trim()} className="flex-1 h-12 bg-brand-500 text-white font-black text-[10px] tracking-widest uppercase" onClick={handleUpdateStudent}>
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("students.modal.save")}
               </Button>
            </div>
         </div>
      </Modal>

      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteStudent}
        title={t("students.modal.delete_title")}
        description={t("students.modal.delete_desc", { name: selectedStudent?.name.toUpperCase() })}
        confirmLabel={t("students.modal.remove")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog 
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title={t("students.bulk_delete_title")}
        description={t("students.bulk_delete_confirm", { count: selectedStudentIds.size })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
};

export default StudentsPage;
