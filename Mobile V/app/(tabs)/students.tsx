import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../shared/theme";
import { useInfiniteStudents } from "../../shared/queries/useStudentQueries";
import { AdaptiveHeader } from "../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { OptimizedList } from "../../components/ui/OptimizedList";
import { GlassView } from "../../components/ui/GlassView";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { RoleGuard } from "../../components/auth/RoleGuard";
import { useAnimatedPress } from "../../shared/hooks/useAnimatedPress";
import Animated from "react-native-reanimated";

const StudentItem = React.memo(({ item }: { item: any }) => {
  const { pressHandlers, animatedStyle } = useAnimatedPress();
  return (
    <Animated.View style={animatedStyle} {...pressHandlers}>
      <GlassView intensity={20} style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.[0] || "?"}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.codeText}>{item.studentCode || "No Code"}</Text>
        </View>
        {item.group && (
          <View style={styles.groupBadge}>
            <Text style={styles.groupText} numberOfLines={1}>{item.group.name}</Text>
          </View>
        )}
      </GlassView>
    </Animated.View>
  );
});

export default function StudentsScreen() {
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useInfiniteStudents();
  const students = data?.pages.flatMap(page => page.items) || [];
  const scrollY = useSharedValue(0);

  const renderItem = React.useCallback(({ item }: { item: any }) => <StudentItem item={item} />, []);

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="Enrolled Personnel" scrollY={scrollY} showBack onBack={() => router.back()} />
        
        <OptimizedList
          data={students}
          renderItem={renderItem}
          loading={isLoading}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          emptyTitle="No Personnel Found"
          emptyDescription="There are currently no students enrolled across any nodes."
          staggerAnimations={true}
        />
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  listContent: {
    paddingTop: 110,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 120,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  info: {
    flex: 1,
  },
  nameText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  codeText: {
    color: theme.colors.textDim,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  groupBadge: {
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
    maxWidth: 100,
  },
  groupText: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: "900",
  }
});
