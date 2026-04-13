/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Timetable & Availability Console
 * Phase 4: Full Feature Parity
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { theme } from "../../shared/theme";
import { GlassView } from "../ui/GlassView";
import { Ionicons } from "@expo/vector-icons";
import { useTimetableEntries, useTimetableMutations } from "../../shared/queries/useTimetableQueries";
import { format } from "date-fns";
import { haptics } from "../../shared/lib/haptics";
import { useToast } from "../../providers/ToastProvider";
import { CinematicModal } from "../ui/CinematicModal";
import { TimetableEntry } from "../../shared/types";
import { useAuthStore } from "../../shared/store/stores";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const TimetableConsole: React.FC = () => {
  const { user } = useAuthStore();
  const { data, isLoading } = useTimetableEntries();
  const { updateAvailabilityMutation } = useTimetableMutations();
  const { show: showToast } = useToast();

  const [editingDay, setEditingDay] = useState<TimetableEntry | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const handleDayToggle = async (entry: TimetableEntry) => {
    if (user?.role !== "Engineer") return;
    haptics.selection();
    try {
      const updated = { ...entry, isAvailable: !entry.isAvailable };
      await updateAvailabilityMutation.mutateAsync([updated]);
      showToast(`${DAYS[entry.dayOfWeek]} Status Updated`, "success");
    } catch (err) {
      showToast("Sync Error", "error");
    }
  };

  const handleOpenEdit = (entry: TimetableEntry) => {
    if (user?.role !== "Engineer") return;
    setEditingDay(entry);
    setEditStart(entry.startTime || "09:00");
    setEditEnd(entry.endTime || "17:00");
  };

  const handleCommitEdit = async () => {
    if (!editingDay) return;
    haptics.impact();
    try {
      const updated = { ...editingDay, startTime: editStart, endTime: editEnd };
      await updateAvailabilityMutation.mutateAsync([updated]);
      showToast("Operational Window Updated", "success");
      setEditingDay(null);
    } catch (err) {
      showToast("Verification Failed", "error");
    }
  };

  if (isLoading) {
    return <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />;
  }

  const availability = data?.availability || [];
  // Sort by dayOfWeek (Sun=0 ...)
  const sortedAvailability = [...availability].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <View style={styles.container}>
      <Text style={styles.infoLabel}>WEEKLY OPERATIONAL WINDOWS</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {sortedAvailability.map((day) => (
          <GlassView key={day.id} intensity={day.isAvailable ? 15 : 5} style={[styles.dayCard, !day.isAvailable && styles.disabledCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.dayInfo}>
                <Text style={styles.dayName}>{DAYS[day.dayOfWeek].toUpperCase()}</Text>
                <Text style={styles.dayStatus}>
                  {day.isAvailable ? "AVAILABLE FOR SESSIONS" : "OFF-DUTY / RESTING"}
                </Text>
              </View>
              {user?.role === "Engineer" && (
                 <TouchableOpacity onPress={() => handleDayToggle(day)} style={styles.toggleBtn}>
                   <Ionicons 
                    name={day.isAvailable ? "radio-button-on" : "radio-button-off"} 
                    size={24} 
                    color={day.isAvailable ? theme.colors.primary : theme.colors.textDim} 
                   />
                 </TouchableOpacity>
              )}
            </View>

            {day.isAvailable && (
              <View style={styles.timeSection}>
                <View style={[styles.timeSlot, { flex: 1 }]}>
                  <Ionicons name="time-outline" size={14} color={theme.colors.textDim} />
                  <Text style={styles.timeText}>{day.startTime} — {day.endTime}</Text>
                </View>
                {user?.role === "Engineer" && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEdit(day)}>
                    <Text style={styles.editBtnText}>EDIT WINDOW</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </GlassView>
        ))}
      </ScrollView>

      {/* Edit Modal */}
      <CinematicModal
        visible={!!editingDay}
        onClose={() => setEditingDay(null)}
        title="MODIFY WINDOW"
      >
        <View style={styles.modalContent}>
          <Text style={styles.label}>{editingDay ? DAYS[editingDay.dayOfWeek].toUpperCase() : ""} OPERATIONAL LIMITS</Text>
          
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>OPENING UNIT</Text>
              <TextInput 
                style={styles.input}
                value={editStart}
                onChangeText={setEditStart}
                placeholder="HH:mm"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>
            <View style={{ width: 20 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>CLOSING UNIT</Text>
              <TextInput 
                style={styles.input}
                value={editEnd}
                onChangeText={setEditEnd}
                placeholder="HH:mm"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, { marginTop: 32 }]} 
            onPress={handleCommitEdit}
            disabled={updateAvailabilityMutation.isPending}
          >
            {updateAvailabilityMutation.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveBtnText}>SYNC TO CALENDAR</Text>
            )}
          </TouchableOpacity>
        </View>
      </CinematicModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 2,
    marginBottom: 20,
    marginLeft: 4,
  },
  dayCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  disabledCard: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  dayStatus: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  toggleBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  timeSection: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeSlot: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  timeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  editBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  editBtnText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  modalContent: {
    padding: 24,
  },
  label: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 24,
  },
  subLabel: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
  },
  input: {
    height: 56,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 18,
    fontFamily: "monospace",
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  saveBtn: {
    height: 60,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  saveBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 2,
  }
});
