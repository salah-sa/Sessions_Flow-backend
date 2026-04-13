import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdaptiveHeader } from '../components/layout/AdaptiveHeader';
import { useSharedValue } from 'react-native-reanimated';
import { theme } from '../shared/theme';
import { OptimizedList } from '../components/ui/OptimizedList';
import { RoleGuard } from '../components/auth/RoleGuard';

export default function StudentsScreen() {
  const scrollY = useSharedValue(0);

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="Students" scrollY={scrollY} showBack />
        <OptimizedList
          data={[]}
          renderItem={() => null}
          onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
          emptyTitle="Coming Soon"
          emptyDescription="Students management module is currently under construction."
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
