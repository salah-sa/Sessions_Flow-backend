/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Group Operations Detail
 * Phase 47-49: Strategic Overview & Timeline
 * ═══════════════════════════════════════════════════════════
 */

import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../../../shared/theme";
import { useGroup, useGroupMutations } from "../../../shared/queries/useGroupQueries";
import { useInfiniteSessions } from "../../../shared/queries/useSessionQueries";
import { AdaptiveHeader } from "../../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { GlassView } from "../../../components/ui/GlassView";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../../../components/ui/Badge";
import { format } from "date-fns";
import { ActionSurface, ActionSurfaceRef } from "../../../components/ui/ActionSurface";
import { haptics } from "../../../shared/lib/haptics";
import { TextInput } from "react-native-gesture-handler";
import { useToast } from "../../../providers/ToastProvider";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group, isLoading: groupLoading } = useGroup(id as string);
  const { data: sessionsData, isLoading: sessionsLoading } = useInfiniteSessions({ groupId: id });
  const groupMutations = useGroupMutations();
  const { show: showToast } = useToast();
  
  const [selectedAction, setSelectedAction] = React.useState<"attendance" | "members" | "edit" | null>(null);
  const actionSurfaceRef = React.useRef<ActionSurfaceRef>(null);

  const [editData, setEditData] = React.useState({ name: "", level: 0, colorTag: "" });

  React.useEffect(() => {
    if (group) {
        setEditData({
            name: group.name,
            level: group.level,
            colorTag: group.colorTag || "#0ea5e9"
        });
    }
  }, [group]);

  const handleSaveMetadata = async () => {
    if (!id) return;
    haptics.impact();
    try {
        await groupMutations.updateMutation.mutateAsync({ id, data: editData });
        showToast("Group Configuration Synchronized", "success");
        actionSurfaceRef.current?.collapse();
    } catch (err) {
        showToast("Sync Error", "error");
    }
  };

  const openAction = (type: "attendance" | "members" | "edit") => {
    haptics.impact();
    setSelectedAction(type);
    setTimeout(() => actionSurfaceRef.current?.expand(), 100);
  };
  
  const scrollY = useSharedValue(0);

  const sessions = sessionsData?.pages.flatMap(page => (page as any).items) || [];
  const loading = groupLoading || sessionsLoading;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const progressPercent = (group?.totalSessions && group.totalSessions > 0) 
    ? Math.round(((group?.currentSessionNumber || 1) - 1) / group.totalSessions * 100) 
    : 0;

  return (
    <View style={styles.container}>
      <AdaptiveHeader 
        title={group?.name || "Node Detail"} 
        scrollY={scrollY} 
        showBack={true}
        onBack={() => router.back()}
      />
      
      <ScrollView 
        onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Region */}
        <View style={styles.header}>
          <View style={[styles.colorOrb, { backgroundColor: group?.colorTag || theme.colors.primary }]} />
          <View style={styles.headerInfo}>
            <Text style={styles.nameText}>{group?.name}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{group?.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Global Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => openAction("attendance")}
            accessible={true}
            accessibilityLabel="Attendance Bridge"
            accessibilityRole="button"
            accessibilityHint="Opens active session attendance marking surface"
          >
            <Ionicons name="checkbox-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.actionBtnText}>ATTENDANCE</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => openAction("members")}
            accessible={true}
            accessibilityLabel="Personnel Roster"
            accessibilityRole="button"
            accessibilityHint="Opens group member management operations"
          >
            <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.actionBtnText}>MEMBERS</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => openAction("edit")}
            accessible={true}
            accessibilityLabel="Group Configuration"
            accessibilityRole="button"
            accessibilityHint="Modify encrypted group parameters"
          >
            <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.actionBtnText}>EDIT</Text>
          </TouchableOpacity>
        </View>

        {/* Info Grid */}
        <View style={styles.metricsGrid}>
          <GlassView intensity={20} style={styles.metricCard}>
            <Ionicons name="layers-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.metricLabel}>LEVEL</Text>
            <Text style={styles.metricValue}>{group?.level}</Text>
          </GlassView>
          <GlassView intensity={20} style={styles.metricCard}>
            <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.metricLabel}>STUDENTS</Text>
            <Text style={styles.metricValue}>{group?.numberOfStudents}</Text>
          </GlassView>
          <GlassView intensity={20} style={styles.metricCard}>
            <Ionicons name="construct-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.metricLabel}>ENGINEER</Text>
            <Text style={styles.metricValueSmall} numberOfLines={1}>{group?.engineerName || "N/A"}</Text>
          </GlassView>
        </View>

        {/* Sync Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYNCHRONIZATION PROGRESS</Text>
          <GlassView intensity={40} style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
              <Text style={styles.progressSub}>NODES SECURED</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[
                styles.progressBarFill, 
                { width: `${progressPercent}%`, backgroundColor: group?.colorTag || theme.colors.primary }
              ]} />
            </View>
          </GlassView>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OPERATIONAL TIMELINE</Text>
          {sessions.map((session: any, index: number) => {
            const isCompleted = session.status === "Ended";
            const isActive = session.status === "Active";
            
            return (
              <TouchableOpacity 
                key={session.id || index}
                style={styles.timelineItem}
                onPress={() => router.push(`/(tabs)/sessions/${session.id}`)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityLabel={`Session ${session.sessionNumber || (index + 1)}, ${session.status}`}
                accessibilityRole="button"
                accessibilityHint="Navigates to session tactical HUD"
              >
                <View style={[
                  styles.timelineIndicator,
                  isCompleted ? styles.indicatorDone : (isActive ? styles.indicatorActive : styles.indicatorPending)
                ]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.sessionTitle}>Session #{session.sessionNumber || (index + 1)}</Text>
                  <Text style={styles.sessionMeta}>
                    {format(new Date(session.scheduledAt), "EEE, MMM d • h:mm a")}
                  </Text>
                </View>
                <Badge variant={isCompleted ? "success" : (isActive ? "primary" : "warning")} style={{ height: 20 }}>
                  <Text style={styles.badgeText}>{session.status.toUpperCase()}</Text>
                </Badge>
              </TouchableOpacity>
            );
          })}
          {sessions.length === 0 && (
            <Text style={styles.emptyText}>No sessions recorded in logs.</Text>
          )}
        </View>
      </ScrollView>

      {/* Group Operations Surface */}
      <ActionSurface 
        ref={actionSurfaceRef} 
        title={selectedAction === "attendance" ? "GROUP ATTENDANCE" : selectedAction === "members" ? "MANAGE PERSONNEL" : "EDIT CORE PARAMETERS"}
        snapPoints={["50%", "90%"]}
        onClose={() => setSelectedAction(null)}
      >
        <View style={styles.surfaceContent}>
          {selectedAction === "members" ? (
            <View style={styles.rosterContainer}>
              <View style={styles.rosterHeader}>
                <Text style={styles.rosterCount}>{group?.students?.length || 0} OPERATORS STATIONED</Text>
                <TouchableOpacity 
                  style={styles.enrollSmallBtn}
                  onPress={() => haptics.impact()}
                >
                  <Ionicons name="person-add" size={14} color={theme.colors.primary} />
                  <Text style={styles.enrollSmallText}>ENROLL</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.rosterList} showsVerticalScrollIndicator={false}>
                {group?.students?.map((student, idx) => (
                  <GlassView key={student.id || idx} intensity={10} style={styles.memberItem}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{student.name}</Text>
                      <Text style={styles.memberId}>{student.uniqueStudentCode || "NO-CODE"}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
                  </GlassView>
                ))}
                {(!group?.students || group.students.length === 0) && (
                  <View style={styles.emptyRoster}>
                    <Ionicons name="people" size={48} color="rgba(255,255,255,0.05)" />
                    <Text style={styles.emptyRosterText}>NO PERSONNEL DETECTED</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          ) : selectedAction === "edit" ? (
            <View style={styles.formContainer}>
              <Text style={styles.label}>OPERATIONAL NAME</Text>
              <TextInput 
                style={styles.input}
                value={editData.name}
                onChangeText={(v) => setEditData({...editData, name: v})}
                placeholder="Group Name"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>LEVEL</Text>
                  <TextInput 
                    style={styles.input}
                    value={String(editData.level)}
                    onChangeText={(v) => setEditData({...editData, level: parseInt(v) || 0})}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>COLOR TAG</Text>
                  <TouchableOpacity 
                    style={[styles.colorPicker, { backgroundColor: editData.colorTag || theme.colors.primary }]} 
                    onPress={() => haptics.selection()}
                  />
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.saveBtn, { marginTop: 24 }]}
                onPress={handleSaveMetadata}
                disabled={groupMutations.updateMutation.isPending}
              >
                {groupMutations.updateMutation.isPending ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>COMMIT CONFIGURATION</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholderSurface}>
              <Ionicons name="checkbox" size={48} color={theme.colors.primary} />
              <Text style={styles.surfaceHeroText}>ATTENDANCE BRIDGE</Text>
              <View style={styles.activeSessionGuard}>
                {group?.sessions?.find(s => s.status === 'Active') ? (
                  <TouchableOpacity 
                    style={styles.linkBtn}
                    onPress={() => router.push(`/(tabs)/sessions/${group.sessions?.find(s => s.status === 'Active')?.id}`)}
                  >
                    <Text style={styles.linkBtnText}>OPEN ACTIVE SESSION UNIT</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.surfaceSubText}>No active sessions detected for this node.</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ActionSurface>
    </View>
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
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    paddingTop: 110,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  colorOrb: {
    width: 60,
    height: 60,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  headerInfo: {
    marginLeft: 20,
  },
  nameText: {
    fontSize: 24,
    fontFamily: theme.typography.h3.fontFamily,
    color: theme.colors.text,
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignSelf: "flex-start",
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  metricCard: {
    width: "31%",
    padding: theme.spacing.md,
    alignItems: "center",
    borderRadius: theme.radius.md,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1,
    marginTop: 8,
  },
  metricValue: {
    fontSize: 18,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.text,
  },
  metricValueSmall: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 2,
    marginBottom: 16,
  },
  progressCard: {
    padding: theme.spacing.lg,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  progressPercent: {
    fontSize: 32,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.text,
  },
  progressSub: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    marginLeft: 8,
    letterSpacing: 1,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  timelineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 16,
  },
  indicatorDone: {
    backgroundColor: theme.colors.success,
  },
  indicatorActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowRadius: 10,
    shadowOpacity: 0.5,
  },
  indicatorPending: {
    backgroundColor: theme.colors.textDim,
  },
  timelineContent: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.text,
  },
  sessionMeta: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#fff",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    color: theme.colors.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 6,
  },
  surfaceContent: {
    flex: 1,
    padding: 20,
  },
  placeholderSurface: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  surfaceHeroText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  surfaceSubText: {
    color: theme.colors.textDim,
    fontSize: 12,
    textAlign: "center",
  },
  emptyText: {
    color: theme.colors.textDim,
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  rosterContainer: {
    flex: 1,
  },
  rosterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  rosterCount: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
  },
  enrollSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.2)",
  },
  enrollSmallText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
  },
  rosterList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  avatarText: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  memberId: {
    color: theme.colors.textDim,
    fontSize: 10,
    marginTop: 2,
  },
  emptyRoster: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyRosterText: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  label: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  input: {
    height: 56,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 20,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  colorPicker: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  saveBtn: {
    height: 60,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 2,
  },
  activeSessionGuard: {
    alignItems: "center",
    marginTop: 20,
  },
  linkBtn: {
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
  },
  linkBtnText: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1,
  }
});
