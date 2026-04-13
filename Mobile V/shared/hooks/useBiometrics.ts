import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Biometric Security Bridge
 * Phase 87: Local Authentication Logic
 * ═══════════════════════════════════════════════════════════
 */

export function useBiometrics() {
  const [isCompatible, setIsCompatible] = useState(false);
  const [hasHardware, setHasHardware] = useState(false);
  const [enrolledLevels, setEnrolledLevels] = useState<LocalAuthentication.AuthenticationType[]>([]);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsCompatible(compatible);

      const hardware = await LocalAuthentication.isEnrolledAsync();
      setHasHardware(hardware);

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setEnrolledLevels(types);
    })();
  }, []);

  const authenticate = async (reason: string = "Authenticate to continue") => {
    if (!isCompatible || !hasHardware) {
      return { success: false, error: 'Hardware not compatible or not enrolled' };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Enter Passcode',
        disableDeviceFallback: false,
      });

      return { 
        success: result.success, 
        error: result.success ? null : (result.error || 'Authentication Failed') 
      };
    } catch (e) {
      return { success: false, error: 'Internal Error' };
    }
  };

  return { 
    isCompatible, 
    hasHardware, 
    enrolledLevels,
    authenticate 
  };
}
