import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdaptiveHeader } from '../components/layout/AdaptiveHeader';
import { useSharedValue } from 'react-native-reanimated';
import { theme } from '../shared/theme';
import { OptimizedList } from '../components/ui/OptimizedList';
import { RoleGuard } from '../components/auth/RoleGuard';

import { TimetableConsole } from '../components/timetable/TimetableConsole';

export default function TimetableScreen() {
  const scrollY = useSharedValue(0);

  return (
    <RoleGuard allowedRoles={["Admin", "Student", "Engineer"]}>
      <View style={styles.container}>
        <AdaptiveHeader title="TIMETABLE" scrollY={scrollY} />
        
        <View style={styles.content}>
           <TimetableConsole />
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
  content: {
    flex: 1,
    paddingTop: 110,
    paddingHorizontal: theme.spacing.lg,
  }
});
