import React, { useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { theme } from "../../shared/theme";
import { useNotifications, useNotificationMutations } from "../../shared/queries/useNotificationQueries";
import { NotificationType } from "../../shared/types";
import { formatDistanceToNow } from "date-fns";
import { haptics } from "../../shared/lib/haptics";
import { GlassView } from "../ui/GlassView";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const NotificationCenter = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["60%", "90%"], []);
  const insets = useSafeAreaInsets();
  
  const { data: notifData } = useNotifications();
  const { markAsReadMutation, markAllAsReadMutation } = useNotificationMutations();
  
  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  const handleOpen = () => {
    haptics.selection();
    bottomSheetRef.current?.expand();
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  const handleMarkAsRead = (id: string) => {
    haptics.impact();
    markAsReadMutation.mutate(id);
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    ),
    []
  );

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "Success": return "checkmark-circle";
      case "Warning": return "warning";
      case "Error": return "close-circle";
      default: return "information-circle";
    }
  };

  const getColor = (type: NotificationType) => {
    switch (type) {
      case "Success": return theme.colors.success;
      case "Warning": return theme.colors.warning;
      case "Error": return theme.colors.error;
      default: return theme.colors.primary;
    }
  };

  return (
    <>
      <TouchableOpacity onPress={handleOpen} style={styles.bellButton} activeOpacity={0.7}>
        <Ionicons name="notifications-outline" size={24} color={unreadCount > 0 ? theme.colors.primary : theme.colors.text} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>ALERT MATRIX</Text>
          <TouchableOpacity onPress={() => bottomSheetRef.current?.close()}>
            <Ionicons name="close" size={24} color={theme.colors.textDim} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>NO ACTIVE ALERTS</Text>
            </View>
          ) : (
            notifications.map((n: any) => (
              <GlassView key={n.id} intensity={20} style={[styles.notificationCard, n.isRead && styles.readCard]}>
                <View style={[styles.iconContainer, { backgroundColor: `${getColor(n.type)}20` }]}>
                  <Ionicons name={getIcon(n.type)} size={20} color={getColor(n.type)} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.title, n.isRead && styles.readText]}>{n.title}</Text>
                  <Text style={styles.message}>{n.message}</Text>
                  <Text style={styles.time}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</Text>
                </View>
                {!n.isRead && (
                  <TouchableOpacity onPress={() => handleMarkAsRead(n.id)} style={styles.markReadBtn}>
                    <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </GlassView>
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  bellButton: {
    padding: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.bg,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
  sheetBackground: {
    backgroundColor: "#0d1117",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  handleIndicator: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 40,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 24,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    opacity: 0.5,
  },
  emptyText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 16,
  },
  notificationCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  readCard: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  readText: {
    fontWeight: "500",
    color: theme.colors.textDim,
  },
  message: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginBottom: 8,
  },
  time: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  markReadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  }
});
