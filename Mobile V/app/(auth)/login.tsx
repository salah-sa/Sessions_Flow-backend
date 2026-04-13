/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Login Screen
 * Phase 15: High-Fidelity Aero Noir Entry
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  TouchableOpacity,
  Dimensions
} from "react-native";
import { theme } from "../../shared/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authApi } from "../../shared/api/resources";
import { useAuthStore } from "../../shared/store/stores";
import { router } from "expo-router";
import { useToast } from "../../providers/ToastProvider";
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { useForm, Controller } from "react-hook-form";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"engineer" | "student">("engineer");
  const setAuth = useAuthStore((state) => state.setAuth);
  const { show: showToast } = useToast();

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      identifier: "",
      password: "",
      studentId: "",
      engineerCode: "",
    }
  });

  const onLogin = async (data: any) => {
    setLoading(true);
    try {
      const response = await authApi.login({
        identifier: data.identifier,
        password: data.password,
        studentId: loginMode === "student" ? data.studentId : undefined,
        engineerCode: loginMode === "student" ? data.engineerCode : undefined,
      });

      await setAuth(response.user, response.token);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("[Login] Failed:", error);
      // Haptic feedback for error already happens in Button, but let's add specific alert here
      showToast(error.message || "Login failed. Please check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.header}>
          <Text style={styles.title}>
            Session<Text style={{ color: theme.colors.primary }}>Flow</Text>
          </Text>
          <Text style={styles.subtitle}>CREATIVE INTELLIGENCE</Text>
        </Animated.View>

        {/* Mode Toggle */}
        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.toggleContainer}>
          <TouchableOpacity 
            onPress={() => setLoginMode("engineer")}
            style={[styles.toggleButton, loginMode === "engineer" && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, loginMode === "engineer" && styles.toggleTextActive]}>
              ENGINEER
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setLoginMode("student")}
            style={[styles.toggleButton, loginMode === "student" && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, loginMode === "student" && styles.toggleTextActive]}>
              STUDENT
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Form Section */}
        <Animated.View entering={FadeInUp.delay(600).duration(800)} style={styles.card}>
          <Controller
            control={control}
            name="identifier"
            rules={{ required: "Identifier is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={loginMode === "engineer" ? "EMAIL / USERNAME" : "USERNAME"}
                placeholder="Enter your identifier"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.identifier?.message}
                autoCapitalize="none"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{ required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="PASSWORD"
                placeholder="••••••••"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          {loginMode === "student" && (
            <Animated.View entering={FadeInDown} style={styles.studentExtra}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="studentId"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="STUDENT ID"
                        placeholder="SID-..."
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCapitalize="characters"
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="engineerCode"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="ENG CODE"
                        placeholder="ENG-..."
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCapitalize="characters"
                      />
                    )}
                  />
                </View>
              </View>
            </Animated.View>
          )}

          <Button 
            title="LOGIN" 
            onPress={handleSubmit(onLogin)} 
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity 
            onPress={() => router.push("/(auth)/register")}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              Need access? <Text style={styles.registerHighlight}>Register</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.footer}>© 2026 SESSIONFLOW SYSTEMS</Text>
      </ScrollView>

      {/* Ambient Blobs */}
      <View style={[styles.blob, { top: -50, left: -50, backgroundColor: theme.colors.primary + '11' }]} />
      <View style={[styles.blob, { bottom: -50, right: -50, backgroundColor: theme.colors.success + '08' }]} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    flexGrow: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textDim,
    letterSpacing: 4,
    marginTop: 8,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 4,
    borderRadius: theme.radius.md,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: theme.radius.sm,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  toggleTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  studentExtra: {
    marginTop: 8,
  },
  submitBtn: {
    marginTop: 12,
  },
  registerLink: {
    marginTop: 24,
    alignItems: "center",
  },
  registerText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontWeight: "500",
  },
  registerHighlight: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 10,
    color: theme.colors.textDim,
    fontWeight: "700",
    letterSpacing: 2,
  },
  blob: {
    position: "absolute",
    width: width,
    height: width,
    borderRadius: width / 2,
    zIndex: -1,
    // Note: blurred views in RN require different techniques, 
    // but opacity + color works for basic ambient effect
  }
});
