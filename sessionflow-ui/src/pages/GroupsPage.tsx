import React, { useState, useEffect } from "react";
import { Plus, Download, Filter, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui";
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

const GroupsPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGroupQueries();
  const groups = data?.pages.flatMap(page => page.items) || [];

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
    setModalMode("create");
    setSelectedGroup(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: Group) => {
    setModalMode("edit");
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleDelete = async (group: Group) => {
    if (window.confirm(t("groups.delete_confirm", { name: group.name }))) {
      try {
        await deleteGroup.mutateAsync(group.id);
        toast.success(t("groups.delete_success"));
      } catch (error) {
        toast.error(t("groups.delete_error"));
      }
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
    } catch (error) {
      toast.error(t("groups.error_generic"));
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
        <div className="space-y-4 animate-in fade-in slide-in-from-left-8 duration-1000">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ui-accent/10 text-ui-accent text-xs font-semibold border border-ui-accent/20 shadow-glow shadow-ui-accent/5">
              <Terminal className="w-3 h-3" />
              {t("groups.system_active")}
            </div>
            <div className="h-px w-8 bg-white/10" />
            <span className="text-xs font-semibold text-slate-600 uppercase tabular-nums">{data?.pages[0]?.totalCount ?? groups.length} {t("groups.card.groups_registered")}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-semibold text-white tracking-tighter uppercase leading-[0.85]">
            {t("groups.title")}
          </h1>
        </div>

        <div className="flex gap-4 animate-in fade-in slide-in-from-right-8 duration-1000">
          <Button variant="secondary" size="lg" className="!h-11 !px-5 sm:!h-14 sm:!px-8 group">
             <Download className="w-5 h-5 me-2 text-slate-500 group-hover:text-white transition-colors" />
             {t("common.export")}
          </Button>
          <Button onClick={handleOpenCreate} variant="primary" size="lg" className="!h-11 !px-5 sm:!h-14 sm:!px-8 !shadow-glow !shadow-ui-accent/20">
             <Plus className="w-6 h-6 me-2" />
             {t("groups.action_create")}
          </Button>
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
    </div>
  );
};

export default GroupsPage;
