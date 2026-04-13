import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { theme } from "../../shared/theme";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  userId?: string;
  userName: string;
  action: string;
  entity: string;
  timestamp: string;
}

interface ActivityFeedWidgetProps {
  activities: ActivityItem[];
}

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="list-circle-outline" size={32} color={theme.colors.borderLight} />
        <Text style={styles.emptyText}>No recent activities</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activities.slice(0, 5).map((act, index) => (
        <Animated.View 
          key={act.id} 
          entering={FadeInDown.delay(800 + index * 100).duration(600)}
          style={styles.itemContainer}
        >
          <View style={styles.iconRing}>
            <Ionicons name="flash-outline" size={14} color={theme.colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.activityText}>
              <Text style={styles.bold}>{act.userName}</Text> {act.action} {" "}
              <Text style={styles.bold}>{act.entity}</Text>
            </Text>
            <Text style={styles.timeText}>
              {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
            </Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: theme.radius.lg,
    marginTop: 8,
  },
  emptyText: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginTop: 8,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  iconRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 20,
    fontFamily: theme.typography.body.fontFamily,
  },
  bold: {
    fontWeight: "800",
    color: theme.colors.text,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textDim,
    marginTop: 2,
  }
});
