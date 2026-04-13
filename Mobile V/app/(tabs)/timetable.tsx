import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { theme } from "../../shared/theme";
import { useTimetableEntries } from "../../shared/queries/useDashboardQueries";
import { AdaptiveHeader } from "../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { GlassView } from "../../components/ui/GlassView";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { RoleGuard } from "../../components/auth/RoleGuard";

export default function TimetableScreen() {
  const { data: entries, isLoading } = useTimetableEntries();
  const scrollY = useSharedValue(0);

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  // Group entries by day of week
  const groupedEntries = daysOfWeek.map((day, index) => {
    return {
      day,
      items: entries?.availability?.filter((e: any) => e.dayOfWeek === index)?.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)) || []
    };
  }).filter(group => group.items.length > 0);

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="Timetable" scrollY={scrollY} showBack onBack={() => router.back()} />
        
        {isLoading ? (
          <View style={styles.center}>
             <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
          >
            {groupedEntries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textDim} />
                <Text style={styles.emptyTitle}>NO SCHEDULED SESSIONS</Text>
                <Text style={styles.emptySubtitle}>There are no recurring sessions configured.</Text>
              </View>
            ) : (
              groupedEntries.map((group) => (
                <View key={group.day} style={styles.dayGroup}>
                  <Text style={styles.dayTitle}>{group.day.toUpperCase()}</Text>
                  {group.items.map((entry: any) => (
                    <TouchableOpacity 
                      key={entry.groupId} 
                      onPress={() => router.push(`/(tabs)/groups/${entry.groupId}`)}
                      activeOpacity={0.8}
                    >
                      <GlassView intensity={20} style={styles.entryCard}>
                        <View style={styles.timeCol}>
                          <Text style={styles.timeText}>
                             {/* Convert HH:mm to 12h format simply */}
                             {new Date(`1970-01-01T${entry.startTime}:00`).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
                          </Text>
                          <Text style={styles.durationText}>{entry.durationMinutes}m</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoCol}>
                          <Text style={styles.groupName}>{entry.groupName}</Text>
                          <View style={styles.levelBadge}>
                            <Text style={styles.levelText}>Level {entry.level}</Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
                      </GlassView>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingTop: 110,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: "center",
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: theme.colors.textDim,
    fontSize: 12,
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayTitle: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  timeCol: {
    width: 70,
    alignItems: "center",
  },
  timeText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  durationText: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 16,
  },
  infoCol: {
    flex: 1,
  },
  groupName: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.typography.h3.fontFamily,
    marginBottom: 4,
  },
  levelBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  }
});
