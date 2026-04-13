import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../../shared/theme";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  style?: ViewStyle;
}

export const EmptyState = ({ 
  icon = "cube-outline", 
  title, 
  description,
  style 
}: EmptyStateProps) => {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={64} color={theme.colors.textDim} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing["2xl"],
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  title: {
    fontSize: theme.typography.h3.fontSize,
    fontFamily: theme.typography.h3.fontFamily,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  description: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textDim,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
});
