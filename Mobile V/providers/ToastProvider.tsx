import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { theme } from "../shared/theme";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../shared/lib/haptics";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Toast Provider
 * Phase 30: Aero Noir Feedback System
 * ═══════════════════════════════════════════════════════════
 */

type ToastType = "success" | "error" | "info" | "warning";

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback((msg: string, t: ToastType = "info") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setMessage(msg);
    setType(t);
    setVisible(true);

    // Haptics
    if (t === "success") haptics.success();
    else if (t === "error") haptics.error();
    else haptics.impact();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    timeoutRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 3000);
  }, []);

  const getIcon = () => {
    switch (type) {
      case "success": return "checkmark-circle";
      case "error": return "alert-circle";
      case "warning": return "warning";
      default: return "information-circle";
    }
  };

  const getColor = () => {
    switch (type) {
      case "success": return theme.colors.success;
      case "error": return theme.colors.error;
      case "warning": return theme.colors.warning;
      default: return theme.colors.primary;
    }
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {visible && (
        <Animated.View style={[
          styles.container, 
          { 
            opacity: fadeAnim, 
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })}]
          }
        ]}>
          <View style={[styles.toast, { borderLeftColor: getColor() }]}>
            <Ionicons name={getIcon()} size={20} color={getColor()} style={styles.icon} />
            <Text style={styles.message}>{message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  }
});
