/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — High-Speed Attendance Scanner
 * Module 6: Hardware & Offline Intelligence
 * Phase 51: Camera Ecosystem & Permissions
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput 
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../../../shared/theme";
import { useSessionAttendance, useSessionMutations } from "../../../shared/queries/useSessionQueries";
import { useAuthStore, useAppStore, useSessionStore } from "../../../shared/store/stores";
import { CinematicModal } from "../../../components/ui/CinematicModal";
import { GlassView } from "../../../components/ui/GlassView";
import { haptics } from "../../../shared/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  FadeIn, 
  FadeOut, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  useSharedValue 
} from "react-native-reanimated";

export default function ScannerScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const { updateAttendanceMutation } = useSessionMutations();
  const { data: attendance = [] } = useSessionAttendance(sessionId);
  const isOnline = useAppStore(s => s.isOnline);
  const { queueAttendanceUpdate } = useSessionStore();

  const handleManualSubmit = () => {
    if (!manualCode) return;
    handleBarCodeScanned({ data: manualCode, type: "manual" } as BarcodeScanningResult);
    setManualCode("");
    setManualInputVisible(false);
  };

  const scanLineY = useSharedValue(0);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(260, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const animatedScanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (!scanning || !sessionId) return;
    
    const code = result.data;
    if (code === lastScanned) return; // Prevent double scanning same code immediately

    setScanning(false);
    setLastScanned(code);
    haptics.impact();

    // Strategy: Parse student code (e.g. "STU-123" or just "123")
    // For this simulation, we assume result.data is the studentId or Code
    const student = attendance.find(r => r.student?.username === code || r.studentId === code);

    if (student) {
      try {
        if (isOnline) {
          await updateAttendanceMutation.mutateAsync({
            id: sessionId,
            records: [{ studentId: student.studentId, status: "Present" }]
          });
          haptics.success();
        } else {
          // Phase 55: Queue for later
          queueAttendanceUpdate(sessionId, { studentId: student.studentId, status: "Present" });
          haptics.success();
          // Update local cache optimistically
        }
      } catch (err) {
        haptics.error();
      }
    } else {
      haptics.warning();
    }

    // Resume scanning after 1.5 seconds
    setTimeout(() => {
      setScanning(true);
      setLastScanned(null);
    }, 1500);
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <GlassView intensity={40} style={styles.permissionCard}>
          <Ionicons name="camera" size={64} color={theme.colors.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.permissionTitle}>CAMERA ACCESS REQUIRED</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan student QR codes for attendance tracking.
          </Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>GRANT ACCESS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: theme.colors.textDim }}>CANCEL</Text>
          </TouchableOpacity>
        </GlassView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128"],
        }}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <Text style={styles.headerText}>OPERATIONAL OVERRIDE</Text>
              <View style={styles.statusDot} />
            </View>
            <TouchableOpacity 
              onPress={() => setManualInputVisible(true)}
              style={styles.manualEntryBtn}
            >
              <Ionicons name="keypad" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Viewport Finder */}
          <View style={styles.finderContainer}>
            <View style={styles.finder}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              <Animated.View 
                style={[styles.scanLine, animatedScanLineStyle]} 
              />
            </View>
            <Text style={styles.hint}>
              {lastScanned ? `PROCESSED: ${lastScanned}` : "Align QR Code within the frame"}
            </Text>
          </View>

          {/* Footer UI */}
          <View style={styles.footer}>
            <GlassView intensity={30} style={styles.infoCard}>
              <Text style={styles.infoText}>SYSTEM ARMED</Text>
              <Text style={styles.subInfoText}>READY FOR OPTICAL TELEMETRY</Text>
            </GlassView>
          </View>
        </View>
      </CameraView>

      <CinematicModal 
        visible={manualInputVisible} 
        onClose={() => setManualInputVisible(false)}
        title="MANUAL OVERRIDE"
      >
        <Text style={styles.manualHint}>
          Enter Student ID or Username manually if optical scanning is unavailable.
        </Text>
        <GlassView intensity={20} style={styles.inputContainer}>
          <TextInput
            style={styles.manualInput}
            placeholder="STU-XXXX..."
            placeholderTextColor={theme.colors.textDim}
            value={manualCode}
            onChangeText={setManualCode}
            autoFocus
            autoCapitalize="characters"
          />
        </GlassView>
        <TouchableOpacity style={styles.submitBtn} onPress={handleManualSubmit}>
          <Text style={styles.submitBtnText}>INJECT IDENTIFIER</Text>
        </TouchableOpacity>
      </CinematicModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  manualEntryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
  },
  finderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  finder: {
    width: 260,
    height: 260,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: theme.colors.primary,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: theme.colors.primary,
    top: 0,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  hint: {
    color: "#fff",
    marginTop: 24,
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  footer: {
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  infoCard: {
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
  },
  infoText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  subInfoText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 1,
  },
  manualHint: {
    color: theme.colors.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 24,
  },
  manualInput: {
    height: 60,
    paddingHorizontal: 20,
    color: "#fff",
    fontSize: 20,
    fontFamily: theme.typography.fontFamily.sora,
    fontWeight: "700",
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  permissionCard: {
    width: "100%",
    padding: 32,
    borderRadius: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  permissionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 12,
  },
  permissionText: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  grantBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  grantBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
  }
});
