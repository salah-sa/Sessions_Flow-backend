import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Pressable
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
  SharedValue,
  withRepeat,
  withTiming,
  withSequence
} from "react-native-reanimated";
import { Avatar } from "../ui/Avatar";
import { GlassView } from "../ui/GlassView";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { LiveSessionTile } from "./LiveSessionTile";
import { haptics } from "../../shared/lib/haptics";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Activity, ArrowRight, Calendar, CheckCircle, Clock } from "lucide-react-native";
import { format } from "date-fns";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../shared/queries/keys";
import { LinearGradient } from "expo-linear-gradient";
import { useAnimatedPress } from "../../shared/hooks/useAnimatedPress";

const { width } = Dimensions.get("window");

export const StudentDashboard = () => {
  const { data, isLoading, error, refetch, isRefetching } = useStudentDashboard();
  const scrollY = useSharedValue(0);
  const queryClient = useQueryClient();

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  const { animatedStyle: ctaAnimStyle, pressHandlers: ctaPress } = useAnimatedPress({ scale: 0.96 });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AdaptiveHeader title="Initializing..." scrollY={scrollY} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.header, { marginBottom: 32 }]}>
            <Skeleton width={80} height={80} borderRadius={16} />
            <View style={styles.headerInfo}>
              <Skeleton width={120} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width={200} height={28} borderRadius={6} style={{ marginBottom: 8 }} />
              <Skeleton width={160} height={14} borderRadius={4} />
            </View>
          </View>
          
          <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 24 }} />

          <View style={styles.section}>
            <Skeleton width="100%" height={160} borderRadius={24} />
          </View>

          <View style={styles.section}>
            <Skeleton width={150} height={12} borderRadius={4} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error || (data as any)?.error) {
    return (
      <View style={styles.errorContainer}>
        <EmptyState 
          icon="alert-circle-outline"
          title="Identity Resolution Failed"
          description={(error as any)?.message || (data as any)?.error?.message || "Your student records could not be verified."}
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
  const { identity, progress, todaySession, nextSession, primaryAction, timeline } = data as any;

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
            tintColor={theme.colors.success} 
          />
        }
      >
        {/* Header Region */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
          <View style={styles.avatarWrap}>
            <Avatar 
              userId={identity.studentId} 
              name={identity.name} 
              avatarUrl={identity.avatarUrl} 
              size={80} 
            />
            <View style={styles.avatarGlow} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.roleTag}>STUDENT OPERATOR</Text>
            <Text style={styles.nameText}>{identity.name}</Text>
            <View style={styles.metaRow}>
              <Activity size={12} color={theme.colors.success} style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>Node: {identity.groupName}</Text>
              <View style={styles.dot} />
              <Text style={styles.metaText}>Level {identity.level}</Text>
              <View style={styles.dot} />
              <Text style={styles.metaText}>ID: {identity.studentId}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Priority Directive Card */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.sectionLarge}>
          <GlassView intensity={20} style={styles.directiveCard}>
            <LinearGradient 
              colors={['rgba(16,185,129,0.1)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.blobGlow} />

            <View style={styles.directiveContent}>
              <View style={styles.directiveHeader}>
                <Activity size={14} color={theme.colors.success} />
                <Text style={styles.directiveTag}>PRIORITY DIRECTIVE</Text>
              </View>
              <Text style={styles.directiveTitle}>{primaryAction?.label || "No current directive"}</Text>
              
              {(todaySession || nextSession) && (
                <Animated.View style={ctaAnimStyle}>
                  <Pressable 
                    {...ctaPress}
                    onPress={() => {
                      haptics.selection();
                      router.push(`/(tabs)/sessions/${(todaySession || nextSession).id}`);
                    }} 
                    style={styles.ctaBtn}
                  >
                    <Text style={styles.ctaText}>ENTER OPERATIONS</Text>
                    <ArrowRight size={14} color="#fff" style={{ marginLeft: 8 }} />
                  </Pressable>
                </Animated.View>
              )}
            </View>
          </GlassView>
        </Animated.View>

        {/* Course Trajectory (Progress) */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.sectionLarge}>
          <GlassView intensity={20} style={styles.progressCard}>
            <Text style={styles.progressLabel}>COURSE TRAJECTORY</Text>
            
            <View style={styles.progressTopRow}>
              <Text style={styles.progressPercent}>{progress.percentage.toFixed(0)}<Text style={{ fontSize: 20, color: theme.colors.success }}>%</Text></Text>
              <Text style={styles.progressStats}>{progress.completed} / {progress.total} COMPLETE</Text>
            </View>

            <View style={styles.progressBarBg}>
              <LinearGradient 
                colors={[theme.colors.success, '#22d3ee']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.max(2, progress.percentage)}%` }]}
              />
            </View>

            <View style={styles.progressBottomRow}>
              <View>
                <Text style={styles.progressSubLabel}>REMAINING</Text>
                <Text style={styles.progressSubVal}>{progress.remaining}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.progressSubLabel}>TARGET EDGE</Text>
                <Text style={styles.progressSubVal}>S{progress.total}</Text>
              </View>
            </View>
          </GlassView>
        </Animated.View>

        {/* Live Session Priority Tile */}
        {(() => {
          const activeOrNext = timeline.find((s: any) => s.status === 'Active' || s.status === 'Scheduled');
          if (!activeOrNext) return null;
          return <LiveSessionTile session={activeOrNext} />;
        })()}

        {/* Timeline (Sessions) */}
        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.section}>
          <View style={styles.timelineHeader}>
            <Calendar size={14} color={theme.colors.success} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>RECENT & UPCOMING SESSIONS</Text>
          </View>
          
          <View style={{ gap: 12 }}>
            {timeline.map((session: any, index: number) => (
              <TimelineItem 
                key={session.id} 
                session={session} 
                index={index}
              />
            ))}
            {timeline.length === 0 && (
              <Text style={styles.emptyText}>NO SESSIONS GENERATED YET.</Text>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const TimelineItem = ({ session, index }: { session: any, index: number }) => {
  const isEnded = session.status === "Ended";
  const dateObj = new Date(session.scheduledAt);
  const { animatedStyle, pressHandlers } = useAnimatedPress({ scale: 0.98 });
  
  return (
    <Animated.View style={animatedStyle}>
      <Pressable 
        {...pressHandlers}
        onPress={() => {
          haptics.selection();
          router.push(`/(tabs)/sessions/${session.id}`);
        }}
        style={styles.timelineItem}
      >
        <View style={[
          styles.timelineIcon, 
          isEnded ? styles.sessionEnded : styles.sessionUpcoming
        ]}>
          {isEnded ? (
            <CheckCircle size={18} color={theme.colors.success} />
          ) : (
            <Clock size={18} color={theme.colors.textDim} />
          )}
        </View>
        <View style={styles.timelineInfo}>
          <Text style={styles.sessionTitle}>SESSION #{session.number}</Text>
          <Text style={styles.sessionDate}>{format(dateObj, "MMMM d, yyyy • h:mm a")}</Text>
        </View>
        <View style={[styles.timelineBadge, isEnded ? styles.badgeEnded : styles.badgeUpcoming]}>
          <Text style={[styles.badgeText, isEnded ? { color: theme.colors.success } : { color: '#f59e0b' }]}>
            {isEnded ? "COMPLETED" : "UPCOMING"}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
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
  avatarWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  avatarGlow: {
    position: 'absolute',
    inset: -8,
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderRadius: 100,
    zIndex: -1,
  },
  headerInfo: {
    marginLeft: 20,
    flex: 1,
  },
  roleTag: {
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.success,
    letterSpacing: 3,
  },
  nameText: {
    fontSize: 28,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.text,
    letterSpacing: -1,
    marginVertical: 4,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 8,
  },
  sectionLarge: {
    marginBottom: 24,
  },
  directiveCard: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
    position: "relative",
  },
  blobGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 250,
    height: 250,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 125,
    transform: [{ translateX: 125 }, { translateY: -125 }],
  },
  directiveContent: {
    padding: 24,
    zIndex: 10,
  },
  directiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  directiveTag: {
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.success,
    letterSpacing: 2,
    marginLeft: 8,
  },
  directiveTitle: {
    fontSize: 24,
    fontFamily: theme.typography.h2.fontFamily,
    color: theme.colors.text,
    marginBottom: 24,
  },
  ctaBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: {
    color: "#fff",
    fontFamily: theme.typography.label.fontFamily,
    fontSize: 11,
    letterSpacing: 2,
  },
  progressCard: {
    borderRadius: theme.radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 2,
    marginBottom: 24,
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressPercent: {
    fontSize: 36,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.text,
    lineHeight: 36,
    letterSpacing: -1,
  },
  progressStats: {
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 1,
    marginBottom: 4,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  progressSubLabel: {
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 2,
  },
  progressSubVal: {
    fontSize: 20,
    fontFamily: theme.typography.h2.fontFamily,
    color: theme.colors.text,
    marginTop: 4,
  },
  section: {
    marginTop: 8,
    marginBottom: 32,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.text,
    letterSpacing: 2,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  timelineIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionEnded: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  sessionUpcoming: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  timelineInfo: {
    flex: 1,
    marginLeft: 16,
  },
  sessionTitle: {
    fontSize: 12,
    fontFamily: theme.typography.h3.fontFamily,
    color: theme.colors.text,
    letterSpacing: 1,
  },
  sessionDate: {
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  timelineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeEnded: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  badgeUpcoming: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  badgeText: {
    fontSize: 8,
    fontFamily: theme.typography.label.fontFamily,
    letterSpacing: 1,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 10,
    fontFamily: theme.typography.label.fontFamily,
    color: theme.colors.textDim,
    letterSpacing: 2,
    padding: 32,
  }
});
