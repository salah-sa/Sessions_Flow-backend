/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Register Screen
 * PARITY: Desktop Auth System
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
  Dimensions,
  LayoutChangeEvent
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { theme, motion } from "../../shared/theme";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authApi } from "../../shared/api/resources";
import { router } from "expo-router";
import { useToast } from "../../providers/ToastProvider";
import Animated, { 
  FadeInDown, 
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue
} from "react-native-reanimated";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../shared/lib/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const { show: showToast } = useToast();
  const [regMode, setRegMode] = useState<"engineer" | "student">("engineer");

  const [pillWidth, setPillWidth] = useState(100);

  // Shake animation for error feedback
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }]
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

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(regMode === "engineer" ? 0 : pillWidth, { damping: 30, stiffness: 300 }) }]
  }), [regMode, pillWidth]);

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      studentId: "",
      engineerCode: "",
    }
  });

  const onRegister = async (data: any) => {
    setLoading(true);
    try {
      if (regMode === "engineer") {
        await authApi.register({
          name: data.name,
          email: data.email,
          password: data.password,
        });
        haptics.success();
        showToast("Registration successful! An admin must approve your account.", "success");
      } else {
        await authApi.registerStudent({
          name: data.name,
          username: data.username,
          password: data.password,
          studentId: data.studentId,
          engineerCode: data.engineerCode,
        });
        haptics.success();
        showToast("Student registration successful! You can now log in.", "success");
      }
      router.replace("/(auth)/login");
    } catch (error: any) {
      console.error("[Register] Failed:", error);
      haptics.error();
      triggerShake();
      showToast(error.message || "Registration failed. Please check your data.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ═══ Ambient Nebula System (Desktop parity) ═══ */}
      <View style={styles.nebulaLayer}>
        <View style={[styles.nebula, styles.nebulaEmerald]} />
        <View style={[styles.nebula, styles.nebulaBlue]} />
        <View style={[styles.nebula, styles.nebulaCyan]} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          
            {/* ═══ Glass Card ═══ */}
            <Animated.View entering={FadeInUp.delay(200).duration(900).springify()} style={shakeStyle}>
              {/* Top accent bar */}
              <LinearGradient
                colors={["#10B981", "#22D3EE", "#3B82F6"]}
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={styles.accentBar}
              />

              <View style={styles.card}>
                {/* ═══ Header ═══ */}
                <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.header}>
                  <Text style={styles.title}>Create Account</Text>
                  <Text style={styles.subtitle}>Join SessionFlow Systems</Text>
                </Animated.View>

                {/* ═══ Role Switcher ═══ */}
                <Animated.View entering={FadeInDown.delay(300 + motion.stagger.form).duration(600)} style={styles.toggleContainer}>
                  <View style={styles.toggleWrapper}
                    onLayout={(e: LayoutChangeEvent) => {
                      setPillWidth((e.nativeEvent.layout.width - 6) / 2);
                    }}
                  >
                    <Animated.View style={[styles.toggleActivePill, { width: pillWidth }, pillStyle]} />
                    
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => {
                        haptics.light();
                        setRegMode("engineer");
                      }}
                      style={styles.toggleButton}
                    >
                      <Text style={[styles.toggleText, regMode === "engineer" && styles.toggleTextActive]}>
                        ENGINEER
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => {
                        haptics.light();
                        setRegMode("student");
                      }}
                      style={styles.toggleButton}
                    >
                      <Text style={[styles.toggleText, regMode === "student" && styles.toggleTextActive]}>
                        STUDENT
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                {/* ═══ Form Fields (staggered) ═══ */}
                <Animated.View entering={FadeInDown.delay(300 + motion.stagger.form * 2).duration(600)}>
                  <Controller
                    control={control}
                    name="name"
                    rules={{ required: "Full name is required" }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="FULL NAME"
                        placeholder="John Doe"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={errors.name?.message}
                        icon={<Ionicons name="person-outline" size={16} color={theme.colors.textMuted} />}
                      />
                    )}
                  />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300 + motion.stagger.form * 3).duration(600)}>
                  {regMode === "engineer" ? (
                    <Controller
                      control={control}
                      name="email"
                      rules={{ required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email" } }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="EMAIL ADDRESS"
                          placeholder="name@example.com"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          error={errors.email?.message}
                          autoCapitalize="none"
                          icon={<Ionicons name="mail-outline" size={16} color={theme.colors.textMuted} />}
                        />
                      )}
                    />
                  ) : (
                    <Controller
                      control={control}
                      name="username"
                      rules={{ required: "Username is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="CHOOSE USERNAME"
                          placeholder="johndoe"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          error={errors.username?.message}
                          autoCapitalize="none"
                          icon={<Ionicons name="at" size={16} color={theme.colors.textMuted} />}
                        />
                      )}
                    />
                  )}
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300 + motion.stagger.form * 4).duration(600)}>
                  <Controller
                    control={control}
                    name="password"
                    rules={{ required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="SECRET PASSWORD"
                        placeholder="••••••••"
                        secureTextEntry
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={errors.password?.message}
                        icon={<Ionicons name="lock-closed-outline" size={16} color={theme.colors.textMuted} />}
                      />
                    )}
                  />
                </Animated.View>

                {regMode === "student" && (
                  <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(200)} style={styles.studentExtra}>
                    <View style={styles.studentRow}>
                      <View style={{ flex: 1 }}>
                        <Controller
                          control={control}
                          name="studentId"
                          rules={{ required: "Required" }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                              label="STUDENT ID"
                              placeholder="STU-..."
                              onBlur={onBlur}
                              onChangeText={onChange}
                              value={value}
                              autoCapitalize="characters"
                              error={errors.studentId?.message}
                              icon={<Ionicons name="card-outline" size={16} color={theme.colors.textMuted} />}
                            />
                          )}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Controller
                          control={control}
                          name="engineerCode"
                          rules={{ required: "Required" }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                              label="ENG CODE"
                              placeholder="ENG-..."
                              onBlur={onBlur}
                              onChangeText={onChange}
                              value={value}
                              autoCapitalize="characters"
                              error={errors.engineerCode?.message}
                              icon={<Ionicons name="key-outline" size={16} color={theme.colors.textMuted} />}
                            />
                          )}
                        />
                      </View>
                    </View>
                  </Animated.View>
                )}

                {/* ═══ Submit Button ═══ */}
                <Animated.View entering={FadeInDown.delay(300 + motion.stagger.form * 5).duration(600)} style={styles.submitContainer}>
                  <Button 
                    title="CREATE ACCOUNT" 
                    onPress={handleSubmit(onRegister)} 
                    loading={loading}
                    style={styles.submitBtn}
                  />
                </Animated.View>

                {/* ═══ Footer — Login link ═══ */}
                <Animated.View entering={FadeInDown.delay(300 + motion.stagger.form * 6).duration(600)} style={styles.footerSection}>
                  <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={styles.loginLink}>
                    <Text style={styles.loginText}>
                      Already a member? <Text style={styles.loginHighlight}>Log in</Text>
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>

            <Text style={styles.copyright}>© 2026 SESSIONFLOW SYSTEMS</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0f1a",
  },

  // ── Ambient Nebula ──
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
    backgroundColor: "rgba(16, 185, 129, 0.3)",
  },
  nebulaBlue: {
    bottom: "-20%",
    right: "-10%",
    width: "70%",
    height: "60%",
    backgroundColor: "rgba(37, 99, 235, 0.2)",
  },
  nebulaCyan: {
    top: "30%",
    right: "-15%",
    width: "40%",
    height: "40%",
    backgroundColor: "rgba(34, 211, 238, 0.1)",
  },

  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: "center",
  },

  // ── Card ──
  accentBar: {
    height: 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 24,
    paddingTop: 32,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "rgba(16, 185, 129, 0.1)",
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
    fontSize: 22,
    fontFamily: "Sora_700Bold",
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontWeight: "500",
  },

  // ── Role Switcher ──
  toggleContainer: {
    marginBottom: 20,
  },
  toggleWrapper: {
    flexDirection: "row",
    backgroundColor: "rgba(2, 6, 23, 0.6)",
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
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
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
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
  },
  toggleTextActive: {
    color: "#10B981",
  },

  // ── Student Fields ──
  studentExtra: {
    marginTop: 0,
  },
  studentRow: {
    flexDirection: "row",
    gap: 12,
  },

  // ── Submit ──
  submitContainer: {
    marginTop: 8,
  },
  submitBtn: {
    backgroundColor: "#10B981",
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
  loginLink: {
    alignItems: "center",
  },
  loginText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  loginHighlight: {
    color: "#10B981",
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
