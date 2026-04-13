import React from "react";
import { 
  TextInput, 
  View, 
  Text, 
  StyleSheet, 
  TextInputProps 
} from "react-native";
import { theme } from "../../shared/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, style, ...props }: InputProps) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        error ? styles.inputError : null,
      ]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textDim}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: "100%",
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.caption.fontSize,
    marginBottom: theme.spacing.xs,
    fontWeight: "500",
  },
  inputWrapper: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 50,
    justifyContent: "center",
  },
  input: {
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.caption.fontSize,
    marginTop: theme.spacing.xs,
  },
});
