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

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Cinematic Modal
 * Phase 31: Deep Dark Focus Surface
 * ═══════════════════════════════════════════════════════════
 */

interface CinematicModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const CinematicModal = ({ visible, onClose, title, children }: CinematicModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <GlassView intensity={50} style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.colors.textDim} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.body}>
            {children}
          </View>
        </GlassView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  container: {
    width: "100%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h3.fontSize,
    fontFamily: theme.typography.fontFamily.sora,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    minHeight: 100,
  }
});
