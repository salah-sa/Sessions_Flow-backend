/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Sessions Stack Layout
 * Provides navigate-back capability for session detail screens.
 * ═══════════════════════════════════════════════════════════
 */

import { Stack } from "expo-router";
import { theme } from "../../../shared/theme";

export default function SessionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    />
  );
}
