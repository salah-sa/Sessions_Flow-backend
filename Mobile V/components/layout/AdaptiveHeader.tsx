import React from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  Platform, 
  TouchableOpacity 
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, { 
  useAnimatedStyle, 
  interpolate, 
  SharedValue 
} from "react-native-reanimated";
import { theme } from "../../shared/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { NotificationCenter } from "./NotificationCenter";
import { useAuthStore } from "../../shared/store/stores";

interface AdaptiveHeaderProps {
  title: string;
  scrollY: SharedValue<number>;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const AdaptiveHeader = ({ 
  title, 
  scrollY, 
  showBack, 
  onBack,
  rightAction 
}: AdaptiveHeaderProps) => {
  const { user } = useAuthStore();
  
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
    <View style={styles.container}>
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
          {showBack && (
            <TouchableOpacity 
              onPress={() => onBack ? onBack() : router.back()} 
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <Animated.View style={[styles.center, animatedTitleStyle]}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </Animated.View>

        <View style={styles.right}>
          {rightAction !== undefined ? rightAction : (user ? <NotificationCenter /> : null)}
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
    height: Platform.OS === 'ios' ? 100 : 80,
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    zIndex: 100,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
  },
  left: {
    width: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  right: {
    width: 40,
    alignItems: "flex-end",
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.h3.fontSize,
    fontFamily: theme.typography.h3.fontFamily,
    fontWeight: "bold",
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
    backgroundColor: "rgba(255,255,255,0.05)",
  }
});
