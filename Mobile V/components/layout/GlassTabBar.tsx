/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Glass Search HUD
 * Phase 3: Navigation Shell Parity
 * ═══════════════════════════════════════════════════════════
 * 
 * Desktop Shell.tsx bottom navigation parity:
 * - Active tab emerald glow shadow
 * - Spring scale on interaction
 * - Hide on scroll integration
 */

import React, { useEffect } from "react";
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  Platform 
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { theme } from "../../shared/theme";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../shared/lib/haptics";
import { useRoleAccess } from "../auth/RoleGuard";
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  useSharedValue,
  FadeIn
} from "react-native-reanimated";

const TabItem = ({ route, index, isFocused, label, onPress }: any) => {
  const scale = useSharedValue(isFocused ? 1.15 : 1);
  const opacity = useSharedValue(isFocused ? 1 : 0.6);

  useEffect(() => {
    // Parity: Desktop spring physics
    scale.value = withSpring(isFocused ? 1.15 : 1, { damping: 12, stiffness: 150 });
    opacity.value = withTiming(isFocused ? 1 : 0.6, { duration: 200 });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  const getIcon = (name: string, focused: boolean) => {
    const size = 24;
    // Parity: Desktop uses emerald green for active navigation states in Sidebar.tsx
    const color = focused ? theme.colors.accent : theme.colors.textDim;
    switch (name) {
      case "index": return <Ionicons name={focused ? "grid" : "grid-outline"} size={size} color={color} />;
      case "groups": return <Ionicons name={focused ? "people" : "people-outline"} size={size} color={color} />;
      case "sessions": return <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />;
      case "chat": return <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={size} color={color} />;
      case "profile": return <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />;
      case "timetable": return <Ionicons name={focused ? "time" : "time-outline"} size={size} color={color} />;
      case "students": return <Ionicons name={focused ? "school" : "school-outline"} size={size} color={color} />;
      case "history": return <Ionicons name={focused ? "journal" : "journal-outline"} size={size} color={color} />;
      case "archive": return <Ionicons name={focused ? "archive" : "archive-outline"} size={size} color={color} />;
      default: return <Ionicons name="help-outline" size={size} color={color} />;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { if (!isFocused) scale.value = withSpring(0.9); }}
      onPressOut={() => { if (!isFocused) scale.value = withSpring(1); }}
      style={styles.tabItem}
    >
      <Animated.View style={[animatedIconStyle, { alignItems: 'center' }]}>
        {getIcon(route.name, isFocused)}
        <Text style={[
          styles.label, 
          { color: isFocused ? theme.colors.accent : theme.colors.textDim }
        ]}>
          {label}
        </Text>
      </Animated.View>
      {isFocused && (
        <Animated.View 
          entering={FadeIn.springify()}
          style={styles.indicator} 
        />
      )}
    </Pressable>
  );
};

export const GlassTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { isStudent } = useRoleAccess();

  // Temporary mapping for hide-on-scroll parity
  const hidden = false;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: hidden ? 100 : 0 }] }]}>
      <BlurView intensity={80} tint="dark" style={styles.blur}>
        <View style={styles.content}>
          <View style={styles.tabRow}>
            {state.routes.map((route, index) => {
              if (isStudent && (route.name === "groups" || route.name === "sessions")) {
                return null;
              }

              const { options } = descriptors[route.key];
              if (options.href === null) return null;

              const label = options.title !== undefined ? options.title : route.name;
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  haptics.selection();
                  navigation.navigate(route.name);
                }
              };

              return (
                <TabItem 
                  key={index}
                  route={route}
                  index={index}
                  isFocused={isFocused}
                  label={label}
                  onPress={onPress}
                />
              );
            })}
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    // Add safe area for newer iPhones
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  blur: {
    // Top border radius like a floating dock
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    overflow: "hidden",
    // Base shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: "rgba(16, 185, 129, 0.15)", // emerald accent border
    backgroundColor: "rgba(2, 6, 23, 0.5)", // slate-950 base
  },
  tabRow: {
    flexDirection: "row",
    height: Platform.OS === "ios" ? 64 : 74,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  label: {
    fontSize: 10, // match desktop tracking
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  indicator: {
    position: "absolute",
    top: -8, // relative to tabRow
    width: 32,
    height: 3,
    backgroundColor: theme.colors.accent,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    // Desktop parity: shadow-[4px_0_12px_rgba(16,185,129,0.4)]
    shadowColor: "#10B981", 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  }
});
