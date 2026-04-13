import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl
} from "react-native";
import { theme } from "../../shared/theme";
import { useStudentDashboard } from "../../shared/queries/useStudentDashboard";
import { AdaptiveHeader } from "../layout/AdaptiveHeader";
import Animated, { 
  useSharedValue, 
  FadeInDown, 
  useAnimatedStyle, 
  interpolate,
  Extrapolate,
  SharedValue
} from "react-native-reanimated";
import { Avatar } from "../ui/Avatar";
import { GlassView } from "../ui/GlassView";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { CircularProgress } from "../ui/CircularProgress";
import { LiveSessionTile } from "./LiveSessionTile";
import { haptics } from "../../shared/lib/haptics";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../shared/queries/keys";

export const StudentDashboard = () => {
  const { data, isLoading, error, refetch, isRefetching } = useStudentDashboard();
  const scrollY = useSharedValue(0);
  const queryClient = useQueryClient();

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AdaptiveHeader title="Initializing..." scrollY={scrollY} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Skeleton */}
          <View style={[styles.header, { marginBottom: 32 }]}>
            <Skeleton width={80} height={80} borderRadius={40} />
            <View style={styles.headerInfo}>
              <Skeleton width={120} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width={200} height={28} borderRadius={6} style={{ marginBottom: 8 }} />
              <Skeleton width={160} height={14} borderRadius={4} />
            </View>
          </View>
          
          {/* Directive Card Skeleton */}
          <Skeleton width="100%" height={140} borderRadius={24} style={{ marginBottom: 32 }} />

          {/* Progress Card Skeleton */}
          <View style={styles.section}>
            <Skeleton width={130} height={12} borderRadius={4} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={160} borderRadius={24} />
          </View>

          {/* Timeline Skeletons */}
          <View style={styles.section}>
            <Skeleton width={150} height={12} borderRadius={4} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
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
          title="Identity Resolution Failed"
          description={error?.message || "Your student records could not be verified."}
        />
        <Button 
          title="Retry Validation" 
          onPress={() => queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.data })}
          style={{ width: '80%', marginTop: 20 }}
        />
      </View>
    );
  }

  if (!data) return null;
  const { identity, progress, primaryAction, timeline } = data;

  return (
    <View style={styles.container}>
      <AdaptiveHeader title={identity?.name || "Dashboard"} scrollY={scrollY} />
      
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
        {/* Header Region */}
        <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.header}>
          <Avatar 
            userId={identity.studentId} 
            name={identity.name} 
            avatarUrl={identity.avatarUrl} 
            size={80} 
          />
          <View style={styles.headerInfo}>
            <Text style={styles.roleTag}>STUDENT OPERATOR</Text>
            <Text style={styles.nameText}>{identity.name}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="git-branch-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.metaText}>{identity.groupName}</Text>
              <View style={styles.dot} />
              <Text style={styles.metaText}>Level {identity.level}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Priority Directive Card */}
        <Animated.View entering={FadeInDown.delay(300).duration(800)}>
          <GlassView intensity={40} style={styles.directiveCard}>
            <View style={styles.directiveContent}>
              <View style={styles.directiveHeader}>
                <Ionicons name="flash" size={16} color={theme.colors.primary} />
                <Text style={styles.directiveTag}>PRIORITY DIRECTIVE</Text>
              </View>
              <Text style={styles.directiveTitle}>{primaryAction?.label || "No current directive"}</Text>
              
              <Button 
                title="ENTER OPERATIONS" 
                onPress={() => router.push("/(tabs)/groups")} 
                style={styles.ctaBtn}
              />
            </View>
          </GlassView>
        </Animated.View>

        {/* Course Trajectory (Progress) */}
        <Animated.View entering={FadeInDown.delay(500).duration(800)} style={styles.section}>
          <GlassView intensity={20} style={styles.progressCard}>
            <View style={styles.progressRow}>
              <View style={styles.progressTextCol}>
                <Text style={styles.sectionTitle}>COURSE TRAJECTORY</Text>
                <Text style={styles.progressPercent}>{progress.percentage.toFixed(0)}%</Text>
                <Text style={styles.progressStats}>{progress.completed} / {progress.total} COMPLETE</Text>
                <View style={{ marginTop: 12 }}>
                  <Badge variant="info" style={{ alignSelf: 'flex-start' }}>
                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                      {progress.remaining} EXP TO LEVEL UP
                    </Text>
                  </Badge>
                </View>
              </View>
              <View style={styles.progressRingCol}>
                <CircularProgress percentage={progress.percentage} level={identity.level} size={110} />
              </View>
            </View>
          </GlassView>
        </Animated.View>

        {/* Live Session Priority Tile */}
        {(() => {
          // Find Active or nearest Scheduled session
          const activeOrNext = timeline.find((s: any) => s.status === 'Active' || s.status === 'Scheduled');
          if (!activeOrNext) return null;
          return <LiveSessionTile session={activeOrNext} />;
        })()}

        {/* Timeline (Sessions) */}
        <Animated.View entering={FadeInDown.delay(700).duration(800)} style={styles.section}>
          <Text style={styles.sectionTitle}>OPERATIONAL TIMELINE</Text>
          {timeline.map((session: any, index: number) => {
            return (
              <TimelineItem 
                key={session.id} 
                session={session} 
                index={index}
                scrollY={scrollY}
              />
            );
          })}
          {timeline.length === 0 && (
            <EmptyState title="No sessions yet" description="Your timeline is awaiting generation." />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

interface TimelineItemProps {
  session: any;
  index: number;
  scrollY: SharedValue<number>;
}

const TimelineItem = ({ session, index, scrollY }: TimelineItemProps) => {
  const itemHeight = 84; 
  const itemOffset = 600 + (index * itemHeight);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [itemOffset - 300, itemOffset - 100, itemOffset + 100, itemOffset + 300],
      [0.9, 1, 1, 0.9],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [itemOffset - 300, itemOffset - 100, itemOffset + 100, itemOffset + 300],
      [0.4, 1, 1, 0.4],
      Extrapolate.CLAMP
    );
    return { transform: [{ scale }], opacity };
  });

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity 
        onPress={() => {
          haptics.selection();
          router.push(`/(tabs)/sessions/${session.id}`);
        }}
        style={styles.timelineItem}
        activeOpacity={0.7}
      >
        <View style={[
          styles.timelineIcon, 
          session.status === "Ended" ? styles.sessionEnded : styles.sessionUpcoming
        ]}>
          <Ionicons 
            name={session.status === "Ended" ? "checkmark-circle" : "time-outline"} 
            size={24} 
            color={session.status === "Ended" ? theme.colors.success : theme.colors.textDim} 
          />
        </View>
        <View style={styles.timelineInfo}>
          <Text style={styles.sessionTitle}>Session #{session.number}</Text>
          <Text style={styles.sessionDate}>{format(new Date(session.scheduledAt), "MMMM d, h:mm a")}</Text>
        </View>
        <Badge 
          variant={session.status === "Ended" ? "success" : "warning"}
          style={{ height: 20, paddingHorizontal: 8 }}
        >
          <Text style={styles.badgeText}>{session.status === "Ended" ? "DONE" : "WAITING"}</Text>
        </Badge>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  scrollContent: {
    paddingTop: 110,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  headerInfo: {
    marginLeft: 20,
    flex: 1,
  },
  roleTag: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  nameText: {
    fontSize: 28,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginLeft: 6,
    fontWeight: "600",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 10,
  },
  directiveCard: {
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.15)",
  },
  directiveContent: {
    padding: 10,
  },
  directiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  directiveTag: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.primary,
    letterSpacing: 2,
    marginLeft: 8,
  },
  directiveTitle: {
    fontSize: 20,
    fontFamily: theme.typography.h3.fontFamily,
    color: theme.colors.text,
    marginBottom: 24,
  },
  ctaBtn: {
    height: 48,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 2,
    marginBottom: 16,
  },
  progressCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTextCol: {
    flex: 1,
    justifyContent: "center",
  },
  progressRingCol: {
    marginLeft: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  progressPercent: {
    fontSize: 40,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.text,
    letterSpacing: -1,
    marginVertical: 4,
  },
  progressStats: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textDim,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timelineIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionEnded: {
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.1)",
  },
  sessionUpcoming: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  timelineInfo: {
    flex: 1,
    marginLeft: 16,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  sessionDate: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  }
});
