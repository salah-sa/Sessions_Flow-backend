import { Stack } from "expo-router";
import React from "react";
import { theme } from "../../shared/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="login" options={{ animation: "fade" }} />
      <Stack.Screen name="register" options={{ animation: "fade" }} />
    </Stack>
  );
}
