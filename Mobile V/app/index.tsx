/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Entry Point Redirect
 * Delegates auth-aware routing to AuthProvider navigation guard.
 * ═══════════════════════════════════════════════════════════
 */

import { Redirect } from 'expo-router';
import { useAuthStore } from '../shared/store/stores';

export default function Index() {
  const { user, token } = useAuthStore();
  const isAuthenticated = !!user && !!token;

  // Redirect based on auth state — AuthProvider also guards,
  // but this avoids the brief flash of tabs for unauthenticated users.
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(auth)/login" />;
}
