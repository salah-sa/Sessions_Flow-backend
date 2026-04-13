/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Notification Center
 * Phase 5: Production Hardening & UX Polish
 * ═══════════════════════════════════════════════════════════
 */

import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator 
} from "react-native";
import { theme } from "../../shared/theme";
import { GlassView } from "../ui/GlassView";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications, useNotificationMutations } from "../../shared/queries/useNotificationQueries";
import { format } from "date-fns";
import { haptics } from "../../shared/lib/haptics";
import { Notification, NotificationType } from "../../shared/types";
import { useToast } from "../../providers/ToastProvider";
import { CinematicModal } from "../ui/CinematicModal";

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const getCategoryIcon = (type: NotificationType) => {
  switch (type) {
    case "Success": return { name: "checkmark-circle", color: theme.colors.success };
    case "Warning": return { name: "alert-circle", color: theme.colors.warning };
    case "Error": return { name: "close-circle", color: theme.colors.error };
    default: return { name: "information-circle", color: theme.colors.primary };
  }
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ visible, onClose }) => {
  const { data, isLoading, refetch } = useNotifications();
  const { markAsReadMutation, markAllAsReadMutation } = useNotificationMutations();
  const { show: showToast } = useToast();

  const handleMarkAllRead = async () => {
    haptics.impact();
    try {
      await markAllAsReadMutation.mutateAsync();
      showToast("All Intel Marked as Read", "success");
    } catch (err) {
      showToast("Sync Error", "error");
    }
  };

  const handleMarkRead = async (id: string) => {
    haptics.selection();
    try {
      await markAsReadMutation.mutateAsync(id);
    } catch (err) {
      // Silent fail
    }
  };

  const notifications = data?.notifications || [];

  return (
    <CinematicModal
      visible={visible}
      onClose={onClose}
      title="SYSTEM INTEL"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.countText}>{notifications.filter(n => !n.isRead).length} UNREAD SIGNALS</Text>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={styles.actionText}>CLEAR ALL</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="notifications-off-outline" size={48} color="rgba(255,255,255,0.05)" />
            <Text style={styles.emptyText}>NO ACTIVE SIGNALS</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scroller} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {notifications.map((item) => {
              const icon = getCategoryIcon(item.type);
              return (
                <TouchableOpacity 
                  key={item.id} 
                  onPress={() => !item.isRead && handleMarkRead(item.id)}
                  activeOpacity={0.7}
                >
                  <GlassView intensity={item.isRead ? 5 : 15} style={[styles.card, !item.isRead && styles.unreadCard]}>
                    <View style={styles.cardMain}>
                      <View style={[styles.iconBox, { backgroundColor: `${icon.color}10` }]}>
                        <Ionicons name={icon.name as any} size={18} color={icon.color} />
                      </View>
                      <View style={styles.info}>
                        <View style={styles.titleRow}>
                          <Text style={styles.title}>{item.title.toUpperCase()}</Text>
                          {!item.isRead && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.message}>{item.message}</Text>
                        <Text style={styles.time}>{format(new Date(item.createdAt), "MMM d, HH:mm")}</Text>
                      </View>
                    </View>
                  </GlassView>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </CinematicModal>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 500,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  countText: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  actionText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  emptyText: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 16,
  },
  scroller: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  unreadCard: {
    borderColor: "rgba(14, 165, 233, 0.2)",
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  message: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  time: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 8,
    fontFamily: "monospace",
  }
});
