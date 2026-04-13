import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Dimensions
} from "react-native";
import { theme } from "../../shared/theme";
import { useDashboardSummary } from "../../shared/queries/useDashboardQueries";
import { useAuthStore } from "../../shared/store/stores";
import { AdaptiveHeader } from "../layout/AdaptiveHeader";
import Animated, { 
  useSharedValue, 
  FadeInDown, 
  useAnimatedStyle,
  interpolate,
  Extrapolate
} from "react-native-reanimated";
import { GlassView } from "../ui/GlassView";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { haptics } from "../../shared/lib/haptics";
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Activity, 
  Calendar, 
  Clock, 
  CheckCircle,
  Plus
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../shared/queries/keys";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

export const AdminDashboard = () => {
  const { data, isLoading, error, refetch, isRefetching } = useDashboardSummary();
  const user = useAuthStore((s) => s.user);
  const scrollY = useSharedValue(0);
  const queryClient = useQueryClient();

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  const isAdmin = user?.role === "Admin";

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Skeleton width="100%" height={80} borderRadius={20} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Skeleton width="48%" height={120} borderRadius={20} style={{ marginBottom: 15 }} />
          <Skeleton width="48%" height={120} borderRadius={20} style={{ marginBottom: 15 }} />
          <Skeleton width="48%" height={120} borderRadius={20} style={{ marginBottom: 15 }} />
          <Skeleton width="48%" height={120} borderRadius={20} style={{ marginBottom: 15 }} />
        </View>
        <Skeleton width="100%" height={200} borderRadius={20} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <EmptyState 
          icon="alert-circle-outline"
          title="Telemetry Lost"
          description={(error as any)?.message || "Failed to retrieve command center telemetry."}
        />
        <Button 
          title="Retry Connection" 
          onPress={() => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })}
          style={{ width: '80%', marginTop: 20 }}
        />
      </View>
    );
  }

  // Phase 19: KPI Cards Array logic based on desktop
  const stats = [
    { 
      id: "groups",
      label: "Total Groups", 
      value: data?.totalGroups || 0, 
      trend: `${data?.completedGroups || 0} Completed`,
      icon: Users, 
      color: "#10b981",
      route: "/(tabs)/groups"
    },
    { 
      id: "students",
      label: "Total Students", 
      value: data?.totalStudents || 0, 
      trend: "Enrolled",
      icon: GraduationCap, 
      color: "#8b5cf6",
      route: "/(tabs)/students"
    },
    isAdmin ? { 
      id: "revenue",
      label: "Total Revenue", 
      value: `EGP ${(data?.totalRevenue || 0).toLocaleString()}`, 
      trend: `EGP ${(data?.monthlyAttendance?.revenue || 0).toLocaleString()} This Month`,
      icon: TrendingUp, 
      color: "#10b981",
      route: "/(tabs)/history"
    } : null,
    { 
      id: "active",
      label: "Active Sessions", 
      value: data?.activeSessions || 0, 
      trend: "Live Now",
      icon: Activity, 
      color: "#f59e0b",
      route: "/(tabs)/timetable"
    },
    { 
      id: "today",
      label: "Today Sessions", 
      value: data?.todaySessions || 0, 
      trend: "Today",
      icon: Calendar, 
      color: "#06b6d4",
      route: "/(tabs)/timetable"
    },
    { 
      id: "completed",
      label: "All Completed", 
      value: data?.completedSessionsAllTime || 0, 
      trend: "All Time",
      icon: CheckCircle, 
      color: "#10b981",
      route: "/(tabs)/history"
    },
  ].filter(Boolean) as any[];

  return (
    <View style={styles.container}>
      <AdaptiveHeader title={`Welcome, ${user?.name?.split(' ')[0] || "Operator"}`} scrollY={scrollY} />
      
      <ScrollView 
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={() => {
              haptics.impact();
              refetch();
            }} 
            tintColor={theme.colors.primary} 
          />
        }
      >
        {data?.totalGroups === 0 ? (
          <Animated.View entering={FadeInDown.duration(800)}>
            <GlassView intensity={30} style={styles.emptyHero}>
              <Text style={styles.heroTitle}>READY FOR INITIALIZATION</Text>
              <Text style={styles.heroSubtitle}>
                Your operational environment is primed. Launch your first group to begin synchronizing sessions.
              </Text>
              <Button title="ESTABLISH FIRST NODE" onPress={() => router.push("/(tabs)/groups")} />
            </GlassView>
          </Animated.View>
        ) : (
          <>
            {/* Quick Actions (Floating or inline based on mobile UX) */}
            <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.headerRow}>
              <View style={styles.timeCard}>
                <Clock color={theme.colors.primary} size={16} />
                <Text style={styles.timeText}>SYSTEM ACTIVE</Text>
              </View>
              <TouchableOpacity style={styles.createBtn} onPress={() => {
                haptics.impact();
                // Replace with modal or route to quick create session
                router.push("/(tabs)/timetable");
              }}>
                <Plus color="#fff" size={16} />
                <Text style={styles.createBtnText}>SCHEDULE</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* KPI Grid */}
            <View style={styles.kpiGrid}>
              {stats.map((stat, i) => (
                <Animated.View 
                  key={stat.id} 
                  entering={FadeInDown.delay(200 + (i * 100)).duration(600)}
                  style={styles.kpiCardWrapper}
                >
                  <TouchableOpacity onPress={() => router.push(stat.route)} activeOpacity={0.8}>
                    <GlassView intensity={20} style={styles.kpiCard}>
                      <View style={[styles.kpiGlowLine, { backgroundColor: stat.color }]} />
                      
                      <View style={styles.kpiHeader}>
                        <View>
                          <Text style={styles.kpiLabel}>{stat.label}</Text>
                          <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
                        </View>
                        <View style={[styles.iconBox, { backgroundColor: `${stat.color}15` }]}>
                          <stat.icon color={stat.color} size={20} />
                        </View>
                      </View>

                      <Text style={[styles.kpiTrend, { color: stat.color }]}>{stat.trend}</Text>
                    </GlassView>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>

            {/* System Analytics (Attendance) */}
            <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.section}>
              <Text style={styles.sectionTitle}>SYSTEM ANALYTICS</Text>
              <GlassView intensity={20} style={styles.analyticsCard}>
                
                {/* Visual Attendance Bar for Mobile */}
                <View style={styles.barBlock}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barLabel}>ATTENDANCE RATE</Text>
                    <Text style={[styles.barValue, { color: theme.colors.primary }]}>
                      {Math.round((data?.attendanceRateOverall || 0) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${Math.round((data?.attendanceRateOverall || 0) * 100)}%`, backgroundColor: theme.colors.primary }]} />
                  </View>
                </View>

                {/* Completion Rate Bar */}
                <View style={[styles.barBlock, { marginTop: 20 }]}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barLabel}>COMPLETION RATE</Text>
                    <Text style={[styles.barValue, { color: theme.colors.info }]}>
                      {Math.round((data?.completionRate || 0) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${Math.round((data?.completionRate || 0) * 100)}%`, backgroundColor: theme.colors.info }]} />
                  </View>
                </View>
              </GlassView>
            </Animated.View>

          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  loadingContainer: {
    flex: 1,
    padding: theme.spacing.lg,
    paddingTop: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  scrollContent: {
    paddingTop: 110,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  emptyHero: {
    padding: 24,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    marginTop: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: theme.typography.h2.fontFamily,
    color: theme.colors.text,
    marginBottom: 10,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: theme.colors.textDim,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  timeText: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.primary,
    marginLeft: 6,
    letterSpacing: 1,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: 1,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  kpiCardWrapper: {
    width: "48%",
    marginBottom: 16,
  },
  kpiCard: {
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    position: "relative",
    overflow: "hidden",
    minHeight: 110,
  },
  kpiGlowLine: {
    position: "absolute",
    top: 0,
    left: "20%",
    right: "20%",
    height: 1,
    opacity: 0.6,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontFamily: theme.typography.h2.fontFamily,
    color: theme.colors.text,
  },
  iconBox: {
    padding: 6,
    borderRadius: 8,
  },
  kpiTrend: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: "auto",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 2,
    marginBottom: 16,
  },
  analyticsCard: {
    padding: 20,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  barBlock: {
    width: "100%",
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1,
  },
  barValue: {
    fontSize: 14,
    fontFamily: theme.typography.h3.fontFamily,
  },
  barBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  }
});
