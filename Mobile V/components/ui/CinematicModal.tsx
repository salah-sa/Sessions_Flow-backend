/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Cinematic Modal
 * Phase 6: Interaction System Parity
 * ═══════════════════════════════════════════════════════════
 * 
 * Desktop Modal parity:
 * - SlideInUp + Blur Fade entry animation
 * - Emerald vertical bar accent in header
 * - uppercase Sora title with tracking
 * - Dismiss haptic
 */

import React from "react";
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform 
} from "react-native";
import { theme } from "../../shared/theme";
import { GlassView } from "./GlassView";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown, ZoomIn } from "react-native-reanimated";
import { haptics } from "../../shared/lib/haptics";

interface CinematicModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const CinematicModal = ({ visible, onClose, title, subtitle, children }: CinematicModalProps) => {
  if (!visible) return null;

  const handleClose = () => {
    haptics.selection();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade" // React Native handles the fade, Reanimated handles the slide
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlayWrapper}
      >
        <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
          <View style={styles.overlayBackground} />
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={handleClose} 
          />
        </Animated.View>
        
        <Animated.View 
          // Desktop parity: animate-in zoom-in-95 slide-in-from-bottom-8
          entering={SlideInDown.springify().damping(20).stiffness(200)} 
          style={styles.modalContent}
        >
          <GlassView intensity={60} variant="aero" style={styles.container}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <View style={styles.headerAccent} />
                <View>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
              </View>
              
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.colors.textDim} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.body}>
              {children}
            </View>
          </GlassView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    width: "100%",
  },
  container: {
    width: "100%",
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAccent: {
    width: 3,
    height: 24,
    backgroundColor: theme.colors.primary, // Desktop uses brand-500 for the bar
    borderRadius: 9999,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h3.fontSize,
    fontFamily: theme.typography.fontFamily.sora,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  subtitle: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  body: {
    minHeight: 100,
  }
});
