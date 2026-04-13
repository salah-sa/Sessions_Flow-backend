import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../shared/theme';

export default function Index() {
  // Let AuthProvider handle all redirection logic once hydrated.
  // This screen is just a safety fallback during the handoff.
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
