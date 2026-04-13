/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Tabs Layout
 * Phase 18: Main Navigation Hub
 * ═══════════════════════════════════════════════════════════
 */

import React from "react";
import { Tabs } from "expo-router";
import { theme } from "../../shared/theme";
import { GlassTabBar } from "../../components/layout/GlassTabBar";
import { useHeartbeat } from "../../hooks/useHeartbeat";
import { useRealtimeNotifications } from "../../hooks/useRealtimeNotifications";

export default function TabsLayout() {
  // Activate heartbeat + realtime hooks ONCE for entire authenticated session
  // PARITY: Same as desktop Shell.tsx
  useHeartbeat();
  useRealtimeNotifications();

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard" }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: "Groups" }}
      />
      <Tabs.Screen
        name="sessions"
        options={{ title: "Sessions" }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Chat" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile" }}
      />
      <Tabs.Screen
        name="timetable"
        options={{ href: null, title: "Timetable" }}
      />
      <Tabs.Screen
        name="students"
        options={{ href: null, title: "Students" }}
      />
      <Tabs.Screen
        name="history"
        options={{ href: null, title: "History" }}
      />
      <Tabs.Screen
        name="archive"
        options={{ href: null, title: "Archive" }}
      />
    </Tabs>
  );
}
