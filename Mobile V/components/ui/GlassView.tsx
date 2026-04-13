import React from "react";
import { View, StyleSheet, ViewProps, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { theme } from "../../shared/theme";

interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: "light" | "dark" | "default";
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const GlassView = ({ 
  children, 
  intensity = 30, 
  tint = "dark", 
  borderRadius = theme.radius.md,
  borderWidth = 1,
  borderColor = "rgba(255,255,255,0.08)",
  style,
  ...props 
}: GlassViewProps) => {
  return (
    <View style={[
      styles.outer, 
      { borderRadius, borderWidth, borderColor },
      style
    ]} {...props}>
      <BlurView 
        intensity={intensity} 
        tint={tint} 
        style={[styles.blur, { borderRadius }]}
      >
        <View style={styles.inner}>
          {children}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  blur: {
    flex: 1,
  },
  inner: {
    padding: theme.spacing.md,
  }
});
