/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Groups List
 * Phase 46-49: Tactical Fleet Management
 * ═══════════════════════════════════════════════════════════
 */

import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Pressable
} from "react-native";
import { theme } from "../../../shared/theme";
import { useInfiniteGroups } from "../../../shared/queries/useGroupQueries";
import { AdaptiveHeader } from "../../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { OptimizedList } from "../../../components/ui/OptimizedList";
import { GlassView } from "../../../components/ui/GlassView";
import { Badge } from "../../../components/ui/Badge";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Group } from "../../../shared/types";
import { RoleGuard } from "../../../components/auth/RoleGuard";

export default function GroupsScreen() {
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useInfiniteGroups();
  const groups = data?.pages.flatMap(page => page.items) || [];
  const scrollY = useSharedValue(0);

  const renderItem = ({ item }: { item: Group }) => (
    <Pressable 
      onPress={() => router.push({ pathname: "/(tabs)/groups/[id]", params: { id: item.id } })}
    >
      {({ pressed }) => (
        <GlassView 
          intensity={pressed ? 60 : 20} 
          style={[styles.card, { borderColor: `${item.colorTag}40` }]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.levelBadge, { backgroundColor: item.colorTag }]}>
              <Text style={styles.levelText}>L{item.level}</Text>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.nameText}>{item.name}</Text>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textDim} />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>COMPLETED</Text>
              <Text style={styles.statValue}>{item.completedSessions || 0} / {item.totalSessions}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>STUDENTS</Text>
              <Text style={styles.statValue}>{item.numberOfStudents}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>PROGRESS</Text>
              <Text style={styles.statValue}>
                {Math.round(((item.completedSessions || 0) / item.totalSessions) * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill, 
              { 
                backgroundColor: item.colorTag,
                width: `${((item.completedSessions || 0) / item.totalSessions) * 100}%` 
              }
            ]} />
          </View>
        </GlassView>
      )}
    </Pressable>
  );

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="Fleet Groups" scrollY={scrollY} />
      
      <OptimizedList
        data={groups || []}
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
        emptyTitle="No Groups Active"
        emptyDescription="Your fleet is currently offline. Connect new groups via Admin Console."
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
    marginBottom: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  levelText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  cardHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameText: {
    color: theme.colors.text,
    fontSize: 18,
    fontFamily: theme.typography.h2.fontFamily,
  },
  statusText: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    color: theme.colors.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
  }
});
