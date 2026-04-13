import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdaptiveHeader } from '../components/layout/AdaptiveHeader';
import { useSharedValue } from 'react-native-reanimated';
import { theme } from '../shared/theme';
import { RoleGuard } from '../components/auth/RoleGuard';
import { AdminConsole } from '../components/admin/AdminConsole';

export default function AdminScreen() {
  const scrollY = useSharedValue(0);

  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="COMMAND CONSOLE" scrollY={scrollY} showBack />
        <View style={{ flex: 1 }}>
          <AdminConsole />
        </View>
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
