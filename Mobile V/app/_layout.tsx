/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Root Layout
 * PARITY: Mirrors desktop main.tsx + App.tsx provider chain
 * ═══════════════════════════════════════════════════════════
 */

import { Stack, ErrorBoundary as ExpoErrorBoundary } from "expo-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "../providers/AuthProvider";
import { ToastProvider } from "../providers/ToastProvider";
import { SignalRProvider } from "../providers/SignalRProvider";
import { ThemeProvider } from "../providers/ThemeProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { theme } from "../shared/theme";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../providers/AuthProvider";
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
import "../shared/i18n";

// Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

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

// ── Query Persistence — AsyncStorage equivalent of desktop localStorage ──
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "sf_query_cache",
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

  useEffect(() => {
    if ((isHydrated && fontsLoaded) || fontError) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated, fontsLoaded, fontError]);

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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister, maxAge: 24 * 60 * 60 * 1000 }}
      >
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <SignalRProvider>
                <StatusBar style="light" />
                <RootLayoutNav />
              </SignalRProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

// Global error boundary for Expo Router
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Text style={{ color: "#ef4444", fontSize: 24, fontWeight: "900", marginBottom: 10 }}>CRITICAL ERROR</Text>
      <Text style={{ color: theme.colors.textDim, textAlign: "center", marginBottom: 20 }}>
        {error.message}
      </Text>
      <TouchableOpacity 
        onPress={retry}
        style={{ padding: 15, backgroundColor: theme.colors.primary, borderRadius: 12 }}
      >
        <Text style={{ color: "#000", fontWeight: "900" }}>REBOOT SYSTEM</Text>
      </TouchableOpacity>
    </View>
  );
}
