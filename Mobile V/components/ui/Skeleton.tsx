import React, { useEffect } from "react";
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from "react-native";
import { theme } from "../../shared/theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({ 
  width = "100%", 
  height = 20, 
  borderRadius = theme.radius.sm,
  style 
}: SkeletonProps) => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View 
      style={[
        styles.skeleton, 
        { width, height, borderRadius, opacity },
        style
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.surface,
  },
});
