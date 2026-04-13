import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { AdaptiveHeader } from '../components/layout/AdaptiveHeader';
import { useSharedValue } from 'react-native-reanimated';
import { theme } from '../shared/theme';
import { OptimizedList } from '../components/ui/OptimizedList';
import { RoleGuard } from '../components/auth/RoleGuard';
import { useInfiniteGroups, useGroupMutations } from '../shared/queries/useGroupQueries';
import { GlassView } from '../components/ui/GlassView';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../shared/lib/haptics';
import { useToast } from '../providers/ToastProvider';
import { router } from 'expo-router';

export default function ArchiveScreen() {
  const scrollY = useSharedValue(0);
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useInfiniteGroups({ status: "Archived" });
  const groups = data?.pages.flatMap(page => page.items) || [];
  const { updateMutation } = useGroupMutations();
  const { show: showToast } = useToast();

  const handleRestore = (id: string, name: string) => {
    Alert.alert(
        "RESTORE NODE",
        `Do you want to restore ${name.toUpperCase()} to active operation?`,
        [
            { text: "CANCEL", style: "cancel" },
            { 
                text: "RESTORE", 
                onPress: async () => {
                    haptics.impact();
                    try {
                        await updateMutation.mutateAsync({ id, data: { status: "Active" } });
                        showToast("Node Restored to Matrix", "success");
                    } catch (err) {
                        showToast("Restoration Failed", "error");
                    }
                }
            }
        ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <GlassView intensity={10} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.indicator, { backgroundColor: item.colorTag || theme.colors.textDim }]} />
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name.toUpperCase()}</Text>
          <Text style={styles.groupMeta}>{item.level} • {item.numberOfStudents} Students</Text>
        </View>
        <TouchableOpacity 
            style={styles.restoreBtn} 
            onPress={() => handleRestore(item.id, item.name)}
            disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={20} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </GlassView>
  );

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="TELEMETRY ARCHIVE" scrollY={scrollY} showBack onBack={() => router.back()} />
        
        <OptimizedList
          data={groups}
          renderItem={renderItem}
          loading={isLoading}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          emptyTitle="Archive Depleted"
          emptyDescription="All nodes are currently active in the matrix."
          staggerAnimations
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
    paddingBottom: 100,
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
  indicator: {
    width: 6,
    height: 32,
    borderRadius: 3,
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  groupMeta: {
    color: theme.colors.textDim,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  restoreBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
  }
});
