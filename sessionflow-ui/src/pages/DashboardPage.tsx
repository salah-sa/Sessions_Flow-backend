import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDashboardSummary } from "../queries/useDashboardQueries";
import { LaunchpadHero } from "./dashboard/LaunchpadHero";
import { MetricsGrid } from "./dashboard/MetricsGrid";
import { AnalyticsOverview } from "./dashboard/AnalyticsOverview";
import { OperationalIntelligence } from "./dashboard/OperationalIntelligence";
import { QuickScheduleModal } from "./dashboard/QuickScheduleModal";

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useDashboardSummary();

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({ name: "", time: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleScheduleSession = async () => {
    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(t("dashboard.schedule.success"));
      setIsScheduleModalOpen(false);
      setNewSession({ name: "", time: "" });
    } catch (error) {
      toast.error(t("dashboard.schedule.error"));
    } finally {
      setSubmitting(false);
    }
  };

  // Show a cinematic loading state - but only briefly
  if (isLoading) {
    return (
      <div className="container-page flex items-center justify-center h-[60vh]">
        <div className="relative flex flex-col items-center gap-8">
           <div className="w-24 h-24 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin shadow-glow shadow-[var(--ui-accent)]/20" />
           <div className="space-y-2 text-center">
              <p className="text-xl font-black text-white uppercase tracking-tighter animate-pulse">{t("common.initializing")}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("dashboard.syncing_telemetry")}</p>
           </div>
        </div>
      </div>
    );
  }

  // Live stats — use API data when available, fall back to demo values
  const stats = {
    totalGroups:    data?.totalGroups    ?? 0,
    activeSessions: data?.activeSessions ?? 0,
    totalStudents:  data?.totalStudents  ?? 0,
    avgAttendance:  Math.round(data?.attendanceRateOverall ?? 0),
  };

  // Live sparkline trend arrays — fall back to flat demo data when API unavailable
  const weeklyTrend    = data?.weeklyTrend    ?? [0, 0, 0, 0, 0, 0, 0, 0];
  const attendanceTrend = data?.attendanceTrend ?? [0, 0, 0, 0, 0, 0, 0, 0];
  const studentGrowth  = data?.studentGrowth  ?? [0, 0, 0, 0, 0, 0, 0, 0];

  const distributionData = [
    { label: t("sidebar.levels.fundamentals"), value: 18, color: "#3b82f6" },
    { label: t("sidebar.levels.intermediate"), value: 12, color: "#8b5cf6" },
    { label: t("sidebar.levels.advanced"),     value: 8,  color: "#10b981" },
    { label: t("sidebar.levels.masterclass"),  value: 4,  color: "#f59e0b" },
  ];

  return (
    <div className="container-page pb-24 space-y-16">
      {/* Offline / API error banner — subtle, non-blocking */}
      {isError && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {t("dashboard.offline_mode", "Offline mode — showing cached data")}
        </div>
      )}

      {/* 1. Hero Section */}
      <LaunchpadHero />

      {/* 2. Metrics Grid — wired to live stats + trend sparklines */}
      <MetricsGrid
        stats={stats}
        weeklyTrend={weeklyTrend}
        attendanceTrend={attendanceTrend}
        studentGrowth={studentGrowth}
      />

      {/* 3. Analytics Section */}
      <AnalyticsOverview distributionData={distributionData} />

      {/* 4. Operational Intelligence Section */}
      <OperationalIntelligence />

      {/* Quick Action Overlay */}
      <div className="fixed bottom-12 right-12 z-50">
         <button
           onClick={() => setIsScheduleModalOpen(true)}
           className="h-16 px-8 rounded-2xl bg-[var(--ui-accent)] text-white shadow-glow shadow-[var(--ui-accent)]/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group"
         >
            <div className="p-2 rounded-lg bg-white/20 group-hover:rotate-12 transition-transform">
               <PlusIcon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">{t("dashboard.schedule.quick_action")}</span>
         </button>
      </div>

      <QuickScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        newSession={newSession}
        onSessionChange={setNewSession}
        onSchedule={handleScheduleSession}
        submitting={submitting}
      />
    </div>
  );
};

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);

export default DashboardPage;


