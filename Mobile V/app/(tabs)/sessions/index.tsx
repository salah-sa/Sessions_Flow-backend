/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Sessions List
 * Phase 1 Fix: Proper Sessions Tab Entry Point
 * ═══════════════════════════════════════════════════════════
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { theme } from "../../../shared/theme";
import { useInfiniteSessions } from "../../../shared/queries/useSessionQueries";
import { AdaptiveHeader } from "../../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { OptimizedList } from "../../../components/ui/OptimizedList";
import { GlassView } from "../../../components/ui/GlassView";
import { Badge } from "../../../components/ui/Badge";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Session } from "../../../shared/types";
import { RoleGuard } from "../../../components/auth/RoleGuard";
import { format } from "date-fns";

export default function SessionsListScreen() {
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useInfiniteSessions();
  const sessions = data?.pages.flatMap(page => page.items) || [];
  const scrollY = useSharedValue(0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return theme.colors.primary;
      case "Ended": return theme.colors.success;
      case "Cancelled": return theme.colors.error;
      default: return theme.colors.warning;
    }
  };

  const getStatusIcon = (status: string): any => {
    switch (status) {
      case "Active": return "radio-button-on";
      case "Ended": return "checkmark-circle";
      case "Cancelled": return "close-circle";
      default: return "time-outline";
    }
  };

  const renderItem = ({ item }: { item: Session }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/(tabs)/sessions/[id]", params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <GlassView intensity={20} style={[styles.card, { borderColor: `${statusColor}30` }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusIcon, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
              <Ionicons name={getStatusIcon(item.status)} size={20} color={statusColor} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.sessionTitle}>
                {item.groupName || "Session"} #{item.sessionNumber || "—"}
              </Text>
              <Text style={styles.sessionDate}>
                {format(new Date(item.scheduledAt), "EEE, MMM d • h:mm a")}
              </Text>
            </View>
            <Badge
              variant={item.status === "Ended" ? "success" : item.status === "Active" ? "primary" : "warning"}
              style={{ height: 20, paddingHorizontal: 8 }}
            >
              <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
            </Badge>
          </View>

          {/* Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Ionicons name="people-outline" size={14} color={theme.colors.textDim} />
              <Text style={styles.metricText}>
                {item.presentCount ?? "—"}/{item.totalStudents ?? "—"}
              </Text>
            </View>
            {item.durationMinutes != null && (
              <View style={styles.metric}>
                <Ionicons name="timer-outline" size={14} color={theme.colors.textDim} />
                <Text style={styles.metricText}>{item.durationMinutes}m</Text>
              </View>
            )}
            {item.groupLevel != null && (
              <View style={styles.metric}>
                <Ionicons name="layers-outline" size={14} color={theme.colors.textDim} />
                <Text style={styles.metricText}>L{item.groupLevel}</Text>
              </View>
            )}
          </View>
        </GlassView>
      </TouchableOpacity>
    );
  };

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="Operations Log" scrollY={scrollY} />

      <OptimizedList
        data={sessions || []}
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
        emptyTitle="No Operations Recorded"
        emptyDescription="Your session log is empty. Sessions will appear here once they are created."
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
    marginBottom: 12,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  sessionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: theme.typography.h3.fontFamily,
  },
  sessionDate: {
    color: theme.colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    gap: 20,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricText: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: "700",
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  },
});
