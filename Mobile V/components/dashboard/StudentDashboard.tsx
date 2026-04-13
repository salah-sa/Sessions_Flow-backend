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
      <View style={styles.loadingContainer}>
        <Skeleton width="90%" height={100} borderRadius={20} style={{ marginBottom: 20 }} />
        <Skeleton width="90%" height={200} borderRadius={20} style={{ marginBottom: 20 }} />
        <Skeleton width="90%" height={300} borderRadius={20} />
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
          <Text style={styles.sectionTitle}>COURSE TRAJECTORY</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressPercent}>{progress.percentage.toFixed(0)}%</Text>
              <Text style={styles.progressStats}>{progress.completed} / {progress.total} COMPLETE</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
            </View>
          </View>
        </Animated.View>

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
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressPercent: {
    fontSize: 32,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.text,
  },
  progressStats: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textDim,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
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
