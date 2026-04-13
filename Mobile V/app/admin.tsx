import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdaptiveHeader } from '../components/layout/AdaptiveHeader';
import { useSharedValue } from 'react-native-reanimated';
import { theme } from '../shared/theme';
import { OptimizedList } from '../components/ui/OptimizedList';
import { RoleGuard } from '../components/auth/RoleGuard';

export default function AdminScreen() {
  const scrollY = useSharedValue(0);

  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="Admin Console" scrollY={scrollY} showBack />
        <OptimizedList
          data={[]}
          renderItem={() => null}
          onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
          emptyTitle="Coming Soon"
          emptyDescription="Admin Console is currently under construction."
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
});
