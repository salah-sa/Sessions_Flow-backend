import React from "react";
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from "react-native";
import { theme } from "../../shared/theme";
import * as Haptics from "expo-haptics";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline";
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const Button = ({ 
  title, 
  onPress, 
  loading, 
  variant = "primary", 
  style, 
  textStyle,
  disabled 
}: ButtonProps) => {
  const handlePress = () => {
    if (loading || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getVariantStyle = () => {
    switch (variant) {
      case "outline":
        return styles.outline;
      case "secondary":
        return styles.secondary;
      default:
        return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "outline":
        return { color: theme.colors.primary };
      default:
        return { color: theme.colors.text };
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button, 
        getVariantStyle(), 
        style,
        (disabled || loading) && styles.disabled
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? theme.colors.primary : "#fff"} />
      ) : (
        <Text style={[styles.text, getTextStyle(), textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: theme.typography.scale.base,
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: "700" as const,
  },
});
