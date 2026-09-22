import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const rememberSessionKey = 'sds-local-remember-session';
const authTokenKeySuffix = '-auth-token';
const authKeyRegistryKey = 'sds-local-auth-token-keys';
const secureStoreKeyPrefix = 'sds-local.auth.';

const useNativeVault = Platform.OS !== 'web';

function storage() {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
}

function isAuthTokenKey(key: string) {
  return key.endsWith(authTokenKeySuffix);
}

function secureStoreKey(key: string) {
  return `${secureStoreKeyPrefix}${key}`;
}

function readLocalValue(key: string) {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeLocalValue(key: string, value: string) {
  try {
    storage()?.setItem(key, value);
  } catch {
    // The secure vault remains the source of truth on native platforms.
  }
}

function removeLocalValue(key: string) {
  try {
    storage()?.removeItem(key);
  } catch {
    // Ignore cleanup failures; the native vault is cleared separately.
  }
}

function readRegisteredAuthKeys() {
  const value = readLocalValue(authKeyRegistryKey);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((key): key is string => typeof key === 'string' && isAuthTokenKey(key))
      : [];
  } catch {
    return [];
  }
}

function registerAuthKey(key: string) {
  const keys = new Set(readRegisteredAuthKeys());
  keys.add(key);
  writeLocalValue(authKeyRegistryKey, JSON.stringify([...keys]));
}

function unregisterAuthKey(key: string) {
  const keys = readRegisteredAuthKeys().filter((registeredKey) => registeredKey !== key);
  if (keys.length) writeLocalValue(authKeyRegistryKey, JSON.stringify(keys));
  else removeLocalValue(authKeyRegistryKey);
}

export function getRememberSessionPreference() {
  try {
    return storage()?.getItem(rememberSessionKey) !== 'false';
  } catch {
    return true;
  }
}

export function setRememberSessionPreference(remember: boolean) {
  try {
    const localStorage = storage();
    if (!localStorage) return;
    localStorage.setItem(rememberSessionKey, remember ? 'true' : 'false');
    if (!remember) {
      const keys = new Set(readRegisteredAuthKeys());
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && isAuthTokenKey(key)) {
          keys.add(key);
          localStorage.removeItem(key);
        }
      }
      if (useNativeVault) {
        for (const key of keys) {
          void SecureStore.deleteItemAsync(secureStoreKey(key)).catch(() => undefined);
        }
      }
    }
  } catch {
    // Session persistence is best effort; Supabase still keeps the active session in memory.
  }
}

export async function clearStoredAuthSession(userId?: string) {
  const keys = new Set(readRegisteredAuthKeys());
  const localStorage = storage();
  if (localStorage) {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && isAuthTokenKey(key)) keys.add(key);
    }
  }
  await Promise.all(
    [...keys].map(async (key) => {
      if (useNativeVault) {
        await SecureStore.deleteItemAsync(secureStoreKey(key)).catch(() => undefined);
      }
      removeLocalValue(key);
    }),
  );
  removeLocalValue(authKeyRegistryKey);
  if (userId) removeLocalValue(`sds-local-app-mode:${userId}`);
}

export const authStorage = {
  async getItem(key: string) {
    const authToken = isAuthTokenKey(key);
    if (!getRememberSessionPreference() && authToken) return null;

    if (useNativeVault && authToken) {
      try {
        const secureValue = await SecureStore.getItemAsync(secureStoreKey(key));
        if (secureValue) return secureValue;
      } catch {
        // Fall back to the legacy adapter below if the vault is unavailable.
      }

      // Migrate a session written by older builds into Keychain/Keystore.
      const legacyValue = readLocalValue(key);
      if (legacyValue) {
        try {
          await SecureStore.setItemAsync(secureStoreKey(key), legacyValue);
          registerAuthKey(key);
          removeLocalValue(key);
        } catch {
          // Keep the legacy value if the native vault rejects it (for example,
          // an unusually large session payload on an older OS).
        }
      }
      return legacyValue;
    }

    return readLocalValue(key);
  },
  async setItem(key: string, value: string) {
    const authToken = isAuthTokenKey(key);
    if (!getRememberSessionPreference() && authToken) return;

    if (useNativeVault && authToken) {
      try {
        await SecureStore.setItemAsync(secureStoreKey(key), value);
        registerAuthKey(key);
        removeLocalValue(key);
        return;
      } catch {
        // Fall back to local storage if the native vault rejects the payload.
      }
    }

    writeLocalValue(key, value);
    if (useNativeVault && authToken) registerAuthKey(key);
  },
  async removeItem(key: string) {
    if (useNativeVault && isAuthTokenKey(key)) {
      try {
        await SecureStore.deleteItemAsync(secureStoreKey(key));
      } catch {
        // Continue clearing the legacy adapter and registry below.
      }
      unregisterAuthKey(key);
    }
    removeLocalValue(key);
  },
};
