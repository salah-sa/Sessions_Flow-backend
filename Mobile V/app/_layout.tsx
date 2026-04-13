/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Root Layout
 * PARITY: Mirrors desktop main.tsx + App.tsx provider chain
 * ═══════════════════════════════════════════════════════════
 */

import { Stack, ErrorBoundary as ExpoErrorBoundary } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "../providers/AuthProvider";
import { ToastProvider } from "../providers/ToastProvider";
import { SignalRProvider } from "../providers/SignalRProvider";
import { ThemeProvider } from "../providers/ThemeProvider";
import { ConnectionBanner } from "../components/layout/ConnectionBanner";
import { OfflineOverlay } from "../components/layout/OfflineOverlay";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { theme } from "../shared/theme";
import { View, ActivityIndicator, Text, TouchableOpacity, AppState, AppStateStatus } from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { fetchWithAuth } from "../shared/api/client";
import { API_BASE_URL } from "../shared/api/config";
import * as SplashScreen from 'expo-splash-screen';
import { 
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold 
} from "@expo-google-fonts/inter";
import { Outfit_700Bold } from "@expo-google-fonts/outfit";
import { Sora_700Bold } from "@expo-google-fonts/sora";
import { useEffect } from "react";
import { useOfflineAttendanceSync } from "../shared/hooks/useOfflineAttendanceSync";
import { useNetworkRecovery } from "../hooks/useNetworkRecovery";
import { logger } from "../shared/lib/logger";
import "../shared/i18n";
import * as Sentry from "@sentry/react-native";
import { ErrorFallback } from "../components/ui/ErrorFallback";

// Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

// ── Sentry Initialization ──────
Sentry.init({
  dsn: 'https://placeholder@sentry.io/450', // Replace with real production DSN
  tracesSampleRate: 1.0,
  debug: __DEV__,
});

// ── Query Client — matches desktop main.tsx defaults ──────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes fresh — matches desktop
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
      refetchOnMount: true, // Refetch stale data on navigation
      refetchOnReconnect: true, // Refetch on network reconnect
      retry: 1,
    },
  },
});

/**
 * Inner component to handle splash logic while Auth hydrates
 */
function RootLayoutNav() {
  const { isHydrated } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Outfit_700Bold,
    Sora_700Bold,
  });
  // Phase 55: Auto-flush offline attendance records
  useOfflineAttendanceSync();
  // Phase 102: Self-healing network recovery
  useNetworkRecovery();

  useEffect(() => {
    if ((isHydrated && fontsLoaded) || fontError) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated, fontsLoaded, fontError]);

  // Phase 16: Heartbeat Engine
  useEffect(() => {
    logger.track("APP_MOUNT", { platform: Platform.OS });
    if (!isHydrated) return;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let appStateSub: any;

    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      // Ping immediately, then every 60s
      fetch(`${API_BASE_URL}/api/health/ping`).catch(() => {});
      heartbeatInterval = setInterval(() => {
        fetch(`${API_BASE_URL}/api/health/ping`).catch(() => {});
      }, 60_000);
    };

    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") {
        startHeartbeat();
      } else if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };

    startHeartbeat();
    appStateSub = AppState.addEventListener("change", handleAppState);

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (appStateSub) appStateSub.remove();
    };
  }, [isHydrated]);

  if (!isHydrated || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      contentStyle: { backgroundColor: theme.colors.bg } 
    }}>
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => <ErrorFallback error={error as Error} retry={resetError} />}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <SignalRProvider>
                  <StatusBar style="light" />
                  <ConnectionBanner />
                  <RootLayoutNav />
                  <OfflineOverlay />
                </SignalRProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </Sentry.ErrorBoundary>
  );
});

// Phase 95/97: Global error boundary for production resilience
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    // Phase 97: Log fault to telemetry hub
    logger.error("SYSTEM_HALTED", error);
  }, [error]);

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: "#020617", 
      justifyContent: "center", 
      alignItems: "center", 
      padding: 40 
    }}>
      <View style={{ 
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        backgroundColor: "rgba(239, 68, 68, 0.1)", 
        justifyContent: "center", 
        alignItems: "center", 
        marginBottom: 32 
      }}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
      
      <Text style={{ 
        color: "#fff", 
        fontSize: 20, 
        fontWeight: "900", 
        marginBottom: 12, 
        letterSpacing: 2 
      }}>SF_CORE_TERMINATED</Text>
      
      <Text style={{ 
        color: "rgba(255,255,255,0.5)", 
        textAlign: "center", 
        fontSize: 14, 
        lineHeight: 22,
        marginBottom: 40
      }}>
        An unrecoverable exception occurred in the communication stack. Logic reconciliation failed. Reboot required.
      </Text>

      <TouchableOpacity 
        accessibilityLabel="Reboot System"
        accessibilityRole="button"
        onPress={retry}
        style={{ 
          height: 60,
          minWidth: 200,
          backgroundColor: theme.colors.primary, 
          borderRadius: 16,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: theme.colors.primary,
          shadowRadius: 20,
          shadowOpacity: 0.2
        }}
      >
        <Text style={{ color: "#000", fontWeight: "900", fontSize: 13, letterSpacing: 2 }}>REBOOT SYSTEM</Text>
      </TouchableOpacity>
    </View>
  );
}
