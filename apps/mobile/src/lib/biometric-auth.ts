import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const biometricSignInKey = 'sds-local-biometric-sign-in';
const biometricSignInRefreshTokenKey = 'sds-local-biometric-sign-in-refresh-token';
const retiredBiometricPreferenceKey = 'sds-local-biometric-unlock';
const retiredQuickLoginRefreshTokenKey = 'sds-local-quick-login-refresh-token';
const nativePlatform = Platform.OS !== 'web';

/**
 * Biometrics are disabled in the current product flow. Remove credentials
 * written by older builds so a stale preference can never re-enable them.
 */
export async function clearBiometricSignInRefreshToken() {
  if (!nativePlatform) {
    try {
      [
        biometricSignInKey,
        biometricSignInRefreshTokenKey,
        retiredBiometricPreferenceKey,
        retiredQuickLoginRefreshTokenKey,
      ].forEach((key) => globalThis.localStorage?.removeItem(key));
    } catch {
      // Best-effort cleanup; account access does not depend on this storage.
    }
    return;
  }

  try {
    await Promise.all([
      SecureStore.deleteItemAsync(biometricSignInKey),
      SecureStore.deleteItemAsync(biometricSignInRefreshTokenKey),
      SecureStore.deleteItemAsync(retiredQuickLoginRefreshTokenKey),
      SecureStore.deleteItemAsync(retiredBiometricPreferenceKey),
    ]);
  } catch {
    // Best-effort cleanup; account access does not depend on this storage.
  }
}
