import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDashboardSummary } from "../queries/useDashboardQueries";
import { LaunchpadHero } from "./dashboard/LaunchpadHero";
import { MetricsGrid } from "./dashboard/MetricsGrid";
import { AnalyticsOverview } from "./dashboard/AnalyticsOverview";
import { OperationalIntelligence } from "./dashboard/OperationalIntelligence";
import { QuickScheduleModal } from "./dashboard/QuickScheduleModal";
import WorldStudentMap from "../components/dashboard/WorldStudentMap";
import { GeoConsentBanner } from "../components/dashboard/GeoConsentBanner";
import { Button } from "../components/ui";
import { Plus } from "lucide-react";

import { useAuthStore } from "../store/stores";
import { StudentDashboard } from "./StudentDashboard";
import { useIPGeolocation } from "../queries/useGeoQueries";
import { useUpdateStudentLocation } from "../queries/useStudentLocationQueries";

const DashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  // Route students to their dedicated dashboard
  if (user?.role === "Student") {
    return <StudentDashboard />;
  }

  const { t } = useTranslation();
  const { data, isLoading, isError } = useDashboardSummary();
  const { setStudentLocationData, studentLocation, updateUser } = useAuthStore();
  const { mutateAsync: fetchIPGeo } = useIPGeolocation();
  const { mutate: updateBackendLocation } = useUpdateStudentLocation();

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({ name: "", time: "" });
  const [submitting, setSubmitting] = useState(false);

  // Silent Geolocation & Store Hydration
  React.useEffect(() => {
    if (!user) return;

    // 1. Hydrate store from backend user object if store is empty
    if (!studentLocation && user.latitude && user.longitude && user.city) {
      setStudentLocationData({
        city: user.city,
        lat: user.latitude,
        lng: user.longitude,
        source: 'auto',
        timestamp: Date.now()
      });
      return;
    }

    // 2. Silent detection for Engineers/Admins with missing location
    const needsDetection = !user.latitude || !user.longitude;
    if (needsDetection && !studentLocation) {
      fetchIPGeo().then(geo => {
        setStudentLocationData({
          city: geo.city,
          lat: geo.lat,
          lng: geo.lng,
          source: 'auto',
          timestamp: Date.now()
        });
        updateBackendLocation({ lat: geo.lat, lng: geo.lng, city: geo.city });
        
        // Final link: Update the user object in store so the effect doesn't re-trigger
        updateUser({ 
          ...user, 
          latitude: geo.lat, 
          longitude: geo.lng, 
          city: geo.city 
        });

        console.log(`[Telemetry] Auto-synchronized node to ${geo.city}`);
      }).catch(err => {
        console.warn("[Telemetry] Silent synchronization failed:", err);
      });
    }
  }, [user, studentLocation, setStudentLocationData, fetchIPGeo, updateBackendLocation]);

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

  if (isLoading) {
    return (
      <div className="container-page flex items-center justify-center h-[60vh]">
        <div className="relative flex flex-col items-center gap-6">
           <div className="w-16 h-16 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin shadow-glow shadow-[var(--ui-accent)]/20" />
           <div className="space-y-1.5 text-center">
              <p className="text-sm font-semibold text-white uppercase tracking-wider animate-pulse">{t("common.initializing")}</p>
              <p className="text-xs font-bold text-slate-500 uppercase">{t("dashboard.syncing_telemetry")}</p>
           </div>
        </div>
      </div>
    );
  }

  // Live stats — API data with graceful fallbacks
  const stats = {
    totalGroups:    data?.totalGroups    ?? 0,
    activeSessions: data?.activeSessions ?? 0,
    totalStudents:  data?.totalStudents  ?? 0,
    avgAttendance:  Math.round(data?.attendanceRateOverall ?? 0),
  };

  const weeklyTrend     = data?.weeklyTrend     ?? [0, 0, 0, 0, 0, 0, 0, 0];
  const attendanceTrend = data?.attendanceTrend  ?? [0, 0, 0, 0, 0, 0, 0, 0];
  const studentGrowth   = data?.studentGrowth    ?? [0, 0, 0, 0, 0, 0, 0, 0];

  const levelColors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];
  const levelKeys = ["fundamentals", "intermediate", "advanced", "masterclass"];
  
  const distributionData = [1, 2, 3, 4].map((lvl, i) => {
    const groupsAtLevel = (data?.topGroups || []).filter(g => g.level === lvl);
    const studentCount = groupsAtLevel.reduce((sum, g) => sum + g.studentCount, 0);
    return { 
      label: t(`sidebar.levels.${levelKeys[i]}`), 
      value: studentCount, 
      color: levelColors[i] 
    };
  });

  return (
    <div className="container-page pb-16 sm:pb-20 space-y-5 sm:space-y-8 lg:space-y-10 pt-4 sm:pt-6">
      {/* Offline banner */}
      {isError && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs sm:text-[11px] font-bold uppercase">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          {t("dashboard.offline_mode", "Offline — cached data")}
        </div>
      )}

      <LaunchpadHero />

      <MetricsGrid
        stats={stats}
        weeklyTrend={weeklyTrend}
        attendanceTrend={attendanceTrend}
        studentGrowth={studentGrowth}
      />

      <GeoConsentBanner />

      <WorldStudentMap />

      <AnalyticsOverview 
        distributionData={distributionData} 
        attendanceRateOverall={data?.attendanceRateOverall ?? 0}
        attendanceByLevel={data?.attendanceByLevel ?? []}
        recentActivity={data?.recentActivity ?? []}
      />

      <OperationalIntelligence 
        recentActivity={data?.recentActivity ?? []} 
        activeSessions={data?.activeSessions ?? 0}
        avgSessionDuration={data?.avgSessionDuration ?? 0}
        completionRate={data?.completionRate ?? 0}
      />


      {/* FAB — responsive positioning */}
      <div className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 lg:bottom-10 lg:right-10 z-50">
         <Button
           onClick={() => setIsScheduleModalOpen(true)}
           className="!h-12 sm:!h-14 !px-5 sm:!px-7 !rounded-2xl !bg-[var(--ui-accent)] !text-white !shadow-glow !shadow-[var(--ui-accent)]/40 group"
         >
            <div className="p-1.5 rounded-lg bg-white/20 group-hover:rotate-12 transition-transform me-3">
               <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-[11px] font-semibold hidden sm:inline">{t("dashboard.schedule.quick_action")}</span>
         </Button>
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
export default DashboardPage;
