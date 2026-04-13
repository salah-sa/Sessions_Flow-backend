/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Register Screen
 * Phase 16: High-Fidelity Aero Noir Registration
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
import { theme } from "../../shared/theme";
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
  withSpring
} from "react-native-reanimated";
import { useForm, Controller } from "react-hook-form";

const { width } = Dimensions.get("window");

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const { show: showToast } = useToast();
  const [regMode, setRegMode] = useState<"engineer" | "student">("engineer");

  const [pillWidth, setPillWidth] = useState(100);
  const pillStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(regMode === "engineer" ? 0 : pillWidth, { damping: 18, stiffness: 150 }) }]
    };
  }, [regMode, pillWidth]);

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
        showToast("Registration successful! An admin must approve your account.", "success");
      } else {
        await authApi.registerStudent({
          name: data.name,
          username: data.username,
          password: data.password,
          studentId: data.studentId,
          engineerCode: data.engineerCode,
        });
        showToast("Student registration successful! You can now log in.", "success");
      }
      router.replace("/(auth)/login");
    } catch (error: any) {
      console.error("[Register] Failed:", error);
      showToast(error.message || "Registration failed. Please check your data.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.header}>
          <Text style={styles.title}>Join <Text style={{ color: theme.colors.primary }}>Flow</Text></Text>
          <Text style={styles.subtitle}>SECURE NODE ACCESS</Text>
        </Animated.View>

        {/* Mode Toggle */}
        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.toggleContainer}>
          <View style={styles.toggleWrapper}
            onLayout={(e: LayoutChangeEvent) => {
              setPillWidth((e.nativeEvent.layout.width - 8) / 2); // 8 is total padding
            }}
          >
            {/* Animated Background Pill */}
            <Animated.View style={[styles.toggleActivePill, { width: pillWidth }, pillStyle]} />
            
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setRegMode("engineer")}
              style={styles.toggleButton}
            >
              <Text style={[styles.toggleText, regMode === "engineer" && styles.toggleTextActive]}>
                ENGINEER
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setRegMode("student")}
              style={styles.toggleButton}
            >
              <Text style={[styles.toggleText, regMode === "student" && styles.toggleTextActive]}>
                STUDENT
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Form Section */}
        <Animated.View entering={FadeInUp.delay(600).duration(800)} style={styles.card}>
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
              />
            )}
          />

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
                />
              )}
            />
          )}

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
              />
            )}
          />

          {regMode === "student" && (
            <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.studentExtra}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="studentId"
                    rules={{ required: "Required" }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="STUDENT ID"
                        placeholder="SID-..."
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCapitalize="characters"
                        error={errors.studentId?.message}
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
                      />
                    )}
                  />
                </View>
              </View>
            </Animated.View>
          )}

          <Button 
            title="CREATE ACCOUNT" 
            onPress={handleSubmit(onRegister)} 
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity 
            onPress={() => router.push("/(auth)/login")}
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>
              Already a member? <Text style={styles.loginHighlight}>Login</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.footer}>RESTRICTED ACCESS ONLY</Text>
      </ScrollView>

      {/* Ambient Blobs */}
      <View style={[styles.blob, { top: -50, right: -50, backgroundColor: theme.colors.primary + '11' }]} />
      <View style={[styles.blob, { bottom: -50, left: -50, backgroundColor: theme.colors.success + '08' }]} />
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    marginBottom: 32,
    alignItems: "center",
  },
  toggleWrapper: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 4,
    borderRadius: 100, // fully rounded like macOS pill
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    position: "relative",
  },
  toggleActivePill: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 100,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 100,
    zIndex: 2, // ensures text is above the absolute pill
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
  loginLink: {
    marginTop: 24,
    alignItems: "center",
  },
  loginText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontWeight: "500",
  },
  loginHighlight: {
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
  }
});
