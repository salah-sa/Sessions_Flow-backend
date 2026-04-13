/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Settings Redirect
 * DEPRECATED: Standard settings moved to (tabs)/profile
 * ═══════════════════════════════════════════════════════════
 */

import { Redirect } from 'expo-router';

export default function SettingsRedirect() {
  return <Redirect href="/(tabs)/profile" />;
}
