import React from "react";
import { 
  FlatList, 
  FlatListProps, 
  StyleSheet, 
  ActivityIndicator, 
  View,
  RefreshControl
} from "react-native";
import { theme } from "../../shared/theme";
import { EmptyState } from "./EmptyState";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Optimized FlatList
 * Phase 35: High-Performance Data Surface
 * ═══════════════════════════════════════════════════════════
 */

interface OptimizedListProps<T> extends FlatListProps<T> {
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  isFetchingNextPage?: boolean;
  fixedItemHeight?: number;
  staggerAnimations?: boolean;
}

export function OptimizedList<T>({ 
  loading, 
  emptyTitle = "No data found", 
  emptyDescription,
  onRefresh,
  refreshing = false,
  isFetchingNextPage = false,
  fixedItemHeight,
  staggerAnimations = false,
  ...props 
}: OptimizedListProps<T>) {
  
  const renderStaggeredItem = React.useCallback(
    (info: import("react-native").ListRenderItemInfo<T>) => {
      if (!props.renderItem) return null;
      const element = props.renderItem(info);
      if (!staggerAnimations) return element;
      
      const Animated = require("react-native-reanimated").default;
      const { FadeInDown } = require("react-native-reanimated");
      
      return (
        <Animated.View entering={FadeInDown.delay(Math.min(info.index * 50, 500)).duration(400)}>
          {element}
        </Animated.View>
      );
    },
    [props.renderItem, staggerAnimations]
  );

  const getItemLayout = React.useCallback(
    (data: any, index: number) => ({
      length: fixedItemHeight || 0,
      offset: (fixedItemHeight || 0) * index,
      index
    }),
    [fixedItemHeight]
  );
  
  if (loading && (!props.data || props.data.length === 0)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      {...props}
      renderItem={renderStaggeredItem}
      getItemLayout={fixedItemHeight ? getItemLayout : props.getItemLayout}
      contentContainerStyle={[
        styles.content, 
        props.contentContainerStyle,
        (!props.data || props.data.length === 0) && { flex: 1 }
      ]}
      ListEmptyComponent={
        <EmptyState 
          title={emptyTitle} 
          description={emptyDescription} 
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
          </View>
        ) : undefined
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
      removeClippedSubviews={true}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={5}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100, // Account for TabBar
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  }
});
