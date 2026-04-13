/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Student Management Console
 * Phase 4: Full Feature Parity
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert
} from "react-native";
import { theme } from "../../shared/theme";
import { GlassView } from "../ui/GlassView";
import { OptimizedList } from "../ui/OptimizedList";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteStudents, useStudentMutations } from "../../shared/queries/useStudentQueries";
import { useGroups } from "../../shared/queries/useGroupQueries";
import { Badge } from "../ui/Badge";
import { haptics } from "../../shared/lib/haptics";
import { Avatar } from "../ui/Avatar";
import { useToast } from "../../providers/ToastProvider";
import { CinematicModal } from "../ui/CinematicModal";
import { Student } from "../../shared/types";

export const StudentConsole: React.FC = () => {
  const [search, setSearch] = useState("");
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    refetch 
  } = useInfiniteStudents({ search });
  
  const { deleteStudentMutation, updateStudentMutation } = useStudentMutations();
  const { data: groups } = useGroups();
  const { show: showToast } = useToast();

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");

  const students = useMemo(() => 
    data?.pages.flatMap(page => page.items) || [], 
  [data]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "TERMINATE STUDENT",
      `Are you sure you want to remove ${name?.toUpperCase()} from the system? This action cannot be undone.`,
      [
        { text: "CANCEL", style: "cancel" },
        { 
          text: "DELETE", 
          style: "destructive",
          onPress: async () => {
            haptics.impact();
            try {
              await deleteStudentMutation.mutateAsync(id);
              showToast("Student Removed from Matrix", "success");
            } catch (err) {
              showToast("Deletion Failed", "error");
            }
          }
        }
      ]
    );
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setEditName(student.name);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedStudent || !editName.trim()) return;
    haptics.impact();
    try {
      await updateStudentMutation.mutateAsync({ id: selectedStudent.id, name: editName });
      showToast("Student Profile Updated", "success");
      setIsEditModalOpen(false);
    } catch (err) {
      showToast("Update Rejected By Node", "error");
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <GlassView intensity={10} style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.colors.textDim} />
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH STUDENTS OR CODES..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            haptics.selection();
          }}
          autoCapitalize="characters"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textDim} />
          </TouchableOpacity>
        )}
      </GlassView>

      <OptimizedList
        data={students}
        renderItem={({ item }: { item: Student }) => (
          <GlassView intensity={15} style={styles.card}>
            <View style={styles.cardHeader}>
              <Avatar userId={item.id} name={item.name} size={44} avatarUrl={item.avatarUrl} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name?.toUpperCase()}</Text>
                <View style={styles.subInfo}>
                  <Text style={styles.cardSubtitle}>{item.uniqueStudentCode || "NO_CODE"}</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.cardSubtitle}>{item.group?.name?.toUpperCase() || "UNASSIGNED"}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </GlassView>
        )}
        loading={isLoading}
        refreshing={isLoading}
        onRefresh={refetch}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        isFetchingNextPage={isFetchingNextPage}
        emptyTitle="No Students Found"
        emptyDescription="Search query returned 0 results or system is empty."
        staggerAnimations
      />

      {/* Edit Modal */}
      <CinematicModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="EDIT STUDENT"
      >
        <View style={styles.modalContent}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholderTextColor="rgba(255,255,255,0.2)"
          />
          
          <Text style={[styles.label, { marginTop: 20 }]}>UNIQUE ACCESS CODE</Text>
          <GlassView intensity={10} style={styles.staticBox}>
            <Text style={styles.staticText}>{selectedStudent?.uniqueStudentCode || "N/A"}</Text>
          </GlassView>

          <TouchableOpacity 
            style={[styles.saveBtn, { marginTop: 32 }]} 
            onPress={handleUpdate}
            disabled={updateStudentMutation.isPending}
          >
            {updateStudentMutation.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveBtnText}>COMMIT CHANGES</Text>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginLeft: 12,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  subInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  cardSubtitle: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dot: {
    color: theme.colors.textDim,
    marginHorizontal: 6,
    fontSize: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: 24,
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
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  staticBox: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
  },
  staticText: {
    color: theme.colors.textDim,
    fontSize: 16,
    fontFamily: "monospace",
    letterSpacing: 1,
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
