import React, { useState, useEffect } from "react";
import { Plus, Download, Filter, Terminal, Lock, Zap, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, Badge } from "../components/ui";
import { ConfirmDeleteModal } from "../components/ui/ConfirmDeleteModal";
import { toast } from "sonner";
import { 
  useGroupQueries, 
  useCreateGroup, 
  useUpdateGroup, 
  useDeleteGroup,
  useEnrollStudent
} from "../queries/useGroupQueries";
import { Group } from "../types";
import { GroupToolbar } from "./groups/GroupToolbar";
import { GroupList } from "./groups/GroupList";
import { GroupWizard } from "./groups/GroupWizard";
import { GroupEnrollModal } from "./groups/GroupEnrollModal";
import { GroupFormValues } from "./groups/GroupConstants";
import { useAuthStore } from "../store/stores";
import { getTierLimits } from "../lib/limits";
import { cn } from "../lib/utils";

const GroupsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGroupQueries();
  const groups = data?.pages.flatMap(page => page.items) || [];
  const totalGroupCount = data?.pages[0]?.totalCount ?? groups.length;

  const user = useAuthStore(s => s.user);
  const limits = getTierLimits(user?.subscriptionTier, user?.role);
  const groupLimitReached = user?.role === "Admin" ? false : totalGroupCount >= limits.maxGroups;

  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const enrollStudent = useEnrollStudent();

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || group.status === statusFilter;
    const matchesDay = dayFilter === null || group.schedules?.some(s => s.dayOfWeek === dayFilter);
    return matchesSearch && matchesStatus && matchesDay;
  });

  const handleOpenCreate = () => {
    if (groupLimitReached) {
      toast.error(`Group limit reached (${limits.maxGroups}). Upgrade your plan for more.`, {
        icon: <Lock className="w-4 h-4 text-rose-500" />,
        action: {
          label: "Upgrade",
          onClick: () => navigate("/plans"),
        },
      });
      return;
    }
    setModalMode("create");
    setSelectedGroup(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: Group) => {
    setModalMode("edit");
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleDelete = (group: Group) => {
    setDeleteTarget(group);
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGroup.mutateAsync(deleteTarget.id);
      toast.success(t("groups.delete_success"));
      setDeleteTarget(null);
    } catch (error: any) {
      // Surface the specific backend message (e.g. "Cannot delete group while a session is ACTIVE")
      toast.error(error?.message || t("groups.delete_error"));
    }
  };

  const handleWizardSubmit = async (data: GroupFormValues) => {
    try {
      if (modalMode === "create") {
        await createGroup.mutateAsync(data);
        toast.success(t("groups.create_success"));
      } else if (selectedGroup) {
        await updateGroup.mutateAsync({ id: selectedGroup.id, data });
        toast.success(t("groups.update_success"));
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error?.message || t("groups.error_generic"));
    }
  };

  const handleOpenEnroll = (group: Group) => {
    setSelectedGroup(group);
    setNewStudentName("");
    setIsEnrollModalOpen(true);
  };

  const handleEnrollSubmit = async () => {
    if (!selectedGroup || !newStudentName.trim()) return;
    try {
      await enrollStudent.mutateAsync({ groupId: selectedGroup.id, name: newStudentName });
      toast.success(t("groups.enroll_success"));
      setIsEnrollModalOpen(false);
    } catch (error) {
      toast.error(t("groups.enroll_error"));
    }
  };

  // Infinite scroll logic
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="container-page pb-20 space-y-6 md:space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-30">
        <div className="space-y-3 md:space-y-4 animate-in fade-in slide-in-from-left-8 duration-1000">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ui-accent/10 text-ui-accent text-[10px] sm:text-xs font-semibold border border-ui-accent/20 shadow-glow shadow-ui-accent/5">
              <Terminal className="w-3 h-3" />
              {t("groups.system_active")}
            </div>
            <div className="h-px w-6 sm:w-8 bg-white/10" />
            <span className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tabular-nums">{totalGroupCount} {t("groups.card.groups_registered")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-semibold text-white tracking-tighter uppercase leading-[0.85]">
            {t("groups.title")}
          </h1>
        </div>

        <div className="flex flex-col w-full sm:w-auto gap-3 animate-in fade-in slide-in-from-right-8 duration-1000">
          {/* Group Quota Indicator */}
          {user?.role === "Engineer" && (
            <div className={cn(
              "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium self-end",
              groupLimitReached 
                ? "bg-rose-500/5 border-rose-500/30 text-rose-400" 
                : "bg-white/[0.03] border-white/10 text-slate-300"
            )}>
              <Zap className={cn("w-4 h-4", groupLimitReached ? "text-rose-500" : "text-amber-500")} />
              <span>
                Groups: <span className={cn("font-bold tabular-nums", groupLimitReached ? "text-rose-400" : "text-white")}>{totalGroupCount}</span> / {limits.maxGroups}
              </span>
              {groupLimitReached && (
                <button 
                  onClick={() => navigate("/plans")} 
                  className="flex items-center gap-1 text-[10px] font-bold text-ui-accent uppercase tracking-widest hover:underline ms-2"
                >
                  Upgrade <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="flex w-full sm:w-auto gap-3 sm:gap-4">
            <Button variant="secondary" size="lg" className="flex-1 sm:flex-none !h-11 !px-4 sm:!h-14 sm:!px-8 group">
               <Download className="w-5 h-5 sm:me-2 text-slate-500 group-hover:text-white transition-colors" />
               <span className="hidden sm:inline">{t("common.export")}</span>
               <span className="sm:hidden">{t("common.export").split(' ')[0]}</span>
            </Button>
            <Button 
              onClick={handleOpenCreate} 
              variant="primary" 
              size="lg" 
              disabled={groupLimitReached}
              className={cn(
                "flex-1 sm:flex-none !h-11 !px-4 sm:!h-14 sm:!px-8",
                groupLimitReached 
                  ? "!opacity-50 !cursor-not-allowed !shadow-none" 
                  : "!shadow-glow !shadow-ui-accent/20"
              )}
            >
               {groupLimitReached ? <Lock className="w-5 h-5 sm:me-2" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6 sm:me-2" />}
               <span className="truncate">{groupLimitReached ? "Limit Reached" : t("groups.action_create")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar Section */}
      <GroupToolbar 
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dayFilter={dayFilter}
        onDayFilterChange={setDayFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content Area */}
      <GroupList 
        groups={filteredGroups}
        loading={isLoading}
        viewMode={viewMode}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onAddStudent={handleOpenEnroll}
      />

      {/* Modals */}
      <GroupWizard 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        selectedGroup={selectedGroup}
        onSubmit={handleWizardSubmit}
        submitting={createGroup.isPending || updateGroup.isPending}
      />

      <GroupEnrollModal 
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        selectedGroup={selectedGroup}
        newStudentName={newStudentName}
        onNameChange={setNewStudentName}
        onEnroll={handleEnrollSubmit}
        submitting={enrollStudent.isPending}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
        isLoading={deleteGroup.isPending}
        title={t("groups.delete_modal_title") || "Delete Group"}
        description={t("groups.delete_modal_desc") || "This will archive the group and all its associated data. This action cannot be easily undone."}
        entityName={deleteTarget?.name}
        confirmText="DELETE"
      />
    </div>
  );
};

export default GroupsPage;
