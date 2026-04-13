import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
  Platform
} from "react-native";
import { theme } from "../../shared/theme";
import { GlassView } from "../ui/GlassView";
import { OptimizedList } from "../ui/OptimizedList";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextInput } from "react-native";
import { useSystemQueries, useAdminMutations } from "../../shared/queries/useAdminQueries";
import { Badge } from "../ui/Badge";
import { format, formatDistanceToNow } from "date-fns";
import { haptics } from "../../shared/lib/haptics";
import { Avatar } from "../ui/Avatar";
import { useToast } from "../../providers/ToastProvider";

type TabType = "pending" | "codes" | "engineers" | "audit";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Administrative Command Console
 * Phase 2: Core Admin Parity
 * ═══════════════════════════════════════════════════════════
 */

export const AdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const insets = useSafeAreaInsets();
  const { pendingEngineers, engineerCodes, allEngineers, auditLogs } = useSystemQueries();
  const { approveMutation, denyMutation, generateCodeMutation, revokeCodeMutation } = useAdminMutations();
  const { show: showToast } = useToast();

  const handleApprove = async (id: string) => {
    haptics.impact();
    try {
      await approveMutation.mutateAsync(id);
      showToast("Access Level Granted", "success");
    } catch (err) {
      showToast("Authorization Failed", "error");
    }
  };

  const handleDeny = async (id: string) => {
    haptics.impact();
    try {
      await denyMutation.mutateAsync(id);
      showToast("Access Request Denied", "info");
    } catch (err) {
      showToast("Operation Failed", "error");
    }
  };

  const handleGenerateCode = async () => {
    haptics.success();
    try {
      const code = await generateCodeMutation.mutateAsync();
      showToast("Cipher Token Generated", "success");
      Alert.alert("Token Generated", `New clearance code: ${code.code}`, [
        { text: "Copy", onPress: () => Share.share({ message: code.code }) },
        { text: "Dismiss" }
      ]);
    } catch (err) {
      showToast("Generation Failed", "error");
    }
  };

  const handleRevokeCode = async (id: string) => {
    haptics.impact();
    try {
      await revokeCodeMutation.mutateAsync(id);
      showToast("Cipher Token Revoked", "info");
    } catch (err) {
      showToast("Revocation Failed", "error");
    }
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "pending", label: "PENDING", icon: "person-add" },
    { id: "codes", label: "CIPHERS", icon: "key" },
    { id: "engineers", label: "NODES", icon: "shield" },
    { id: "audit", label: "AUDIT", icon: "terminal" },
  ];

    const filteredEngineers = React.useMemo(() => {
    return (allEngineers.data || []).filter(e => 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allEngineers.data, searchQuery]);

  const stats = [
    { label: "REQUESTS", value: pendingEngineers.data?.length || 0, color: theme.colors.warning, icon: "person-add" },
    { label: "TOKENS", value: engineerCodes.data?.filter(c => !c.isUsed).length || 0, color: theme.colors.primary, icon: "key" },
    { label: "NODES", value: allEngineers.data?.length || 0, color: theme.colors.success, icon: "shield" },
    { label: "EVENTS", value: auditLogs.data?.length || 0, color: theme.colors.textDim, icon: "terminal" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "pending":
        return (
          <OptimizedList
            data={pendingEngineers.data || []}
            renderItem={({ item }: { item: any }) => (
              <GlassView intensity={15} style={styles.card}>
                <View style={styles.cardHeader}>
                <Avatar userId={item.id} name={item.name} size={40} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>{item.email}</Text>
                  </View>
                  <Badge variant="warning">PENDING</Badge>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.approveBtn]} 
                    onPress={() => handleApprove(item.id)}
                    disabled={approveMutation.isPending}
                  >
                    <Text style={styles.approveBtnText}>GRANT ACCESS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.denyBtn]} 
                    onPress={() => handleDeny(item.id)}
                    disabled={denyMutation.isPending}
                  >
                    <Text style={styles.denyBtnText}>DENY</Text>
                  </TouchableOpacity>
                </View>
              </GlassView>
            )}
            loading={pendingEngineers.isLoading}
            onRefresh={pendingEngineers.refetch}
            emptyTitle="Clear Queue"
            emptyDescription="All registration requests have been settled."
          />
        );
      case "codes":
        return (
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateCode}>
              <Ionicons name="add" size={20} color="#000" />
              <Text style={styles.generateBtnText}>NEW CIPHER TOKEN</Text>
            </TouchableOpacity>
            <OptimizedList
              data={engineerCodes.data || []}
              renderItem={({ item }: { item: any }) => (
                <GlassView intensity={12} style={[styles.card, item.isUsed && styles.dimmedCard]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                      <Ionicons name="key-outline" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.tokenText}>{item.code}</Text>
                      <Text style={styles.cardSubtitle}>
                        {item.isUsed ? `REDEEMED BY ${item.usedByEngineerName?.toUpperCase()}` : "UNCLAIMED"}
                      </Text>
                    </View>
                    {!item.isUsed && (
                      <TouchableOpacity onPress={() => handleRevokeCode(item.id)}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </GlassView>
              )}
              loading={engineerCodes.isLoading}
              onRefresh={engineerCodes.refetch}
              emptyTitle="No Tokens Found"
              emptyDescription="Generate a new token to authorize new node engineers."
            />
          </View>
        );
      case "engineers":
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={theme.colors.textDim} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search nodes by name or email..."
                placeholderTextColor={theme.colors.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textDim} />
                </TouchableOpacity>
              )}
            </View>
            <OptimizedList
              data={filteredEngineers}
              renderItem={({ item }: { item: any }) => (
                <GlassView intensity={10} style={styles.card}>
                  <View style={styles.cardHeader}>
                  <Avatar userId={item.id} name={item.name} size={40} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.cardSubtitle}>{item.email}</Text>
                    </View>
                    <Badge variant={item.role === 'Admin' ? 'success' : 'primary'}>
                      {item.role?.toUpperCase() || 'UNIT'}
                    </Badge>
                  </View>
                  <View style={[styles.cardFooter, { marginTop: 8 }]}>
                    <Text style={styles.timestampText}>
                      JOINED {format(new Date(item.createdAt || Date.now()), "MMM dd, yyyy").toUpperCase()}
                    </Text>
                    {item.engineerCode && (
                      <Text style={styles.codeBadge}>{item.engineerCode}</Text>
                    )}
                  </View>
                </GlassView>
              )}
              loading={allEngineers.isLoading}
              onRefresh={allEngineers.refetch}
              emptyTitle="No Nodes Found"
              emptyDescription="Try adjusting your search query."
            />
          </View>
        );
      case "audit":
        return (
          <OptimizedList
            data={auditLogs.data || []}
            renderItem={({ item }: { item: any }) => (
              <GlassView intensity={10} style={styles.auditCard}>
                <View style={styles.auditLine}>
                  <View style={styles.auditIconBox}>
                    <Ionicons name="terminal-outline" size={12} color={theme.colors.textDim} />
                  </View>
                  <View style={styles.auditInfo}>
                    <Text style={styles.auditAction}>{item.action.toUpperCase()}</Text>
                    <Text style={styles.auditUser}>BY {item.userName?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.auditTime}>
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }).toUpperCase()}
                  </Text>
                </View>
                {item.details && (
                  <Text style={styles.auditDetails} numberOfLines={1}>{item.details}</Text>
                )}
              </GlassView>
            )}
            loading={auditLogs.isLoading}
            onRefresh={auditLogs.refetch}
            emptyTitle="Clear Audit Logs"
            emptyDescription="No security events recorded in this cycle."
          />
        );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 44 : 56 }]}>
      <View style={styles.statsContainer}>
        {stats.map((s, idx) => (
          <GlassView key={idx} intensity={12} style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name={s.icon as any} size={14} color={s.color} />
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
          </GlassView>
        ))}
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity 
            key={tab.id} 
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => {
              setSearchQuery(""); // Clear search when switching tabs
              haptics.selection();
              setActiveTab(tab.id);
            }}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.id ? theme.colors.primary : theme.colors.textDim} 
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  activeTab: {
    backgroundColor: "rgba(14, 165, 233, 0.1)",
  },
  tabLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1,
  },
  activeTabLabel: {
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  dimmedCard: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  approveBtn: {
    backgroundColor: theme.colors.primary,
  },
  approveBtnText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  denyBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  denyBtnText: {
    color: theme.colors.error,
    fontSize: 10,
    fontWeight: "900",
  },
  generateBtn: {
    height: 50,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  generateBtnText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(14, 165, 233, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  tokenText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  timestampText: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "800",
  },
  codeBadge: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  auditCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  auditLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  auditIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  auditInfo: {
    flex: 1,
  },
  auditAction: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
  auditUser: {
    color: theme.colors.primary,
    fontSize: 8,
    fontWeight: "900",
    marginTop: 1,
  },
  auditTime: {
    color: theme.colors.textDim,
    fontSize: 8,
    fontWeight: "700",
  },
  auditDetails: {
    color: theme.colors.textDim,
    fontSize: 10,
    marginTop: 6,
    paddingLeft: 32,
    opacity: 0.6,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: "48%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: theme.typography.h1.fontFamily,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    padding: 0,
  }
});
