/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Tactical Operations Center
 * Phase 67-73: Session Execution & Attendance Engine
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  TextInput
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../../../shared/theme";
import { useSession, useSessionMutations, useSessionAttendance } from "../../../shared/queries/useSessionQueries";
import { useAuthStore } from "../../../shared/store/stores";
import { AdaptiveHeader } from "../../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { GlassView } from "../../../components/ui/GlassView";
import { RadarHUD } from "../../../components/ui/RadarHUD";
import { Badge } from "../../../components/ui/Badge";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { haptics } from "../../../shared/lib/haptics";
import { AttendanceStatus } from "../../../shared/types";
import { useToast } from "../../../providers/ToastProvider";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

import { CinematicModal } from "../../../components/ui/CinematicModal";

export default function SessionExecutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show: showToast } = useToast();
  const scrollY = useSharedValue(0);
  
  const { data: session, isLoading: sessionLoading } = useSession(id as string);
  const { data: attendance = [], isLoading: attendanceLoading } = useSessionAttendance(id as string);
  const { startMutation, endMutation, updateAttendanceMutation } = useSessionMutations();
  
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [isEnding, setIsEnding] = useState(false);
  const [notes, setNotes] = useState("");

  const pricing = { 1: 100, 2: 100, 3: 100, 4: 150 };
  const projectedRevenue = useMemo(() => {
    const level = session?.groupLevel || 1;
    return pricing[level as keyof typeof pricing] || 150;
  }, [session]);

  const handleEnd = async () => {
    haptics.impact();
    try {
      await endMutation.mutateAsync({ id: id as string, notes });
      setIsEnding(false);
      showToast("Mission Concluded", "success");
      router.replace("/(tabs)");
    } catch (err) {
      showToast("Sync Error", "error");
    }
  };

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session?.status === "Active" && session.startedAt) {
      interval = setInterval(() => {
        const start = new Date(session.startedAt!).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        
        const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
        
        setElapsedTime(`${h}:${m}:${s}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session]);

  const handleStart = async () => {
    haptics.impact();
    try {
      await startMutation.mutateAsync(id as string);
      showToast("Operation Started", "success");
    } catch (err) {
      showToast("Access Denied", "error");
    }
  };

  const handleToggleAttendance = async (studentId: string, currentStatus: AttendanceStatus) => {
    if (session?.status !== "Active") {
      showToast("Session not active", "error");
      return;
    }
    
    haptics.selection();
    const nextStatus: AttendanceStatus = 
      currentStatus === "Unmarked" ? "Present" : 
      currentStatus === "Present" ? "Absent" : 
      currentStatus === "Absent" ? "Late" : "Present";
    
    try {
      await updateAttendanceMutation.mutateAsync({
        id: id as string,
        records: [{ studentId, status: nextStatus }]
      });
    } catch (err) {
      showToast("Sync Error", "error");
    }
  };

  const presentCount = useMemo(() => 
    attendance.filter(r => r.status === "Present" || r.status === "Late").length
  , [attendance]);

  if (sessionLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdaptiveHeader 
        title={session?.groupName || "Operation"} 
        scrollY={scrollY} 
        showBack={true}
        onBack={() => router.back()}
      />
      
      <ScrollView 
        onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Hub */}
        <View style={styles.hub}>
          <RadarHUD presentCount={presentCount} totalCount={attendance.length} />
          
          {session?.status === "Active" && (
            <GlassView intensity={30} style={styles.timerCard}>
              <Text style={styles.timerSub}>ACTIVE DURATION</Text>
              <Text style={styles.timerText}>{elapsedTime}</Text>
            </GlassView>
          )}

          {session?.status === "Scheduled" && (
            <TouchableOpacity onPress={handleStart} style={styles.startBtn}>
              <Ionicons name="play" size={24} color="#000" />
              <Text style={styles.startBtnText}>START OPERATION</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Attendance Roster */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PERSONNEL ROSTER</Text>
          <Badge count={attendance.length} variant="outline" />
        </View>

        <View style={styles.grid}>
          {attendance?.map((record) => (
            <TouchableOpacity 
              key={record.studentId}
              onPress={() => handleToggleAttendance(record.studentId, record.status)}
            >
              <GlassView 
                intensity={record.status === "Unmarked" ? 10 : 30} 
                style={[
                  styles.studentCard,
                  record.status === "Present" && styles.presentCard,
                  record.status === "Absent" && styles.absentCard,
                  record.status === "Late" && styles.lateCard,
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{record.student?.name?.[0] || "?"}</Text>
                </View>
                <Text style={styles.studentName} numberOfLines={1}>{record.student?.name}</Text>
                <Text style={styles.statusLabel}>{record.status.toUpperCase()}</Text>
              </GlassView>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Action Bar */}
      {session?.status === "Active" && (
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={styles.endBtn}
            onPress={() => {
              haptics.impact();
              setIsEnding(true);
            }}
          >
            <Text style={styles.endBtnText}>CONCLUDE MISSION</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* End Session Modal */}
      <CinematicModal 
        visible={isEnding} 
        onClose={() => setIsEnding(false)}
        title="CONCLUDE MISSION"
      >
        <View style={styles.modalContent}>
          <View style={styles.revenueSummary}>
            <View style={styles.revenueIcon}>
              <Ionicons name="wallet" size={24} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.revenueSub}>PROJECTED REVENUE</Text>
              <Text style={styles.revenueVal}>{projectedRevenue.toLocaleString()} EGP</Text>
            </View>
          </View>

          <Text style={styles.label}>DEPLOYMENT NOTES</Text>
          <GlassView intensity={20} style={styles.notesContainer}>
            <TextInput
              style={styles.notesInput}
              placeholder="Record observations..."
              placeholderTextColor={theme.colors.textDim}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </GlassView>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setIsEnding(false)}
            >
              <Text style={styles.cancelText}>ABORT</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.confirmBtn}
              onPress={handleEnd}
              disabled={endMutation.isPending}
            >
              {endMutation.isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.confirmText}>CONFIRM CONCLUSION</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CinematicModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingTop: 110,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  hub: {
    marginBottom: 30,
  },
  timerCard: {
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    marginTop: -40,
    marginHorizontal: 30,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
  },
  timerSub: {
    fontSize: 8,
    fontWeight: "900",
    color: theme.colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 32,
    fontFamily: theme.typography.fontFamily.sora,
    color: "#fff",
    fontWeight: "900",
    letterSpacing: -1,
  },
  startBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 20,
    marginTop: 20,
  },
  startBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
    marginLeft: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  studentCard: {
    width: CARD_WIDTH,
    padding: 15,
    borderRadius: 24,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  presentCard: {
    borderColor: "rgba(16, 185, 129, 0.4)",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  absentCard: {
    borderColor: "rgba(239, 68, 68, 0.4)",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  lateCard: {
    borderColor: "rgba(245, 158, 11, 0.4)",
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  studentName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  endBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  endBtnText: {
    color: "#ef4444",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 2,
  },
  modalContent: {
    padding: 20,
  },
  revenueSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  revenueIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  revenueSub: {
    fontSize: 9,
    fontWeight: "900",
    color: theme.colors.primary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  revenueVal: {
    fontSize: 24,
    fontFamily: theme.typography.fontFamily.sora,
    fontWeight: "900",
    color: "#fff",
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
  },
  notesContainer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 32,
    minHeight: 120,
  },
  notesInput: {
    padding: 16,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  confirmBtn: {
    flex: 2,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  cancelText: {
    color: theme.colors.textDim,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  confirmText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  }
});
