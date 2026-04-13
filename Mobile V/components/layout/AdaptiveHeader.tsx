import React from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  Platform, 
  TouchableOpacity,
  Pressable 
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, { 
  useAnimatedStyle, 
  interpolate, 
  SharedValue,
  withSpring,
  useSharedValue
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../shared/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { NotificationCenter } from "./NotificationCenter";
import { useAuthStore, useUIStore } from "../../shared/store/stores";

interface AdaptiveHeaderProps {
  title: string;
  scrollY: SharedValue<number>;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  rightElement?: React.ReactNode; // Alias for parity
}

export const AdaptiveHeader = ({ 
  title, 
  scrollY, 
  showBack, 
  onBack,
  rightAction,
  rightElement
}: AdaptiveHeaderProps) => {
  const finalRightAction = rightElement !== undefined ? rightElement : rightAction;
  const { user } = useAuthStore();
  const { toggleDrawer } = useUIStore();
  const insets = useSafeAreaInsets();
  
  const backScale = useSharedValue(1);
  const backAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backScale.value }]
  }));
  
  const animatedBlurStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 50],
      [0, 1],
      "clamp"
    );
    return { opacity };
  });

  const animatedTitleStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 50],
      [10, 0],
      "clamp"
    );
    const opacity = interpolate(
      scrollY.value,
      [20, 50],
      [0, 1],
      "clamp"
    );
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  return (
    <View style={[styles.container, { height: (Platform.OS === 'ios' ? 56 : 56) + insets.top, paddingTop: insets.top }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedBlurStyle]}>
        <BlurView 
          intensity={80} 
          tint="dark" 
          style={StyleSheet.absoluteFill} 
        />
        <View style={styles.border} />
      </Animated.View>

      <View style={styles.content}>
        <View style={styles.left}>
          {showBack ? (
            <Pressable 
              onPress={() => onBack ? onBack() : router.back()} 
              onPressIn={() => { backScale.value = withSpring(0.85); }}
              onPressOut={() => { backScale.value = withSpring(1); }}
              style={styles.backButton}
            >
              <Animated.View style={backAnimStyle}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
              </Animated.View>
            </Pressable>
          ) : (
            <Pressable 
              onPress={toggleDrawer}
              onPressIn={() => { backScale.value = withSpring(0.85); }}
              onPressOut={() => { backScale.value = withSpring(1); }}
              style={styles.backButton}
            >
              <Animated.View style={backAnimStyle}>
                <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
              </Animated.View>
            </Pressable>
          )}
        </View>

        <Animated.View style={[styles.center, animatedTitleStyle]}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </Animated.View>

        <View style={styles.right}>
          {finalRightAction !== undefined ? finalRightAction : (user ? <NotificationCenter /> : null)}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
  },
  left: {
    width: 100,
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  right: {
    width: 100,
    alignItems: "flex-end",
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h4.fontSize, // Desktop parity: slightly smaller header
    fontFamily: theme.typography.fontFamily.sora,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  backButton: {
    padding: 4,
  },
  border: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(16, 185, 129, 0.1)", // Desktop parity: emerald/10
  }
});
