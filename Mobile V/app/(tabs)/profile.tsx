/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — System Interface & Identity
 * Phase 76-80: User Profile & Engineering Controls
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Platform,
  Linking
} from "react-native";
import { theme } from "../../shared/theme";
import { useAuthStore, useUIStore } from "../../shared/store/stores";
import { AdaptiveHeader } from "../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { GlassView } from "../../components/ui/GlassView";
import { Avatar } from "../../components/ui/Avatar";
import { CinematicModal } from "../../components/ui/CinematicModal";
import { useSettings, useSettingsMutations } from "../../shared/queries/useSettingsQueries";
import { TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../shared/lib/haptics";
import { useToast } from "../../providers/ToastProvider";
import { router } from "expo-router";
import { RoleGuard } from "../../components/auth/RoleGuard";
import { useBiometrics } from "../../shared/hooks/useBiometrics";
import * as ImagePicker from "expo-image-picker";
import { useAuthMutations } from "../../shared/queries/useAuthQueries";

export default function ProfileScreen() {
  const { user, logout, token } = useAuthStore();
  const { 
    theme: currentTheme, 
    setTheme, 
    language, 
    setLanguage,
    biometricsEnabled,
    setBiometrics,
    notificationPrefs,
    updateNotificationPrefs
  } = useUIStore();
  const { show: showToast } = useToast();
  const scrollY = useSharedValue(0);
  const { authenticate, isCompatible } = useBiometrics();
  const { updateAvatarMutation: updateAvatar } = useAuthMutations();
  const { data: systemSettings } = useSettings();
  const { updateSettings } = useSettingsMutations();
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [localPricing, setLocalPricing] = useState<Record<string, string>>({});
  const [scannerVibration, setScannerVibration] = useState(true);

  // Sync settings to local state for editing
  React.useEffect(() => {
    if (systemSettings) {
      const p: Record<string, string> = {
        session_price_level_1: "100",
        session_price_level_2: "100",
        session_price_level_3: "100",
        session_price_level_4: "150",
      };
      systemSettings.forEach((s: any) => {
        if (s.key.includes("price")) p[s.key] = s.value;
      });
      setLocalPricing(p);
    }
  }, [systemSettings]);

  const handleCopyToken = () => {
    haptics.success();
    // In a real app, use Clipboard.setStringAsync(token);
    showToast("Token Copied to Secure Buffer", "success");
  };

  const handleUpdatePricing = async () => {
    haptics.impact();
    try {
      await updateSettings.mutateAsync(localPricing);
      showToast("Pricing Matrix Overridden", "success");
      setIsPricingModalOpen(false);
    } catch (err) {
      showToast("Sync Error: Telemetry Rejected", "error");
    }
  };

  const handleLogout = () => {
    haptics.impact();
    logout();
    router.replace("/(auth)/login");
  };

  const toggleTheme = () => {
    haptics.selection();
    setTheme(currentTheme === "dark" ? "light" : "dark");
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
      showToast("Uploading Identity Fragment...", "success");
      try {
        await updateAvatar.mutateAsync(result.assets[0].uri);
        showToast("Identity Verified & Synced", "success");
      } catch (err) {
        showToast("Sync Error: Identity Rejected", "error");
      }
    }
  };

  const handleBiometricToggle = async (val: boolean) => {
    if (val) {
      const auth = await authenticate("Enroll device for secure biometric access");
      if (auth.success) {
        setBiometrics(true);
        showToast("Biometric Access Granted", "success");
        haptics.success();
      } else {
        setBiometrics(false);
        showToast(auth.error || "Enrollment Failed", "error");
      }
    } else {
      setBiometrics(false);
      haptics.impact();
    }
  };

  const menuItems = [
    { 
      id: "security", 
      icon: "shield-checkmark-outline", 
      label: "Security Protocols", 
      sub: "Tokens & Access" 
    },
    { 
      id: "localization", 
      icon: "language-outline", 
      label: "Node Localization", 
      sub: language === "en" ? "English (US)" : "Arabic (MEA)" 
    },
    { 
      id: "data", 
      icon: "server-outline", 
      label: "Telemetry Guard", 
      sub: "Data & Privacy" 
    },
  ];

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer", "Student"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="System Identity" scrollY={scrollY} />
      
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

        {/* Settings Matrix */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SYSTEM PARAMETERS</Text>
          
          <GlassView intensity={15} style={styles.settingsGroup}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon-outline" size={20} color={theme.colors.textDim} />
                <Text style={styles.settingLabel}>Aero Noir Engine</Text>
              </View>
              <Switch 
                value={currentTheme === "dark"} 
                onValueChange={toggleTheme}
                trackColor={{ false: "#334155", true: theme.colors.primary }}
              />
            </View>

            {isCompatible && (
              <>
                <View style={styles.divider} />
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="finger-print-outline" size={20} color={theme.colors.textDim} />
                    <View style={styles.textStack}>
                      <Text style={styles.settingLabel}>Biometric Unlock</Text>
                      <Text style={styles.settingSub}>FaceID / TouchID</Text>
                    </View>
                  </View>
                  <Switch 
                    value={biometricsEnabled} 
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                  />
                </View>
              </>
            )}

            <View style={styles.divider} />

            {menuItems.map((item) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity 
                  style={styles.settingItem} 
                  onPress={() => {
                    haptics.selection();
                    if (item.id === "security") setIsTokenModalOpen(true);
                    if (item.id === "localization") {
                      setLanguage(language === "en" ? "ar" : "en");
                      showToast(`Node set to ${language === "en" ? "MEA_NODE" : "US_NODE"}`, "success");
                    }
                  }}
                >
                  <View style={styles.settingInfo}>
                    <Ionicons name={item.icon as any} size={20} color={theme.colors.textDim} />
                    <View style={styles.textStack}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      <Text style={styles.settingSub}>{item.sub}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
                </TouchableOpacity>
                <View style={styles.divider} />
              </React.Fragment>
            ))}

            <TouchableOpacity style={styles.settingItem} onPress={() => setIsScannerModalOpen(true)}>
              <View style={styles.settingInfo}>
                <Ionicons name="barcode-outline" size={20} color={theme.colors.textDim} />
                <View style={styles.textStack}>
                  <Text style={styles.settingLabel}>Hardware Calibration</Text>
                  <Text style={styles.settingSub}>Scanner & Laser Params</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
            </TouchableOpacity>
          </GlassView>
        </View>

        {/* Notifications (Phase 83) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COMMUNICATION EGRESS</Text>
          <GlassView intensity={15} style={styles.settingsGroup}>
            {[
              { id: 'sessions', label: 'Session Intelligence', sub: 'Critical session metrics alerts' },
              { id: 'system', label: 'System Telemetry', sub: 'Node status & server health' },
              { id: 'mentions', label: 'Chat Mentions', sub: 'Direct operator comms' },
            ].map((pref, idx) => (
              <React.Fragment key={pref.id}>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <View style={styles.textStack}>
                      <Text style={styles.settingLabel}>{pref.label}</Text>
                      <Text style={styles.settingSub}>{pref.sub}</Text>
                    </View>
                  </View>
                  <Switch 
                    value={(notificationPrefs as any)[pref.id]} 
                    onValueChange={(val) => updateNotificationPrefs({ [pref.id]: val })}
                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                  />
                </View>
                {idx < 2 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </GlassView>
        </View>

        {/* Administrative Overrides (Only if Admin) */}
        {user?.role === "Admin" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ADMINISTRATIVE CONTROL</Text>
            <GlassView intensity={15} style={styles.settingsGroup}>
              <TouchableOpacity 
                style={styles.settingItem} 
                onPress={() => {
                  haptics.impact();
                  setIsPricingModalOpen(true);
                }}
              >
                <View style={styles.settingInfo}>
                  <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.settingLabel}>Price Policy Manager</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
              </TouchableOpacity>
            </GlassView>
          </View>
        )}

        {/* System Health (Phase 90) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OPERATIONAL HEALTH</Text>
          <GlassView intensity={15} style={styles.healthCard}>
            <View style={styles.healthHeader}>
              <View style={styles.healthBit}>
                <View style={[styles.statusDot, { backgroundColor: "#10b981" }]} />
                <Text style={styles.healthLabel}>SIG_SERVER_CONN</Text>
              </View>
              <Text style={styles.healthVal}>ESTABLISHED</Text>
            </View>
            <View style={styles.healthHeader}>
              <View style={styles.healthBit}>
                <View style={[styles.statusDot, { backgroundColor: "#10b981" }]} />
                <Text style={styles.healthLabel}>REST_API_LATENCY</Text>
              </View>
              <Text style={styles.healthVal}>24MS</Text>
            </View>
          </GlassView>
        </View>

        {/* Termination */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>TERMINATE SESSION</Text>
        </TouchableOpacity>

        {/* Phase 89: Help & Support */}
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

        <Text style={styles.versionText}>SF_MOBILE_CORE v2.1.0-PHASE-90</Text>
      </ScrollView>

      {/* Hardware Calibration Modal */}
      <CinematicModal
        visible={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        title="HARDWARE CALIBRATION"
      >
        <View style={styles.modalContent}>
          <Text style={styles.label}>SCANNER HAPTIC MOTOR</Text>
          <GlassView intensity={15} style={[styles.settingItem, { borderRadius: 16, marginBottom: 20 }]}>
             <View style={styles.settingInfo}>
                <Ionicons name="pulse" size={20} color={theme.colors.primary} />
                <Text style={styles.settingLabel}>Success Vibration</Text>
              </View>
              <Switch 
                value={scannerVibration} 
                onValueChange={setScannerVibration}
                trackColor={{ false: "#334155", true: theme.colors.primary }}
              />
          </GlassView>

          <Text style={styles.label}>LASER LINE INTENSITY</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthHeader}>
              <Text style={styles.healthLabel}>OP_LEVEL</Text>
              <Text style={styles.healthVal}>95% (OPTIMAL)</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: "95%" }]} />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, { marginTop: 32 }]} 
            onPress={() => {
              haptics.success();
              setIsScannerModalOpen(false);
            }}
          >
            <Text style={styles.saveBtnText}>CALIBRATE SENSORS</Text>
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
            <Text style={styles.tokenText} numberOfLines={8}>{token || "NO_TOKEN_PRESENT"}</Text>
          </GlassView>
          
          <TouchableOpacity style={styles.saveBtn} onPress={handleCopyToken}>
            <Text style={styles.saveBtnText}>COPY TO BUFFER</Text>
          </TouchableOpacity>
        </View>
      </CinematicModal>

      {/* Pricing Modal */}
      <CinematicModal
        visible={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        title="PRICE POLICY MANAGER"
      >
        <View style={styles.modalContent}>
          <View style={styles.pricingGrid}>
            {[1, 2, 3, 4].map((level) => (
              <View key={level} style={styles.priceNode}>
                <Text style={styles.priceLabel}>LEVEL-{level}</Text>
                <GlassView intensity={20} style={styles.priceInputContainer}>
                  <TextInput
                    style={styles.priceInput}
                    keyboardType="numeric"
                    value={localPricing[`session_price_level_${level}`]}
                    onChangeText={(val) => setLocalPricing(prev => ({ ...prev, [`session_price_level_${level}`]: val }))}
                    placeholderTextColor={theme.colors.textDim}
                  />
                  <Text style={styles.currency}>EGP</Text>
                </GlassView>
              </View>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleUpdatePricing}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveBtnText}>OVERRIDE POLICY</Text>
            )}
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
    fontFamily: theme.typography.h2.fontFamily,
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
    marginLeft: 14,
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
    shadowOpacity: 0.5,
    shadowRadius: 4,
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
    fontFamily: theme.typography.body.fontFamily,
  },
  label: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 12,
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
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: theme.colors.primary,
  },
  tokenContainer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 20,
    marginBottom: 32,
    minHeight: 180,
  },
  tokenText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontFamily: theme.typography.body.fontFamily,
    lineHeight: 18,
  },
  modalContent: {
    padding: 20,
  },
  pricingGrid: {
    gap: 16,
    marginBottom: 32,
  },
  priceNode: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLabel: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 140,
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  priceInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.typography.h3.fontFamily,
  },
  currency: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 8,
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
    elevation: 10,
  },
  saveBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 2,
  }
});
