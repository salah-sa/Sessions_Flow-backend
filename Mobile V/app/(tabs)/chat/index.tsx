/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Communication Hub
 * Phase 58: Chat List (Group Snippets)
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
import { useChatStore } from "../../../shared/store/stores";
import { AdaptiveHeader } from "../../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { OptimizedList } from "../../../components/ui/OptimizedList";
import { GlassView } from "../../../components/ui/GlassView";
import { Badge } from "../../../components/ui/Badge";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Group } from "../../../shared/types";
import { RoleGuard } from "../../../components/auth/RoleGuard";
import { format } from "date-fns";

export default function ChatListScreen() {
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useInfiniteGroups();
  const groups = data?.pages.flatMap(page => page.items) || [];
  const { unreadCounts, lastMessages } = useChatStore();
  const scrollY = useSharedValue(0);

  const renderItem = ({ item }: { item: Group }) => {
    const unread = unreadCounts[item.id] || 0;
    const lastMsg = lastMessages[item.id];

    return (
      <Pressable 
        onPress={() => router.push({ pathname: "/(tabs)/chat/[id]", params: { id: item.id } })}
      >
        {({ pressed }) => (
          <GlassView 
            intensity={pressed ? 60 : 15} 
            style={[styles.card, unread > 0 && styles.activeCard]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: item.colorTag }]}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
              </View>
              
              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
                  {lastMsg && (
                    <Text style={styles.timeText}>
                      {format(new Date(lastMsg.sentAt), "h:mm a")}
                    </Text>
                  )}
                </View>
                
                <View style={styles.snippetRow}>
                  <Text style={styles.snippetText} numberOfLines={1}>
                    {lastMsg ? lastMsg.text : "No messages yet"}
                  </Text>
                  <Badge count={unread} variant="primary" />
                </View>
              </View>
            </View>
          </GlassView>
        )}
      </Pressable>
    );
  };

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer", "Student"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="Mission Control" scrollY={scrollY} />
      
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
        emptyTitle="Channel List Empty"
        emptyDescription="Your secure communication channels will appear here once groups are assigned."
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
    marginBottom: 8,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
  },
  activeCard: {
    borderColor: "rgba(14, 165, 233, 0.2)",
    backgroundColor: "rgba(14, 165, 233, 0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  info: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameText: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.typography.h3.fontFamily,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "700",
  },
  snippetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 20,
  },
  snippetText: {
    color: theme.colors.textDim,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  }
});
