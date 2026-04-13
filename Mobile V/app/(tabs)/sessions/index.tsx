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
  ScrollView,
  TextInput,
} from "react-native";
import { useState, useMemo } from "react";
import { theme } from "../../../shared/theme";
import { useInfiniteSessions } from "../../../shared/queries/useSessionQueries";
import { AdaptiveHeader } from "../../../components/layout/AdaptiveHeader";
import Animated, { useSharedValue } from "react-native-reanimated";
import { haptics } from "../../../shared/lib/haptics";
import { OptimizedList } from "../../../components/ui/OptimizedList";
import { GlassView } from "../../../components/ui/GlassView";
import { Badge } from "../../../components/ui/Badge";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Session } from "../../../shared/types";
import { RoleGuard } from "../../../components/auth/RoleGuard";
import { format } from "date-fns";
import Swipeable from "react-native-gesture-handler/Swipeable";

export default function SessionsListScreen() {
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteSessions();
  const allSessions = data?.pages.flatMap(page => page.items) || [];
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollY = useSharedValue(0);

  const filters = ["All", "Active", "Pending", "Ended", "Cancelled"];

  const sessions = useMemo(() => {
    return allSessions.filter(s => {
      // 1. Status Filter
      if (activeFilter !== "All" && s.status !== activeFilter) return false;
      // 2. Search Query Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const groupNameMatch = (s.groupName || "").toLowerCase().includes(query);
        const sessionNumberMatch = String(s.sessionNumber || "").includes(query);
        if (!groupNameMatch && !sessionNumberMatch) return false;
      }
      return true;
    });
  }, [allSessions, activeFilter, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return theme.colors.primary; // Green
      case "Ended": return theme.colors.textDim; // Gray
      case "Cancelled": return theme.colors.error; // Red
      default: return theme.colors.warning; // Yellow (Pending)
    }
  };

  const getStatusIcon = (status: string): any => {
    switch (status) {
      case "Active": return "radio-button-on";
      case "Ended": return "checkmark-done-circle";
      case "Cancelled": return "close-circle";
      default: return "time-outline";
    }
  };

  const renderRightActions = (status: string) => {
    if (status !== "Pending" && status !== "Scheduled") return null;
    return (
      <TouchableOpacity 
        style={styles.cancelActionBtn}
        onPress={() => {
          // Trigger cancel mutation here
        }}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <Text style={styles.cancelActionText}>CANCEL</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Session }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.status)}>
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
                variant={item.status === "Ended" ? "outline" : item.status === "Active" ? "primary" : item.status === "Cancelled" ? "error" : "warning"}
                style={{ height: 20, paddingHorizontal: 8, ...(item.status === "Ended" && { borderColor: theme.colors.textDim }) }}
              >
                <Text style={[styles.badgeText, item.status === "Ended" && { color: theme.colors.textDim }]}>{item.status.toUpperCase()}</Text>
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
      </Swipeable>
    );
  };

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader 
          title="Operations Log" 
          scrollY={scrollY}
          rightElement={
            <TouchableOpacity 
              onPress={() => {
                haptics.selection();
                router.push("/sessions/scanner");
              }}
              style={styles.scannerBtn}
            >
              <Ionicons name="scan" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          }
        />

        {/* Search & Filter Wrapper */}
        <Animated.View style={styles.headerControls}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color={theme.colors.textDim} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search sessions..."
              placeholderTextColor={theme.colors.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity 
                  key={filter} 
                  activeOpacity={0.8}
                  onPress={() => setActiveFilter(filter)} 
                  style={[styles.pill, isActive && styles.pillActive]}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {filter.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

      <OptimizedList
        data={sessions || []}
        renderItem={renderItem}
        loading={isLoading}
        onRefresh={refetch}
        refreshing={isRefetching}
        isFetchingNextPage={isFetchingNextPage}
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
    paddingTop: 180, // increased to account for search + filter row
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  headerControls: {
    position: "absolute",
    top: 90,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: theme.colors.bg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: theme.spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    height: 40,
    marginTop: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    height: "100%",
  },
  filterContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  pillTextActive: {
    color: "#fff",
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
  cancelActionBtn: {
    backgroundColor: theme.colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 12,
    marginBottom: 12, // match card marginBottom
    marginLeft: 8,
  },
  cancelActionText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: 1,
  },
  scannerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.2)",
  }
});
