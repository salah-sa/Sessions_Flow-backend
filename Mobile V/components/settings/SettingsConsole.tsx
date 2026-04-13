import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert
} from "react-native";
import { theme } from "../../shared/theme";
import { GlassView } from "../ui/GlassView";
import { Ionicons } from "@expo/vector-icons";
import { useSettings, useSettingsMutations } from "../../shared/queries/useSettingsQueries";
import { usePurgeMutation } from "../../shared/queries/useAdminQueries";
import { useImportMutations } from "../../shared/queries/useImportQueries";
import { useUIStore, useAuthStore } from "../../shared/store/stores";
import { haptics } from "../../shared/lib/haptics";
import { useToast } from "../../providers/ToastProvider";
import { Badge } from "../ui/Badge";
import { Avatar } from "../ui/Avatar";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — System Settings Console
 * Phase 3: Global Configuration & Parity
 * ═══════════════════════════════════════════════════════════
 */

export const SettingsConsole: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "Admin";
  const { 
    theme: currentTheme, setTheme, 
    language, setLanguage,
    biometricsEnabled, setBiometrics,
    notificationPrefs, updateNotificationPrefs
  } = useUIStore();
  const { show: showToast } = useToast();

  const { data: settingsData, isLoading: settingsLoading } = useSettings();
  const { updateSettings, testEmail } = useSettingsMutations();
  const { testConnection, previewImport, executeImport } = useImportMutations();
  const purgeMutation = usePurgeMutation();

  // Local state for admin settings
  const [appName, setAppName] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  
  // 3C School Import local state
  const [importEmail, setImportEmail] = useState("");
  const [importPassword, setImportPassword] = useState("");

  useEffect(() => {
    if (settingsData) {
      setAppName(settingsData.find((s: any) => s.key === "AppName")?.value || "");
      setSmtpHost(settingsData.find((s: any) => s.key === "SmtpHost")?.value || "");
      setSmtpPort(settingsData.find((s: any) => s.key === "SmtpPort")?.value || "");
      setAdminEmail(settingsData.find((s: any) => s.key === "admin_email")?.value || "");
    }
  }, [settingsData]);

  const handleSaveSystem = async () => {
    haptics.success();
    try {
      await updateSettings.mutateAsync({
        "AppName": appName,
        "SmtpHost": smtpHost,
        "SmtpPort": smtpPort,
        "admin_email": adminEmail
      });
      showToast("System Parameters Updated", "success");
    } catch (err) {
      showToast("Save Failed", "error");
    }
  };

  const handlePurge = () => {
    Alert.alert(
      "EXTERMINATE ALL DATA",
      "This will erase all groups, students, and sessions. This action is IRREVERSIBLE. Are you absolute sure?",
      [
        { text: "ABORT", style: "cancel" },
        { 
          text: "EXECUTE PURGE", 
          style: "destructive", 
          onPress: async () => {
            haptics.warning();
            try {
              await purgeMutation.mutateAsync();
              showToast("Data Core Purged", "success");
            } catch (err) {
              showToast("Purge Failed", "error");
            }
          } 
        }
      ]
    );
  };

  const renderSection = (label: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <GlassView intensity={10} style={styles.sectionContent}>
        {children}
      </GlassView>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* PROFILE SECTION */}
      {user && renderSection("YOUR PROFILE", (
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Avatar 
              userId={user.id} 
              name={user.name} 
              avatarUrl={user.avatarUrl} 
              profileImage={(user as any).profileImage}
              size={64} 
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View style={styles.profileBadges}>
                <Badge label={user.role} variant="primary" />
                {user.studentId && <Badge label={`ID: ${user.studentId}`} variant="dim" />}
              </View>
            </View>
          </View>
        </View>
      ))}

      {/* APPEARANCE (Common) */}
      {renderSection("VISUAL INTERFACE", (
        <>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelGroup}>
              <Ionicons name="moon-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingText}>Dark Mode Interface</Text>
            </View>
            <Switch 
              value={currentTheme === "dark"} 
              onValueChange={(val) => {
                haptics.impact();
                setTheme(val ? "dark" : "light");
              }}
              trackColor={{ false: "#334155", true: theme.colors.primary }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLabelGroup}>
              <Ionicons name="language-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingText}>Platform Language</Text>
            </View>
            <TouchableOpacity 
              style={styles.selector}
              onPress={() => {
                haptics.selection();
                setLanguage(language === "en" ? "ar" : "en");
              }}
            >
              <Text style={styles.selectorText}>{language === "en" ? "ENGLISH" : "العربية"}</Text>
              <Ionicons name="swap-horizontal" size={14} color={theme.colors.textDim} />
            </TouchableOpacity>
          </View>
        </>
      ))}

      {/* DEVICE ABILITIES (Common) */}
      {renderSection("IDENTITY & NOTIFICATIONS", (
        <>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelGroup}>
              <Ionicons name="finger-print-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingText}>Biometric Core Access</Text>
            </View>
            <Switch 
              value={biometricsEnabled} 
              onValueChange={(val) => {
                haptics.impact();
                setBiometrics(val);
              }}
              trackColor={{ false: "#334155", true: theme.colors.primary }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLabelGroup}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Switch 
              value={notificationPrefs.system} 
              onValueChange={(val) => {
                haptics.impact();
                updateNotificationPrefs({ system: val });
              }}
              trackColor={{ false: "#334155", true: theme.colors.primary }}
            />
          </View>
        </>
      ))}

      {/* ADMIN CONFIGURATION (Admin Only) */}
      {isAdmin && (
        <>
          {renderSection("SYSTEM PARAMETERS", (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>PLATFORM IDENTIFIER</Text>
              <TextInput 
                style={styles.input}
                value={appName}
                onChangeText={setAppName}
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <Text style={styles.inputLabel}>ADMINISTRATOR NOTIFICATION EMAIL</Text>
              <TextInput 
                style={styles.input}
                value={adminEmail}
                onChangeText={setAdminEmail}
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSaveSystem}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveBtnText}>COMMIT CHANGES</Text>}
              </TouchableOpacity>
            </View>
          ))}

          {renderSection("SMTP GATEWAY (EMAIL)", (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>SMTP HOST</Text>
              <TextInput 
                style={styles.input}
                value={smtpHost}
                onChangeText={setSmtpHost}
                placeholder="e.g. smtp.gmail.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <Text style={styles.inputLabel}>SMTP PORT</Text>
              <TextInput 
                style={styles.input}
                value={smtpPort}
                onChangeText={setSmtpPort}
                placeholder="e.g. 587"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
              />
              <TouchableOpacity 
                style={styles.actionLink} 
                onPress={() => {
                  if (!adminEmail) return showToast("Enter Admin Email First", "info");
                  testEmail.mutate(adminEmail);
                  showToast("Test Signal Sent", "info");
                }}
              >
                <Ionicons name="paper-plane-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.actionLinkText}>SEND TEST SIGNAL</Text>
              </TouchableOpacity>
            </View>
          ))}

          {renderSection("3C SCHOOL DATA SYNC", (
            <View style={styles.form}>
              <Text style={styles.infoText}>Import groups and students directly from the 3C School system.</Text>
              <TextInput 
                style={styles.input}
                value={importEmail}
                onChangeText={setImportEmail}
                placeholder="3C School Email"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <TextInput 
                style={styles.input}
                value={importPassword}
                onChangeText={setImportPassword}
                placeholder="3C School Password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry
              />
              <View style={styles.rowActions}>
                <TouchableOpacity 
                  style={[styles.miniBtn, { flex: 1.5 }]}
                  onPress={() => previewImport.mutate({ email: importEmail, password: importPassword })}
                >
                  <Text style={styles.miniBtnText}>PREVIEW NODES</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.miniBtn, styles.dangerBtn, { flex: 1 }]}
                  onPress={() => executeImport.mutate({ email: importEmail, password: importPassword })}
                >
                  <Text style={[styles.miniBtnText, { color: "#fff" }]}>EXECUTE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {renderSection("CRITICAL OPERATIONS", (
            <TouchableOpacity style={styles.purgeBtn} onPress={handlePurge}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.purgeBtnText}>PURGE ALL OPERATIONAL DATA</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.versionText}>SESSIONFLOW MOBILE v1.2.4-ALPHA</Text>
        <Text style={styles.buildText}>BUILDID: 20260413_PARITY_P3</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  profileSection: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginBottom: 8,
  },
  profileBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  settingLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 16,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  selectorText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
  },
  form: {
    padding: 16,
    gap: 12,
  },
  inputLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: theme.colors.textDim,
    letterSpacing: 1,
  },
  input: {
    height: 44,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  saveBtn: {
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  actionLinkText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
  },
  infoText: {
    color: theme.colors.textDim,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  rowActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  miniBtn: {
    height: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  miniBtnText: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: "900",
  },
  dangerBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  purgeBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  purgeBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
    gap: 4,
  },
  versionText: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },
  buildText: {
    color: theme.colors.textDim,
    fontSize: 7,
    fontWeight: "600",
    opacity: 0.4,
  }
});
