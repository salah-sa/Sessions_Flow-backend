/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Login Screen
 * PARITY: Desktop StyleGradientAnimated.tsx
 * ═══════════════════════════════════════════════════════════
 *
 * Desktop reference:
 *  - Ambient nebula orbs (emerald/blue/cyan blur)
 *  - Glass card: rgba(15,23,42,0.75), backdrop-blur, emerald border
 *  - Top emerald→cyan→blue gradient accent bar
 *  - Staggered field entry (80ms intervals)
 *  - Error shake animation
 *  - Role switcher with spring pill
 *  - Emerald gradient submit button with glow shadow
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { theme, motion } from "../../shared/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authApi } from "../../shared/api/resources";
import { useAuthStore } from "../../shared/store/stores";
import { router } from "expo-router";
import { useToast } from "../../providers/ToastProvider";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../shared/lib/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"engineer" | "student">("engineer");
  const setAuth = useAuthStore((state) => state.setAuth);
  const { show: showToast } = useToast();

  const [pillWidth, setPillWidth] = useState(100);

  // Shake animation for error feedback (desktop: animate-shake)
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-4, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(-3, { duration: 60 }),
      withTiming(3, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  // Pill slide animation (desktop: spring stiffness:300, damping:30)
  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSpring(loginMode === "engineer" ? 0 : pillWidth, {
          damping: 30,
          stiffness: 300,
        }),
      },
    ],
  }), [loginMode, pillWidth]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      identifier: "",
      password: "",
      studentId: "",
      engineerCode: "",
    },
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
      haptics.error();
      triggerShake();
      showToast(
        error.message || "Login failed. Please check your credentials.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ═══ Ambient Nebula System (Desktop Shell parity) ═══ */}
      <View style={styles.nebulaLayer}>
        {/* Emerald orb — top-left */}
        <View style={[styles.nebula, styles.nebulaEmerald]} />
        {/* Blue orb — bottom-right */}
        <View style={[styles.nebula, styles.nebulaBlue]} />
        {/* Cyan orb — mid-right */}
        <View style={[styles.nebula, styles.nebulaCyan]} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ═══ Glass Card (desktop: card-aero style) ═══ */}
            <Animated.View
              entering={FadeInUp.delay(200).duration(900).springify()}
              style={shakeStyle}
            >
              {/* Top accent bar — emerald→cyan→blue gradient (desktop line 117-120) */}
              <LinearGradient
                colors={["#10B981", "#22D3EE", "#3B82F6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accentBar}
              />

              <View style={styles.card}>
                {/* ═══ Header ═══ */}
                <Animated.View
                  entering={FadeInDown.delay(300).duration(600)}
                  style={styles.header}
                >
                  <Text style={styles.title}>Welcome Back</Text>
                  <Text style={styles.subtitle}>
                    Sign in to continue your session
                  </Text>
                </Animated.View>

                {/* ═══ Role Switcher (desktop: spring pill) ═══ */}
                <Animated.View
                  entering={FadeInDown.delay(300 + motion.stagger.form).duration(600)}
                  style={styles.toggleContainer}
                >
                  <View
                    style={styles.toggleWrapper}
                    onLayout={(e: LayoutChangeEvent) => {
                      setPillWidth((e.nativeEvent.layout.width - 6) / 2);
                    }}
                  >
                    {/* Animated pill background */}
                    <Animated.View
                      style={[
                        styles.toggleActivePill,
                        { width: pillWidth },
                        pillStyle,
                      ]}
                    />

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        haptics.light();
                        setLoginMode("engineer");
                      }}
                      style={styles.toggleButton}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          loginMode === "engineer" && styles.toggleTextActive,
                        ]}
                      >
                        ENGINEER
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        haptics.light();
                        setLoginMode("student");
                      }}
                      style={styles.toggleButton}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          loginMode === "student" && styles.toggleTextActive,
                        ]}
                      >
                        STUDENT
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                {/* ═══ Form Fields (staggered entry: 80ms intervals) ═══ */}

                {/* Identifier */}
                <Animated.View
                  entering={FadeInDown.delay(300 + motion.stagger.form * 2).duration(600)}
                >
                  <Controller
                    control={control}
                    name="identifier"
                    rules={{ required: "Identifier is required" }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={
                          loginMode === "engineer"
                            ? "EMAIL"
                            : "USERNAME"
                        }
                        placeholder={
                          loginMode === "engineer"
                            ? "name@example.com"
                            : "Enter your username"
                        }
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={errors.identifier?.message}
                        autoCapitalize="none"
                        icon={
                          <Ionicons
                            name={loginMode === "engineer" ? "mail-outline" : "person-outline"}
                            size={16}
                            color={theme.colors.textMuted}
                          />
                        }
                      />
                    )}
                  />
                </Animated.View>

                {/* Password */}
                <Animated.View
                  entering={FadeInDown.delay(300 + motion.stagger.form * 3).duration(600)}
                >
                  <Controller
                    control={control}
                    name="password"
                    rules={{
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Min 6 characters",
                      },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="PASSWORD"
                        placeholder="••••••••"
                        secureTextEntry
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={errors.password?.message}
                        icon={
                          <Ionicons
                            name="lock-closed-outline"
                            size={16}
                            color={theme.colors.textMuted}
                          />
                        }
                      />
                    )}
                  />
                </Animated.View>

                {/* ═══ Student-only fields ═══ */}
                {loginMode === "student" && (
                  <Animated.View
                    entering={FadeInDown.duration(300)}
                    exiting={FadeOutUp.duration(200)}
                  >
                    <View style={styles.studentRow}>
                      <View style={{ flex: 1 }}>
                        <Controller
                          control={control}
                          name="studentId"
                          render={({
                            field: { onChange, onBlur, value },
                          }) => (
                            <Input
                              label="STUDENT ID"
                              placeholder="STU-2025-..."
                              onBlur={onBlur}
                              onChangeText={onChange}
                              value={value}
                              autoCapitalize="characters"
                              icon={
                                <Ionicons
                                  name="card-outline"
                                  size={16}
                                  color={theme.colors.textMuted}
                                />
                              }
                            />
                          )}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Controller
                          control={control}
                          name="engineerCode"
                          render={({
                            field: { onChange, onBlur, value },
                          }) => (
                            <Input
                              label="ENG CODE"
                              placeholder="ENG-..."
                              onBlur={onBlur}
                              onChangeText={onChange}
                              value={value}
                              autoCapitalize="characters"
                              icon={
                                <Ionicons
                                  name="key-outline"
                                  size={16}
                                  color={theme.colors.textMuted}
                                />
                              }
                            />
                          )}
                        />
                      </View>
                    </View>
                  </Animated.View>
                )}

                {/* ═══ Submit Button (desktop: emerald gradient with glow) ═══ */}
                <Animated.View
                  entering={FadeInDown.delay(300 + motion.stagger.form * 4).duration(600)}
                  style={styles.submitContainer}
                >
                  <Button
                    title="SIGN IN"
                    onPress={handleSubmit(onLogin)}
                    loading={loading}
                    style={styles.submitBtn}
                  />
                </Animated.View>

                {/* ═══ Footer — Register link ═══ */}
                <Animated.View
                  entering={FadeInDown.delay(300 + motion.stagger.form * 5).duration(600)}
                  style={styles.footerSection}
                >
                  <TouchableOpacity
                    onPress={() => router.push("/(auth)/register")}
                    style={styles.registerLink}
                  >
                    <Text style={styles.registerText}>
                      Don't have an account?{" "}
                      <Text style={styles.registerHighlight}>Sign up</Text>
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>

            <Text style={styles.copyright}>
              © 2026 SESSIONFLOW SYSTEMS
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0f1a", // Desktop Shell bg
  },

  // ── Ambient Nebula (match desktop Shell.tsx lines 51-56) ──
  nebulaLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    opacity: 0.25,
  },
  nebula: {
    position: "absolute",
    borderRadius: 9999,
  },
  nebulaEmerald: {
    top: "-15%",
    left: "-10%",
    width: "60%",
    height: "50%",
    backgroundColor: "rgba(16, 185, 129, 0.3)", // emerald-600/30
  },
  nebulaBlue: {
    bottom: "-20%",
    right: "-10%",
    width: "70%",
    height: "60%",
    backgroundColor: "rgba(37, 99, 235, 0.2)", // blue-600/20
  },
  nebulaCyan: {
    top: "30%",
    right: "-15%",
    width: "40%",
    height: "40%",
    backgroundColor: "rgba(34, 211, 238, 0.1)", // cyan-400/10
  },

  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: "center",
  },

  // ── Card (desktop: card-aero glass) ──
  accentBar: {
    height: 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.75)", // Desktop card-aero bg
    borderRadius: 24,
    borderTopLeftRadius: 0, // accent bar takes the top
    borderTopRightRadius: 0,
    padding: 24,
    paddingTop: 32,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "rgba(16, 185, 129, 0.1)", // emerald accent border
    // Desktop: box-shadow: 0 0 1px emerald, 0 0 20px emerald/7, 0 8px 32px rgba(0,0,0,0.5)
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },

  // ── Header ──
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22, // Desktop: text-[22px]
    fontFamily: "Sora_700Bold",
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 11, // Desktop: text-[11px]
    color: theme.colors.textMuted,
    marginTop: 4,
    fontWeight: "500",
  },

  // ── Role Switcher (desktop: emerald pill with spring) ──
  toggleContainer: {
    marginBottom: 20,
  },
  toggleWrapper: {
    flexDirection: "row",
    backgroundColor: "rgba(2, 6, 23, 0.6)", // slate-950/60
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    position: "relative",
  },
  toggleActivePill: {
    position: "absolute",
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: "rgba(16, 185, 129, 0.15)", // emerald-500/15
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)", // emerald-500/25
    // Desktop: shadow-[0_0_12px_rgba(16,185,129,0.15)]
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 11,
    zIndex: 2,
  },
  toggleText: {
    fontSize: 10, // Desktop: text-[10px]
    fontWeight: "900",
    color: theme.colors.textMuted, // slate-600
    letterSpacing: 1.5,
  },
  toggleTextActive: {
    color: "#10B981", // emerald-400
  },

  // ── Student Fields ──
  studentRow: {
    flexDirection: "row",
    gap: 12,
  },

  // ── Submit ──
  submitContainer: {
    marginTop: 8,
  },
  submitBtn: {
    backgroundColor: "#10B981", // Desktop: gradient from-emerald-600
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },

  // ── Footer ──
  footerSection: {
    marginTop: 20,
  },
  registerLink: {
    alignItems: "center",
  },
  registerText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  registerHighlight: {
    color: "#10B981", // Desktop: text-emerald-400
    fontWeight: "700",
  },
  copyright: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
