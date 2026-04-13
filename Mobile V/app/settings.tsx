import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdaptiveHeader } from '../components/layout/AdaptiveHeader';
import { useSharedValue } from 'react-native-reanimated';
import { theme } from '../shared/theme';
import { SettingsConsole } from '../components/settings/SettingsConsole';

export default function SettingsScreen() {
  const scrollY = useSharedValue(0);

  return (
    <View style={styles.container}>
      <AdaptiveHeader title="SYSTEM CONFIG" scrollY={scrollY} showBack />
      <View style={{ flex: 1 }}>
        <SettingsConsole />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
});
