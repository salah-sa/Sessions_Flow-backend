import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Download, ArrowUpRight, Loader2, Trash2, Edit2, Users, ShieldCheck, ChevronRight, LayoutGrid, List, Copy, CheckSquare, X, Activity, Clock, Database, CheckCircle2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button, Badge, Modal, ConfirmDialog } from "../components/ui";
import { PaginatedResponse } from "../types";
import { Drawer, DrawerContent } from "../components/ui/drawer";
import { useInfiniteStudents, useStudentMutations } from "../queries/useStudentQueries";
import { useGroups } from "../queries/useGroupQueries";
import { Student, Group } from "../types";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const StudentsPage: React.FC = () => {
  const { t } = useTranslation();
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

  const students = React.useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((p: PaginatedResponse<Student>) => {
      const list = p.items || (Array.isArray(p) ? p : []);
      return Array.isArray(list) ? list : [];
    });
  }, [data]);
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

  const copyStudentId = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("students.copy_id_success"));
  };

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
    } catch(err: unknown) {
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent || !formName.trim()) return;
    try {
      await updateMutation.mutateAsync({ id: selectedStudent.id, name: formName.trim() });
      toast.success(t("students.identity_updated"));
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      await deleteMutation.mutateAsync(selectedStudent.id);
      toast.success(t("students.record_terminated"));
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
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

  const filteredStudents = students;

  const StudentAvatar = ({ name, color, size = "md" }: { name: string, color?: string, size?: "md" | "xl" }) => {
    const isXl = size === "xl";
    return (
      <div className={cn(
        "rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-xl bg-gradient-to-br from-[var(--ui-accent)]/20 to-black/20 text-[var(--ui-accent)]",
        isXl ? "w-20 h-20 text-2xl" : "w-12 h-12 text-sm"
      )}>
        <span className="font-bold">{name.substring(0, 2).toUpperCase()}</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] animate-fade-in overflow-hidden relative">
      {/* Decorative Zenith Glow */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[var(--ui-accent)]/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <div className="px-4 py-4 sm:px-6 md:px-8 md:pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 shrink-0 relative z-10">
        <div className="space-y-1 text-start">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t("students.title_roster")}
          </h1>
           <p className="text-slate-500 text-xs font-medium">
             {t("students.subtitle_roster")}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
           <button onClick={exportToCSV} className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl bg-white/[0.02] border border-white/5 text-[13px] font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-all">
            <Download className="w-4 h-4" /> {t("students.export_csv_btn")}
          </button>
          <button 
             onClick={openAddModal} 
             className="btn-primary h-11 sm:h-12 px-6 sm:px-8 shadow-2xl"
          >
            <Plus className="w-4 h-4" /> {t("students.enroll_cadet")}
          </button>
        </div>
      </div>

      {/* Stats Summary Area */}
      <div className="px-4 py-4 sm:px-6 sm:py-6 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 shrink-0 relative z-10">
        {[
          { label: t("students.stats.active"), value: students.length, icon: Users, color: "text-[var(--ui-accent)]", bg: "bg-[var(--ui-accent)]/5" },
          { label: t("students.stats.synced"), value: students.filter(s => s.userId).length, icon: ShieldCheck, color: "text-[var(--ui-accent)]", bg: "bg-[var(--ui-accent)]/5" },
          { label: t("students.stats.units"), value: groups.length, icon: LayoutGrid, color: "text-[var(--ui-accent)]", bg: "bg-[var(--ui-accent)]/5" },
          { label: t("students.stats.readiness"), value: "98.2%", icon: ArrowUpRight, color: "text-[var(--ui-accent)]", bg: "bg-[var(--ui-accent)]/5" }
        ].map((stat, i) => (
          <div key={i} className="card-base p-4 sm:p-6 bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl border-white/5 flex items-center justify-between group hover:border-[var(--ui-accent)]/20 transition-all shadow-xl">
            <div className="space-y-1 text-start">
               <p className="text-[10px] sm:text-xs font-medium text-slate-600">{stat.label}</p>
               <p className="text-xl sm:text-2xl font-bold text-white tracking-tight tabular-nums">{stat.value}</p>
            </div>
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 transition-all group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar & Filters */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 md:px-8 flex flex-wrap gap-3 sm:gap-6 items-center shrink-0 relative z-10">
        <div className="relative flex-1 min-w-0 w-full sm:w-auto group">
           <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within:text-[var(--ui-accent)]" />
           <input 
             placeholder={t("students.search_placeholder_roster")} 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 bg-black/40 border border-white/5 rounded-xl ps-12 pe-4 text-[13px] font-normal text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)]/30 transition-all shadow-inner"
           />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
           {selectedStudentIds.size > 0 ? (
              <div className="flex items-center gap-4 bg-[var(--ui-accent)]/10 px-4 py-2 rounded-xl border border-[var(--ui-accent)]/20 shadow-glow shadow-[var(--ui-accent)]/10 animate-fade-in">
                 <span className="text-xs font-semibold text-[var(--ui-accent)]">{selectedStudentIds.size} Selected</span>
                <div className="w-px h-4 bg-[var(--ui-accent)]/20" />
                 <button onClick={() => setIsBulkDeleteModalOpen(true)} className="flex items-center gap-2 text-xs font-semibold text-rose-500 hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /> {t("common.delete")}</button>
              </div>
           ) : (
             <button onClick={toggleAll} className="h-11 px-6 rounded-xl bg-white/[0.02] border border-white/5 text-[13px] font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-2">
               <CheckSquare className="w-4 h-4" /> {t("students.select_all")}
             </button>
           )}
           <select 
             value={filterGroup}
             onChange={(e) => setFilterGroup(e.target.value)}
              className="h-11 rounded-xl bg-black/40 border border-white/5 px-6 text-[13px] font-normal text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)]/30 transition-all"
           >
             <option value="all">{t("students.all_units")}</option>
             {groups.map((g: Group) => (
               <option key={g.id} value={g.id} className="bg-[var(--ui-sidebar-bg)]">{g.name}</option>
             ))}
           </select>
           <div className="hidden sm:block w-px h-6 bg-white/5 mx-2" />
           <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
              <button 
                onClick={() => setViewMode("grid")}
                className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all", viewMode === "grid" ? "bg-[var(--ui-accent)] text-white shadow-[0_0_15px_rgba(var(--ui-accent-rgb),0.4)]" : "text-slate-600 hover:text-slate-400")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all", viewMode === "list" ? "bg-[var(--ui-accent)] text-white shadow-[0_0_15px_rgba(var(--ui-accent-rgb),0.4)]" : "text-slate-600 hover:text-slate-400")}
              >
                <List className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full px-3 py-4 sm:px-4 md:px-6 lg:px-8 space-y-4 sm:space-y-8 animate-fade-in custom-scrollbar overflow-y-auto relative z-10">
         {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="card-base h-72 animate-pulse flex flex-col p-6 space-y-6">
                   <div className="flex items-start justify-between">
                      <div className="ps-8 w-12 h-12 rounded-xl bg-white/5" />
                   </div>
                   <div className="space-y-4 flex-1">
                      <div className="h-5 w-3/4 bg-white/5 rounded-md" />
                      <div className="h-4 w-1/2 bg-white/5 rounded-md" />
                      <div className="h-12 w-full bg-white/5 rounded-xl mt-4" />
                   </div>
                </div>
              ))}
            </div>
         ) : filteredStudents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-6">
               <Users className="w-24 h-24 text-slate-600" />
                <p className="text-sm font-semibold">{t("students.no_personnel")}</p>
            </div>
         ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 relative px-1 sm:px-2 pb-20">
               {filteredStudents.map((student) => {
                 const isSelected = selectedStudentIds.has(student.id);
                 
                 return (
                 <div 
                   key={student.id} 
                   onClick={() => setDrawerStudent(student)} 
                   className={cn(
                     "card-base relative p-6 flex flex-col transition-all duration-500 cursor-pointer overflow-hidden bg-[#0c0c0e]/80 backdrop-blur-3xl border-white/5",
                     "hover:border-[var(--ui-accent)]/40 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]",
                     isSelected && "border-[var(--ui-accent)]/50 shadow-[0_0_20px_rgba(217,70,239,0.1)] bg-[var(--ui-accent)]/5"
                   )}
                 >
                   {/* Selection Checkbox */}
                   <div className="absolute top-4 start-4 z-30" onClick={(e) => toggleSelection(student.id, e)}>
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        isSelected ? "bg-[var(--ui-accent)] border-[var(--ui-accent)]" : "border-white/10 group-hover:border-white/20"
                      )}>
                        {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                      </div>
                   </div>

                   <div className="flex items-start justify-between mb-8 relative z-20">
                      <div className="ps-8">
                         <StudentAvatar name={student.name} color={student.group?.colorTag} />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 touch-show transition-all">
                         <button onClick={(e) => { e.stopPropagation(); openDeleteModal(student); }} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-rose-500 transition-all">
                             <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                   
                   <div className="space-y-4 flex-1 text-start relative z-20 ps-1">
                      <div>
                          <h3 className="text-lg font-bold text-white truncate tracking-tight">
                           {student.name}
                         </h3>
                         <div className="flex items-center gap-2 mt-2">
                            <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-lg flex items-center gap-2 transition-all">
                                <span className="text-xs font-mono font-medium text-slate-500 leading-none">{student.uniqueStudentCode || student.studentId || t("students.id_pending")}</span>
                               <button onClick={(e) => { e.stopPropagation(); copyStudentId(student.uniqueStudentCode || student.studentId || ""); }} className="text-slate-700 hover:text-[var(--ui-accent)] transition-colors">
                                  <Copy className="w-3 h-3" />
                               </button>
                            </div>
                            {student.userId && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ui-accent)] drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]" />}
                         </div>
                      </div>

                      <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between transition-all duration-500 hover:border-[var(--ui-accent)]/20">
                         <div className="space-y-0.5">
                             <p className="text-xs font-medium text-slate-600">{t("students.deployed_node")}</p>
                             <p className="text-xs font-semibold text-slate-300">
                              {student.group?.name || t("students.reserve")}
                            </p>
                         </div>
                         <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/5">
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                         </div>
                      </div>
                   </div>
                   
                   <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between relative z-20">
                       <div className="flex items-center gap-2 text-xs font-normal text-slate-600">
                         <Clock className="w-3 h-3" />
                         {format(new Date(student.createdAt), "MMM dd, yyyy")}
                      </div>
                       <div className="h-5 px-3 rounded-md bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-xs font-medium flex items-center border border-[var(--ui-accent)]/20">
                         {t("students.operational")}
                      </div>
                   </div>
                </div>
              )})}
            </div>
         ) : (
            <div className="card-base !p-0 overflow-x-auto border-white/5 bg-[#0c0c0e]/80 backdrop-blur-3xl custom-scrollbar mb-20">
               <table className="w-full text-start min-w-[800px] border-collapse">
                  <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-xs uppercase font-semibold text-slate-500 tracking-wide">
                         <th className="w-16 px-8 py-6 text-start">
                            <div onClick={toggleAll} className="cursor-pointer">
                              <div className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? "bg-[var(--ui-accent)] border-[var(--ui-accent)]" : "border-white/10"
                              )}>
                                {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                              </div>
                            </div>
                         </th>
                         <th className="px-8 py-6 text-start">{t("students.identity_protocol")}</th>
                        <th className="px-8 py-6 text-start">{t("students.assigned_node")}</th>
                        <th className="px-8 py-6 text-center">{t("students.sync_state")}</th>
                        <th className="px-8 py-6 text-end">{t("students.task_authorization")}</th>
                     </tr>
                  </thead>
                  <tbody>
                      {filteredStudents.map((student, index) => {
                         const isSelected = selectedStudentIds.has(student.id);
                         return (
                         <tr 
                           key={student.id} 
                           onClick={() => setDrawerStudent(student)} 
                           className={cn(
                             "border-b last:border-none border-white/5 hover:bg-white/[0.01] transition-colors group cursor-pointer animate-fade-in opacity-0",
                             isSelected && "bg-[var(--ui-accent)]/5"
                           )}
                           style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                         >
                            <td className="px-8 py-6 text-start" onClick={(e) => toggleSelection(student.id, e)}>
                              <div className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                isSelected ? "bg-[var(--ui-accent)] border-[var(--ui-accent)]" : "border-white/10 group-hover:border-white/20"
                              )}>
                                {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <StudentAvatar name={student.name} color={student.group?.colorTag} />
                                 <div className="text-start">
                                     <p className="text-xs font-semibold text-white">{student.name}</p>
                                     <p className="text-xs font-mono font-normal text-slate-600">{student.uniqueStudentCode || student.studentId || t("students.id_pending")}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-start">
                              <div className="flex flex-col gap-1">
                                  <span className="text-xs font-medium text-slate-300">
                                    {student.group?.name || t("students.idle")}
                                 </span>
                                  <span className="text-xs font-normal text-slate-700">Level {student.group?.level || "N/A"}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-center">
                              {student.userId ? (
                                  <div className="inline-flex h-5 px-3 rounded-md bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-xs font-medium items-center border border-[var(--ui-accent)]/20">Synced</div>
                              ) : (
                                  <div className="inline-flex h-5 px-3 rounded-md bg-white/[0.02] text-slate-600 text-xs font-medium items-center border border-white/5">Offline</div>
                              )}
                           </td>
                            <td className="px-8 py-6 text-end">
                               <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 touch-show transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); openEditModal(student); }} className="p-2 text-slate-500 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); openDeleteModal(student); }} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                               </div>
                            </td>
                         </tr>
                      )})}
                  </tbody>
               </table>
            </div>
         )}

         {/* Infinite scroll sentinel + loading indicator */}
         {loadingMore && (
           <div className="flex justify-center py-6">
             <div className="flex items-center gap-3">
               <Loader2 className="w-5 h-5 text-[var(--ui-accent)] animate-spin" />
                <span className="text-xs font-medium text-slate-500">Accessing Cloud Records...</span>
             </div>
           </div>
         )}
         <div ref={sentinelRef} className="h-1" />
      </div>

       {/* Slide-out Intelligence Drawer */}
       <Drawer open={!!drawerStudent} onOpenChange={(open: boolean) => !open && setDrawerStudent(null)}>
         <DrawerContent className="bg-[#0c0c0e]/95 backdrop-blur-3xl border-white/5 p-4 sm:p-6 lg:p-8 max-w-full sm:max-w-2xl border-s shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-y-auto custom-scrollbar">
            {drawerStudent && (
               <div className="space-y-10 animate-fade-in duration-500">
                  <div className="flex items-start justify-between">
                     <div className="flex items-center gap-6">
                        <StudentAvatar name={drawerStudent.name} size="xl" color={drawerStudent.group?.colorTag} />
                        <div className="space-y-2 text-start">
                            <h2 className="text-3xl font-bold text-white tracking-tight">{drawerStudent.name}</h2>
                           <div className="flex items-center gap-2">
                              <Badge className="bg-black/40 border-white/5 text-slate-500 text-xs px-3 font-mono">{drawerStudent.uniqueStudentCode || drawerStudent.studentId}</Badge>
                              {drawerStudent.userId && <Badge className="bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] text-xs border-[var(--ui-accent)]/20">SYNCED</Badge>}
                           </div>
                        </div>
                     </div>
                     <button onClick={() => setDrawerStudent(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                     </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-start">
                     <div className="card-base p-6 bg-white/[0.01] border-white/5">
                         <p className="text-xs font-medium text-slate-600 mb-4">{t("students.assigned_unit")}</p>
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 flex items-center justify-center">
                              <ShieldCheck className="w-5 h-5 text-[var(--ui-accent)]" />
                           </div>
                            <p className="text-lg font-bold text-white truncate">{drawerStudent.group?.name || t("students.idle")}</p>
                        </div>
                     </div>
                     <div className="card-base p-6 bg-white/[0.01] border-white/5">
                         <p className="text-xs font-medium text-slate-600 mb-4">{t("students.sync_auth")}</p>
                        <div className="flex items-center gap-3">
                           <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", drawerStudent.userId ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/20" : "bg-white/[0.02] border-white/5")}>
                              <Zap className={cn("w-5 h-5", drawerStudent.userId ? "text-[var(--ui-accent)]" : "text-slate-700")} />
                           </div>
                            <p className="text-lg font-bold text-white">{drawerStudent.userId ? "Authorized" : "Unlinked"}</p>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                      <h4 className="text-xs font-medium text-slate-600 flex items-center gap-2">
                        <Database className="w-4 h-4 text-[var(--ui-accent)]" />
                        {t("students.system_telemetry")}
                     </h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="p-4 bg-white/[0.01] rounded-xl border border-white/5 flex flex-col gap-1">
                            <span className="text-xs text-slate-600 font-medium">{t("common.date")}</span>
                           <span className="text-[11px] text-slate-300 font-bold tracking-tight">{format(new Date(drawerStudent.createdAt), "yyyy.MM.dd")}</span>
                        </div>
                        <div className="p-4 bg-white/[0.01] rounded-xl border border-white/5 flex flex-col gap-1 overflow-hidden">
                            <span className="text-xs text-slate-600 font-medium">System ID</span>
                           <span className="text-[11px] text-slate-300 font-mono truncate">{drawerStudent.id}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-10">
                     <button onClick={() => { openEditModal(drawerStudent); setDrawerStudent(null); }} className="btn-primary flex-1 h-14">
                        {t("common.edit")}
                     </button>
                      <button className="flex-1 h-14 rounded-xl bg-white/[0.02] border border-white/5 text-[13px] font-semibold text-slate-400 hover:text-white transition-all">
                        {t("students.view_deep_logs")}
                     </button>
                  </div>
               </div>
            )}
         </DrawerContent>
       </Drawer>

       {/* Zenith Modals */}
       <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t("students.modal.add_title")}>
          <div className="space-y-8 p-2">
             <div className="p-5 bg-[var(--ui-accent)]/5 border border-[var(--ui-accent)]/10 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--ui-accent)]/10 flex items-center justify-center text-[var(--ui-accent)] border border-[var(--ui-accent)]/20 shadow-glow"><Zap className="w-5 h-5" /></div>
                 <p className="text-xs font-medium text-slate-400 leading-relaxed">{t("students.modal.add_description")}</p>
             </div>
             
             <div className="space-y-6">
                <div className="space-y-3 text-start">
                    <label className="text-xs font-medium text-slate-600 ps-1">{t("students.modal.name_label")}</label>
                   <input 
                     value={formName} 
                     onChange={(e) => setFormName(e.target.value)}
                      className="w-full h-14 bg-black/40 border border-white/5 rounded-xl px-4 text-sm font-normal text-white focus:ring-1 focus:ring-[var(--ui-accent)]/30 focus:outline-none transition-all"
                      placeholder="Enter student name"
                   />
                </div>
                <div className="space-y-3 text-start">
                    <label className="text-xs font-medium text-slate-600 ps-1">{t("students.modal.group_label")}</label>
                   <select 
                     value={formGroupId} 
                     onChange={(e) => setFormGroupId(e.target.value)}
                      className="w-full h-14 bg-black/40 border border-white/5 rounded-xl px-4 text-sm font-normal text-slate-400 focus:ring-1 focus:ring-[var(--ui-accent)]/30 focus:outline-none transition-all"
                   >
                      {groups.map(g => (
                        <option key={g.id} value={g.id} className="bg-[var(--ui-sidebar-bg)]">{g.name}</option>
                      ))}
                   </select>
                </div>
             </div>

             <div className="flex gap-4 pt-4">
                 <button className="flex-1 h-12 rounded-xl bg-white/[0.02] border border-white/5 text-[13px] font-semibold text-slate-400 hover:text-white transition-all" onClick={() => setIsAddModalOpen(false)}>
                   {t("common.cancel")}
                </button>
                <button disabled={createMutation.isPending || !formName.trim() || !formGroupId} className="btn-primary flex-1 h-12" onClick={handleCreateStudent}>
                   {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("students.modal.enroll")}
                </button>
             </div>
          </div>
       </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t("students.modal.edit_title")}>
         <div className="space-y-8 p-2 text-start">
            <div className="p-5 bg-white/[0.01] border border-white/5 rounded-xl flex items-center gap-4">
               <div className="w-10 h-10 rounded-lg bg-[var(--ui-accent)]/10 flex items-center justify-center text-[var(--ui-accent)] border border-[var(--ui-accent)]/20 shadow-glow"><ShieldCheck className="w-5 h-5" /></div>
                <p className="text-xs font-medium text-slate-400 leading-relaxed">Identity Auth: {selectedStudent?.uniqueStudentCode || t("students.id_unsaved")}</p>
            </div>
            
            <div className="space-y-3">
                <label className="text-xs font-medium text-slate-600 ps-1">{t("students.modal.update_name_label")}</label>
               <input 
                 value={formName} 
                 onChange={(e) => setFormName(e.target.value)}
                 className="w-full h-14 bg-black/40 border border-white/5 rounded-xl px-4 text-xs font-bold text-white uppercase focus:ring-1 focus:ring-[var(--ui-accent)]/30 focus:outline-none transition-all"
               />
            </div>

            <div className="flex gap-4 pt-4">
                <button className="flex-1 h-12 rounded-xl bg-white/[0.02] border border-white/5 text-[13px] font-semibold text-slate-400 hover:text-white transition-all" onClick={() => setIsEditModalOpen(false)}>
                  {t("common.cancel")}
               </button>
               <button disabled={updateMutation.isPending || !formName.trim()} className="btn-primary flex-1 h-12" onClick={handleUpdateStudent}>
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("students.modal.save")}
               </button>
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
