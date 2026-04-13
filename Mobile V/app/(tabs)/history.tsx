import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../shared/theme";
import { useInfiniteSessions } from "../../shared/queries/useSessionQueries";
import { AdaptiveHeader } from "../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { OptimizedList } from "../../components/ui/OptimizedList";
import { GlassView } from "../../components/ui/GlassView";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { RoleGuard } from "../../components/auth/RoleGuard";
import { format } from "date-fns";
import { useAnimatedPress } from "../../shared/hooks/useAnimatedPress";
import Animated from "react-native-reanimated";

export default function HistoryScreen() {
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useInfiniteSessions({ status: "Ended" });
  const sessions = data?.pages.flatMap(page => page.items) || [];
  const scrollY = useSharedValue(0);

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Active": return "#ef4444";
      case "Ended": return "#10b981";
      default: return "#f59e0b";
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const { pressHandlers, animatedStyle } = useAnimatedPress();
    return (
      <Animated.View style={animatedStyle} {...pressHandlers}>
        <GlassView intensity={15} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName} numberOfLines={1}>{item.groupName}</Text>
              <Text style={styles.techStack}>{item.date ? format(new Date(item.date), "MMM d, yyyy") : "Unknown Date"}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textDim} />
              <Text style={styles.statText}>
                 {item.startedAt && item.endedAt ? format(new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime() - 3600000 * 2, "H'h' m'm'") : "N/A"}
              </Text>
            </View>
            {item.attendanceCount !== undefined && (
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={14} color={theme.colors.textDim} />
                <Text style={styles.statText}>{item.attendanceCount} records</Text>
              </View>
            )}
          </View>
          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
        </GlassView>
      </Animated.View>
    );
  };

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="Mission History" scrollY={scrollY} showBack onBack={() => router.back()} />
        
        <OptimizedList
          data={sessions}
          renderItem={renderItem}
          loading={isLoading}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          emptyTitle="No History Yet"
          emptyDescription="Completed missions and recorded metrics will appear here."
          staggerAnimations={true}
        />
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  listContent: {
    paddingTop: 110,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  card: {
    padding: theme.spacing.md,
    marginBottom: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  groupInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.typography.h3.fontFamily,
    marginBottom: 4,
  },
  techStack: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 8,
    borderRadius: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "600",
  },
  notesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)"
  },
  notesText: {
    color: theme.colors.textDim,
    fontSize: 12,
    lineHeight: 16
  }
});
