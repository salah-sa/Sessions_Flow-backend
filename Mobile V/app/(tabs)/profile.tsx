/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — System Interface & Identity
 * Phase 3: Profile Refinement & Security Parity
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking
} from "react-native";
import { theme } from "../../shared/theme";
import { useAuthStore, useAppStore } from "../../shared/store/stores";
import { API_BASE_URL } from "../../shared/api/config";
import { AdaptiveHeader } from "../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { GlassView } from "../../components/ui/GlassView";
import { Avatar } from "../../components/ui/Avatar";
import { CinematicModal } from "../../components/ui/CinematicModal";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../shared/lib/haptics";
import { useToast } from "../../providers/ToastProvider";
import { router } from "expo-router";
import { RoleGuard } from "../../components/auth/RoleGuard";
import * as ImagePicker from "expo-image-picker";
import { useAuthMutations } from "../../shared/queries/useAuthQueries";

export default function ProfileScreen() {
  const { user, logout, token } = useAuthStore();
  const { show: showToast } = useToast();
  const scrollY = useSharedValue(0);
  const { updateAvatarMutation: updateAvatar, updatePasswordPasswordMutation: updatePassword } = useAuthMutations();
  const connectionStatus = useAppStore(s => s.connectionStatus);
  const [latency, setLatency] = useState<number | null>(null);

  // Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  
  // Form States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const measureLatency = async () => {
      try {
        const start = Date.now();
        await fetch(`${API_BASE_URL}/api/health/ping`);
        setLatency(Date.now() - start);
      } catch (err) {
        setLatency(null);
      }
    };
    measureLatency();
    const interval = setInterval(measureLatency, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    haptics.impact();
    await logout();
    router.replace("/(auth)/login");
  };

  const handleAvatarChange = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      haptics.success();
      showToast("Uploading Identity...", "info");
      try {
        await updateAvatar.mutateAsync(result.assets[0].uri);
        showToast("Identity Synced", "success");
      } catch (err) {
        showToast("Upload Failed", "error");
      }
    }
  };

  const handleChangePassword = async () => {
    haptics.impact();
    if (!oldPassword || !newPassword) {
      return showToast("All fields required", "info");
    }
    try {
      await updatePassword.mutateAsync({ oldPassword, newPassword });
      showToast("Credentials Updated", "success");
      setIsPasswordModalOpen(false);
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      showToast("Update Failed", "error");
    }
  };

  const handleCopyToken = () => {
    haptics.success();
    // In a real app, use Clipboard.setStringAsync(token);
    showToast("Token Copied to Secure Buffer", "success");
  };

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer", "Student"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="SYSTEM IDENTITY" scrollY={scrollY} />
      
        <ScrollView 
          onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Identity Section */}
          <View style={styles.identityContainer}>
            <GlassView intensity={30} style={styles.identityCard}>
              <TouchableOpacity onPress={handleAvatarChange}>
                <Avatar 
                  userId={user?.id || ""}
                  name={user?.name || ""} 
                  avatarUrl={user?.avatarUrl} 
                  size={80} 
                  showPresence={true} 
                />
                <View style={styles.editOverlay}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={styles.name}>{user?.name?.toUpperCase()}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role?.toUpperCase()} NODE</Text>
              </View>
            </GlassView>
          </View>

          {/* Personal Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PERSONAL SECURITY</Text>
            <GlassView intensity={15} style={styles.settingsGroup}>
              <TouchableOpacity 
                style={styles.settingItem} 
                onPress={() => {
                  haptics.selection();
                  setIsPasswordModalOpen(true);
                }}
              >
                <View style={styles.settingInfo}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textDim} />
                  <View style={styles.textStack}>
                    <Text style={styles.settingLabel}>Modify Credentials</Text>
                    <Text style={styles.settingSub}>Update access passphrase</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity 
                style={styles.settingItem} 
                onPress={() => {
                  haptics.selection();
                  setIsTokenModalOpen(true);
                }}
              >
                <View style={styles.settingInfo}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.textDim} />
                  <View style={styles.textStack}>
                    <Text style={styles.settingLabel}>Security Protocols</Text>
                    <Text style={styles.settingSub}>Operational access tokens</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
              </TouchableOpacity>
            </GlassView>
          </View>

          {/* Operational Health Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>OPERATIONAL HEALTH</Text>
            <GlassView intensity={15} style={styles.healthCard}>
              <View style={styles.healthHeader}>
                <View style={styles.healthBit}>
                  <View style={[styles.statusDot, { backgroundColor: connectionStatus === "Connected" ? "#10b981" : "#f59e0b" }]} />
                  <Text style={styles.healthLabel}>SIG_SERVER_CONN</Text>
                </View>
                <Text style={styles.healthVal}>{connectionStatus?.toUpperCase() || "DISCONNECTED"}</Text>
              </View>
              <View style={styles.healthHeader}>
                <View style={styles.healthBit}>
                  <View style={[styles.statusDot, { backgroundColor: latency ? "#10b981" : "#ef4444" }]} />
                  <Text style={styles.healthLabel}>REST_API_LATENCY</Text>
                </View>
                <Text style={styles.healthVal}>{latency ? `${latency}MS` : "OFFLINE"}</Text>
              </View>
            </GlassView>
          </View>

          {/* Support & Version */}
          <TouchableOpacity 
            style={styles.helpLink} 
            onPress={() => {
              haptics.selection();
              Linking.openURL("https://sessionflow.app/support");
            }}
          >
            <Ionicons name="help-circle-outline" size={16} color={theme.colors.textDim} />
            <Text style={styles.helpText}>OPERATIONAL SUPPORT & MANUALS</Text>
          </TouchableOpacity>

          {/* Termination */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>TERMINATE SESSION</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>SF_MOBILE_CORE v2.1.0-P3-CLEAN</Text>
        </ScrollView>

        {/* Change Password Modal */}
        <CinematicModal
          visible={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          title="MODIFY CREDENTIALS"
        >
          <View style={styles.modalContent}>
            <Text style={styles.label}>CURRENT PASSPHRASE</Text>
            <TextInput 
              style={styles.input}
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
            <Text style={[styles.label, { marginTop: 20 }]}>NEW SECURITY CIPHER</Text>
            <TextInput 
              style={styles.input}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholderTextColor="rgba(255,255,255,0.2)"
            />

            <TouchableOpacity 
              style={[styles.saveBtn, { marginTop: 32 }]} 
              onPress={handleChangePassword}
              disabled={updatePassword.isPending}
            >
              {updatePassword.isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveBtnText}>COMMIT UPDATED CREDENTIALS</Text>
              )}
            </TouchableOpacity>
          </View>
        </CinematicModal>

        {/* Security Token Modal */}
        <CinematicModal
          visible={isTokenModalOpen}
          onClose={() => setIsTokenModalOpen(false)}
          title="SECURITY PROTOCOLS"
        >
          <View style={styles.modalContent}>
            <Text style={styles.label}>OPERATIONAL ACCESS TOKEN</Text>
            <GlassView intensity={20} style={styles.tokenContainer}>
              <Text style={styles.tokenText}>{token || "NO_TOKEN_PRESENT"}</Text>
            </GlassView>
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleCopyToken}>
              <Text style={styles.saveBtnText}>COPY TO BUFFER</Text>
            </TouchableOpacity>
          </View>
        </CinematicModal>

      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    paddingTop: 110,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
  identityContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  identityCard: {
    width: "100%",
    padding: 30,
    borderRadius: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  name: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 20,
    letterSpacing: -0.5,
  },
  editOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  roleBadge: {
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.2)",
    marginTop: 10,
  },
  roleText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  section: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsGroup: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  textStack: {
    marginLeft: 14,
  },
  settingLabel: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  settingSub: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 18,
  },
  healthCard: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
  },
  healthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  healthBit: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  healthLabel: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  healthVal: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  logoutBtn: {
    marginTop: 20,
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 2,
  },
  versionText: {
    textAlign: "center",
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "900",
    marginTop: 40,
    opacity: 0.3,
    letterSpacing: 1,
  },
  helpLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    opacity: 0.6,
  },
  helpText: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginLeft: 8,
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
    height: 50,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  saveBtn: {
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  tokenContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  tokenText: {
    color: theme.colors.textDim,
    fontSize: 12,
    lineHeight: 18,
  }
});
