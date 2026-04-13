import React, { useState, useEffect } from "react";
import { 
  TextInput, 
  View, 
  Text, 
  StyleSheet, 
  TextInputProps,
  Pressable
} from "react-native";
import { theme } from "../../shared/theme";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  Easing,
  interpolateColor,
  FadeInDown
} from "react-native-reanimated";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = ({ label, error, icon, style, value, onFocus, onBlur, ...props }: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  
  // 0 = unfocused/empty, 1 = focused/hasValue
  const floatAnim = useSharedValue(value ? 1 : 0);
  
  // Track focus
  const handleFocus = (e: any) => {
    setIsFocused(true);
    floatAnim.value = withSpring(1, { damping: 15, stiffness: 120 });
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!value) {
      floatAnim.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
    }
    if (onBlur) onBlur(e);
  };

  // Ensure anim state is correct if value changes externally
  useEffect(() => {
    if (value && floatAnim.value === 0) {
      floatAnim.value = withSpring(1);
    }
  }, [value]);

  const labelStyle = useAnimatedStyle(() => {
    return {
      top: floatAnim.value === 1 ? -10 : 16,
      left: floatAnim.value === 1 ? 16 : (icon ? 44 : 16),
      fontSize: floatAnim.value === 1 ? 10 : 13,
      opacity: floatAnim.value === 1 ? 1 : 0.6,
      color: floatAnim.value === 1 ? theme.colors.primary : theme.colors.textMuted,
      backgroundColor: floatAnim.value === 1 ? theme.colors.bg : 'transparent',
      paddingHorizontal: floatAnim.value === 1 ? 4 : 0,
      zIndex: 10,
    };
  });

  const borderStyle = useAnimatedStyle(() => {
    return {
      borderColor: error 
        ? theme.colors.error 
        : floatAnim.value === 1 
          ? theme.colors.primary 
          : theme.colors.borderLight,
      borderWidth: floatAnim.value === 1 ? 1 : 1,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isFocused && !error ? 0.3 : 0,
      shadowRadius: 8,
      elevation: isFocused && !error ? 4 : 0,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inputWrapper, borderStyle]}>
        {label && (
          <Animated.Text style={[styles.floatingLabel, labelStyle]} pointerEvents="none">
            {label}
          </Animated.Text>
        )}
        
        <View style={styles.inputContainer}>
          {icon && (
            <View style={styles.iconContainer}>
              {icon}
            </View>
          )}
          <TextInput
            style={[
              styles.input, 
              icon ? { paddingLeft: 44 } : { paddingLeft: 16 },
              style
            ]}
            placeholderTextColor="transparent" // let the label act as placeholder
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        </View>
      </Animated.View>
      {error ? (
        <Animated.Text 
          entering={FadeInDown.springify()}
          style={styles.errorText}
        >
          {error}
        </Animated.Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
    width: "100%",
  },
  inputWrapper: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: theme.radius.md,
    height: 54,
    justifyContent: "center",
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
    justifyContent: 'center',
    width: 20,
    height: 20,
  },
  floatingLabel: {
    position: "absolute",
    fontWeight: "700",
    letterSpacing: 1,
  },
  input: {
    color: theme.colors.text,
    paddingRight: theme.spacing.md,
    fontSize: 15,
    height: "100%",
    width: "100%",
    marginTop: 4, // push down slightly so text doesn't overlap centered label position
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.caption.fontSize,
    marginTop: 6,
    fontWeight: "600",
    marginLeft: 4,
  },
});
