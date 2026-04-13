import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../shared/theme";
import { useInfiniteGroups } from "../../shared/queries/useGroupQueries";
import { AdaptiveHeader } from "../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { OptimizedList } from "../../components/ui/OptimizedList";
import { GlassView } from "../../components/ui/GlassView";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { RoleGuard } from "../../components/auth/RoleGuard";

export default function ArchiveScreen() {
  // Fetch only completed groups. Assuming API supports status filtering.
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useInfiniteGroups({ status: "Completed" });
  const groups = data?.pages.flatMap(page => page.items) || [];
  const scrollY = useSharedValue(0);

  const renderItem = ({ item }: { item: any }) => (
    <GlassView intensity={15} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Ionicons name="archive-outline" size={24} color={theme.colors.textDim} />
        </View>
        <View style={styles.info}>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.techStack}>{item.techStack || 'Legacy Session'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
      </View>
    </GlassView>
  );

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="System Archive" scrollY={scrollY} showBack onBack={() => router.back()} />
        
        <OptimizedList
          data={groups}
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
          emptyTitle="Archive Empty"
          emptyDescription="Completed or deprecated nodes will be vaulted here."
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
    marginBottom: 8,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  nameText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  techStack: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: "600",
  }
});
