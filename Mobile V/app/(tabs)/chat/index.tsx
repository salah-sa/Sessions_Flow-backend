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
import { CinematicModal } from "../../../components/ui/CinematicModal";
import { haptics } from "../../../shared/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Group } from "../../../shared/types";
import { RoleGuard } from "../../../components/auth/RoleGuard";
import { format } from "date-fns";
import { usePresenceStore } from "../../../shared/store/presenceStore";

export default function ChatListScreen() {
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useInfiniteGroups();
  const groups = data?.pages.flatMap(page => page.items) || [];
  const { unreadCounts, lastMessages, mutedGroups, pinnedGroups, toggleMute, togglePin } = useChatStore();
  const getPresence = usePresenceStore(s => s.getPresence);
  const serverHealthy = usePresenceStore(s => s.serverHealthy);
  const scrollY = useSharedValue(0);
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null);

  const renderItem = ({ item }: { item: Group }) => {
    const unread = unreadCounts[item.id] || 0;
    const lastMsg = lastMessages[item.id];

    return (
      <Pressable 
        onLongPress={() => {
          haptics.impact();
          setSelectedGroup(item);
        }}
        onPress={() => router.push({ pathname: "/(tabs)/chat/[id]", params: { id: item.id } })}
      >
        {({ pressed }) => (
          <GlassView 
            intensity={pressed ? 60 : 15} 
            style={[
              styles.card, 
              unread > 0 && styles.activeCard,
              pinnedGroups.includes(item.id) && styles.pinnedCard
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: item.colorTag }]}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
                {item.engineerId && getPresence(item.engineerId).status === "online" && (
                  <View style={styles.presenceOrb} />
                )}
              </View>
              
              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.rightHeader}>
                    {pinnedGroups.includes(item.id) && (
                      <Ionicons name="pin" size={12} color={theme.colors.primary} style={{ marginRight: 6 }} />
                    )}
                    {mutedGroups.includes(item.id) && (
                      <Ionicons name="notifications-off" size={12} color={theme.colors.textDim} style={{ marginRight: 6 }} />
                    )}
                    {lastMsg && (
                      <Text style={styles.timeText}>
                        {format(new Date(lastMsg.sentAt), "h:mm a")}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.snippetRow}>
                  <Text style={styles.snippetText} numberOfLines={1}>
                    {lastMsg ? lastMsg.text : "No messages yet"}
                  </Text>
                  <Badge 
                    count={unread} 
                    variant={mutedGroups.includes(item.id) ? "dim" : "primary"} 
                  />
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
        data={[...groups].sort((a, b) => {
          const aPinned = pinnedGroups.includes(a.id);
          const bPinned = pinnedGroups.includes(b.id);
          if (aPinned === bPinned) return 0;
          return aPinned ? -1 : 1;
        })}
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

      <CinematicModal 
        visible={!!selectedGroup} 
        onClose={() => setSelectedGroup(null)}
        title="CHANNEL CORE"
      >
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.modalAction}
            onPress={() => {
              togglePin(selectedGroup!.id);
              setSelectedGroup(null);
              haptics.success();
            }}
          >
            <Ionicons name="pin" size={24} color={theme.colors.primary} />
            <Text style={styles.modalActionText}>
              {pinnedGroups.includes(selectedGroup?.id || "") ? "UNPIN CHANNEL" : "PIN TO TOP"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.modalAction}
            onPress={() => {
              toggleMute(selectedGroup!.id);
              setSelectedGroup(null);
              haptics.success();
            }}
          >
            <Ionicons name={mutedGroups.includes(selectedGroup?.id || "") ? "notifications" : "notifications-off"} size={24} color={theme.colors.text} />
            <Text style={styles.modalActionText}>
              {mutedGroups.includes(selectedGroup?.id || "") ? "ENABLE ALERTS" : "MUTE NOTIFICATIONS"}
            </Text>
          </TouchableOpacity>
        </View>
      </CinematicModal>
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
  pinnedCard: {
    borderColor: "rgba(14, 165, 233, 0.4)",
    backgroundColor: "rgba(14, 165, 233, 0.08)",
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
  presenceOrb: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
    borderWidth: 3,
    borderColor: theme.colors.bg,
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
  rightHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalContent: {
    padding: 24,
  },
  modalAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  modalActionText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 16,
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
