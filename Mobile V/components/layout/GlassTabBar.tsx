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
  interpolateColor,
  FadeIn
} from "react-native-reanimated";

const TabItem = ({ route, index, isFocused, label, onPress }: any) => {
  const scale = useSharedValue(isFocused ? 1.1 : 1);
  const opacity = useSharedValue(isFocused ? 1 : 0.6);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.15 : 1, { damping: 12, stiffness: 150 });
    opacity.value = withTiming(isFocused ? 1 : 0.6, { duration: 200 });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  const getIcon = (name: string, focused: boolean) => {
    const size = 24;
    const color = focused ? theme.colors.primary : theme.colors.textDim;
    switch (name) {
      case "index": return <Ionicons name={focused ? "grid" : "grid-outline"} size={size} color={color} />;
      case "groups": return <Ionicons name={focused ? "people" : "people-outline"} size={size} color={color} />;
      case "sessions": return <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />;
      case "chat": return <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={size} color={color} />;
      case "profile": return <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />;
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
          { color: isFocused ? theme.colors.primary : theme.colors.textDim }
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

  // Temporary mapping for hide-on-scroll parity -- default visible.
  const hidden = false; // Phase 13 placeholder hook

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: hidden ? 100 : 0 }] }]}>
      <BlurView intensity={80} tint="dark" style={styles.blur}>
        <View style={styles.content}>
          {state.routes.map((route, index) => {
            if (isStudent && (route.name === "groups" || route.name === "sessions")) {
              return null;
            }

            const { options } = descriptors[route.key];
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
    height: Platform.OS === "ios" ? 88 : 74,
  },
  blur: {
    flex: 1,
    overflow: "hidden",
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  content: {
    flexDirection: "row",
    height: "100%",
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: 24,
    height: 4,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  }
});
