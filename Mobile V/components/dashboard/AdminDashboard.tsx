import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Pressable
} from "react-native";
import { theme } from "../../shared/theme";
import { useDashboardSummary } from "../../shared/queries/useDashboardQueries";
import { useAuthStore } from "../../shared/store/stores";
import { AdaptiveHeader } from "../layout/AdaptiveHeader";
import Animated, { 
  useSharedValue, 
  FadeInDown, 
} from "react-native-reanimated";
import { GlassView } from "../ui/GlassView";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { ActivityFeedWidget } from "./ActivityFeedWidget";
import { haptics } from "../../shared/lib/haptics";
import Svg, { Path, Defs, LinearGradient, Stop, Polyline, Circle } from "react-native-svg";
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Activity, 
  Calendar, 
  Clock, 
  CheckCircle,
  Plus,
  Rocket
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../shared/queries/keys";
import { router } from "expo-router";
import { format } from "date-fns";
import { useAnimatedPress } from "../../shared/hooks/useAnimatedPress";

const Sparkline = ({ data = [30, 50, 40, 70, 55, 80, 65, 90], color = "#10b981", id = "default" }) => {
  const max = Math.max(...data, 1);
  const normalized = data.map(v => Math.max(0, Math.min(30, (v / max) * 30 + 10)));
  const points = normalized.map((v, i) => `${(i / (normalized.length - 1)) * 100},${40 - v}`).join(" ");
  const areaPath = `M0,40 L${normalized.map((v, i) => `${(i / (normalized.length - 1)) * 100},${40 - v}`).join(" L")} L100,40 Z`;

  return (
    <Svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#grad-${id})`} />
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const CairoClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <Text style={styles.timeTextValue}>{format(time, "HH:mm:ss")}</Text>;
};

const DonutChart = ({ segments }: { segments: {label: string, value: number, color: string}[] }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cumulativePercent = 0;
  
  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutRingBox}>
        <Svg viewBox="0 0 42 42" width="140" height="140" style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx="21" cy="21" r="15.5" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
          {segments.map((seg, i) => {
            const percent = (seg.value / total) * 100;
            const dashArray = `${percent} ${100 - percent}`;
            const dashOffset = -cumulativePercent;
            cumulativePercent += percent;
            return (
              <Circle 
                key={i}
                cx="21" cy="21" r="15.5" 
                fill="transparent"
                stroke={seg.color}
                strokeWidth="3.5"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
        <View style={styles.donutCenterText}>
          <Text style={styles.donutTotal}>{total}</Text>
          <Text style={styles.donutLabel}>TOTAL</Text>
        </View>
      </View>
      <View style={styles.donutLegend}>
        {segments.map((seg, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendText}>{seg.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const StatCard = ({ stat, index }: { stat: any, index: number }) => {
  const { animatedStyle, pressHandlers } = useAnimatedPress({ scale: 0.96 });
  return (
    <Animated.View entering={FadeInDown.delay(200 + (index * 100)).duration(600)} style={[styles.kpiCardWrapper, { width: "48%" }]}>
      <Animated.View style={animatedStyle}>
        <Pressable 
          {...pressHandlers}
          onPress={() => {
            haptics.selection();
            if(stat.route) router.push(stat.route);
          }}
        >
          <GlassView intensity={20} style={styles.kpiCard}>
            <View style={[styles.kpiGlowLine, { backgroundColor: stat.color }]} />
            
            <View style={styles.kpiHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kpiLabel}>{stat.label}</Text>
                <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
              </View>
              <View style={[styles.iconBox, { backgroundColor: `${stat.color}15` }]}>
                <stat.icon color={stat.color} size={18} />
              </View>
            </View>

            <View style={styles.sparklineContainer}>
              <Sparkline data={stat.sparkData} color={stat.color} id={`spark-${index}`} />
            </View>

            <Text style={[styles.kpiTrend, { color: stat.color }]}>{stat.trend}</Text>
          </GlassView>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

export const AdminDashboard = () => {
  const { data, isLoading, error, refetch, isRefetching } = useDashboardSummary();
  const user = useAuthStore((s) => s.user);
  const scrollY = useSharedValue(0);
  const queryClient = useQueryClient();

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  const isAdmin = user?.role === "Admin";
  const summaryData = data || {} as any;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AdaptiveHeader title="Initializing..." scrollY={scrollY} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <Skeleton width={120} height={36} borderRadius={8} />
            <Skeleton width={100} height={36} borderRadius={8} />
          </View>
          <View style={styles.kpiGrid}>
            <Skeleton width="48%" height={140} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="48%" height={140} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="48%" height={140} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="48%" height={140} borderRadius={16} style={{ marginBottom: 16 }} />
          </View>
        </ScrollView>
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

  const stats = [
    { 
      id: "groups", label: "Total Groups", 
      value: summaryData.totalGroups || 0, trend: `${summaryData.completedGroups || 0} Completed`,
      sparkData: summaryData.weeklyTrend || [20,30,40,25,50,45,60],
      icon: Users, color: "#10b981", route: "/(tabs)/groups"
    },
    { 
      id: "students", label: "Total Students", 
      value: summaryData.totalStudents || 0, trend: "Enrolled",
      sparkData: summaryData.studentGrowth || [10,15,40,35,50,65,80],
      icon: GraduationCap, color: "#8b5cf6", route: "/(tabs)/students"
    },
    isAdmin ? { 
      id: "revenue", label: "Total Revenue", 
      value: `EGP ${(summaryData.totalRevenue || 0).toLocaleString()}`, trend: `EGP ${(summaryData.monthlyAttendance?.revenue || 0).toLocaleString()} This Month`,
      sparkData: (summaryData.weeklyTrend || [20,30,40,25,50,45,60]).map((v: number) => v * 100),
      icon: TrendingUp, color: "#10b981", route: "/(tabs)/history"
    } : null,
    { 
      id: "active", label: "Active Sessions", 
      value: summaryData.activeSessions || 0, trend: "Live Now",
      sparkData: summaryData.weeklyTrend || [1,3,2,5,4,2,6],
      icon: Activity, color: "#f59e0b", route: "/(tabs)/timetable"
    },
    { 
      id: "today", label: "Today Sessions", 
      value: summaryData.todaySessions || 0, trend: "Today",
      sparkData: summaryData.weeklyTrend || [2,3,4,1,5,3,4],
      icon: Calendar, color: "#06b6d4", route: "/(tabs)/timetable"
    },
    { 
      id: "completed", label: "All Completed", 
      value: summaryData.completedSessionsAllTime || 0, trend: "All Time",
      sparkData: summaryData.attendanceTrend || [10,20,15,30,25,40,50],
      icon: CheckCircle, color: "#10b981", route: "/(tabs)/history"
    },
  ].filter(Boolean) as any[];

  const totalG = summaryData.totalGroups || 1;
  const rawSegments = [
    { label: "Level 1", value: Math.floor(totalG * 0.4), color: "#10b981" },
    { label: "Level 2", value: Math.floor(totalG * 0.3), color: "#8b5cf6" },
    { label: "Level 3", value: Math.floor(totalG * 0.2), color: "#06b6d4" },
    { label: "Level 4", value: Math.ceil(totalG * 0.1), color: "#f59e0b" },
  ];
  const segments = rawSegments.every(r => r.value === 0) ? [{ label: "Level 1", value: 1, color: "#10b981" }] : rawSegments;

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
        {summaryData.totalGroups === 0 ? (
          <Animated.View entering={FadeInDown.duration(800)}>
            <GlassView intensity={30} style={styles.emptyHero}>
              <Rocket color={theme.colors.success} size={48} style={{ opacity: 0.8, marginBottom: 16 }} />
              <Text style={styles.heroTitle}>READY FOR INITIALIZATION</Text>
              <Text style={styles.heroSubtitle}>
                Your operational environment is primed. Launch your first group to begin synchronizing sessions.
              </Text>
              <Button title="ESTABLISH FIRST NODE" onPress={() => router.push("/(tabs)/groups")} />
            </GlassView>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.headerRow}>
              <View style={styles.timeCard}>
                <View style={styles.timeIconWrap}>
                   <Clock color={theme.colors.success} size={14} />
                </View>
                <View style={styles.timeTextCol}>
                   <Text style={styles.timeLabel}>CAIRO TIME</Text>
                   <CairoClock />
                </View>
              </View>
              <TouchableOpacity style={styles.createBtn} activeOpacity={0.8} onPress={() => {
                haptics.impact();
                router.push("/(tabs)/timetable");
              }}>
                <Plus color="#fff" size={14} />
                <Text style={styles.createBtnText}>SCHEDULE</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.kpiGrid}>
              {stats.map((stat, i) => (
                <StatCard key={stat.id} stat={stat} index={i} />
              ))}
            </View>

            <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.section}>
              <Text style={styles.sectionTitle}>SYSTEM ANALYTICS</Text>
              <GlassView intensity={20} style={styles.analyticsCard}>
                <View style={styles.barBlock}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barLabel}>ATTENDANCE RATE</Text>
                    <Text style={[styles.barValue, { color: theme.colors.success }]}>
                      {Math.round((summaryData.attendanceRateOverall || 0.85) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${Math.round((summaryData.attendanceRateOverall || 0.85) * 100)}%`, backgroundColor: theme.colors.success }]} />
                  </View>
                </View>
                <View style={[styles.barBlock, { marginTop: 24 }]}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barLabel}>COMPLETION RATE</Text>
                    <Text style={[styles.barValue, { color: theme.colors.info }]}>
                      {Math.round((summaryData.completionRate || 0.60) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${Math.round((summaryData.completionRate || 0.60) * 100)}%`, backgroundColor: theme.colors.info }]} />
                  </View>
                </View>
              </GlassView>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(700).duration(800)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>GROUP DISTRIBUTION</Text>
              </View>
              <GlassView intensity={20} style={styles.analyticsCard}>
                <DonutChart segments={segments} />
              </GlassView>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.section}>
              <Text style={styles.sectionTitle}>RECENT OPERATIONS</Text>
              <GlassView intensity={20} style={styles.analyticsCard}>
                <ActivityFeedWidget activities={summaryData.recentActivity || []} />
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
  scrollContent: {
    paddingTop: 110,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  emptyHero: {
    padding: 32,
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
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
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
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  timeIconWrap: {
    padding: 6,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: theme.radius.sm,
    marginRight: 10,
  },
  timeTextCol: {
    justifyContent: "center",
  },
  timeLabel: {
    fontSize: 8,
    fontFamily: theme.typography.label.fontFamily,
    color: "rgba(16, 185, 129, 0.7)",
    letterSpacing: 2,
    marginBottom: 2,
  },
  timeTextValue: {
    fontSize: 16,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.text,
    lineHeight: 18,
    letterSpacing: -0.5,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    marginLeft: 6,
    letterSpacing: 2,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  kpiCardWrapper: {
    marginBottom: 16,
  },
  kpiCard: {
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    position: "relative",
    overflow: "hidden",
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
    marginBottom: 0,
  },
  kpiLabel: {
    fontSize: 9,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 26,
    fontFamily: theme.typography.h2.fontFamily,
    color: theme.colors.text,
    letterSpacing: -1,
    marginBottom: 8,
  },
  iconBox: {
    padding: 8,
    borderRadius: 8,
  },
  sparklineContainer: {
    height: 40,
    marginBottom: 8,
    marginHorizontal: -8,
  },
  kpiTrend: {
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 2,
  },
  analyticsCard: {
    padding: 24,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  barBlock: {
    width: "100%",
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 9,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 1.5,
  },
  barValue: {
    fontSize: 16,
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
  },
  donutContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  donutRingBox: {
    position: "relative",
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  donutCenterText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  donutTotal: {
    fontSize: 32,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.text,
    letterSpacing: -1,
  },
  donutLabel: {
    fontSize: 9,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 2,
    marginTop: 2,
  },
  donutLegend: {
    marginLeft: 32,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    fontSize: 11,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 1,
  }
});
