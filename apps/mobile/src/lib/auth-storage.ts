import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const rememberSessionKey = 'sds-local-remember-session';
const authTokenKeySuffix = '-auth-token';
const authKeyRegistryKey = 'sds-local-auth-token-keys';
const pendingAuthDeleteRegistryKey = 'sds-local-auth-token-delete-pending';
const secureStoreKeyPrefix = 'sds-local.auth.';
const secureStorageWarningMessage =
  'Secure sign-in storage failed. SDS Local did not save your credentials in plain storage; you may need to sign in again after closing the app.';

const useNativeVault = Platform.OS !== 'web';
const secureStorageWarningListeners = new Set<(warning: string | null) => void>();
let secureStorageWarning: string | null = null;

export function getSecureStorageWarning() {
  return secureStorageWarning;
}

export function subscribeToSecureStorageWarning(listener: (warning: string | null) => void) {
  secureStorageWarningListeners.add(listener);
  return () => secureStorageWarningListeners.delete(listener);
}

function setSecureStorageWarning(warning: string | null) {
  if (secureStorageWarning === warning) return;
  secureStorageWarning = warning;
  for (const listener of secureStorageWarningListeners) {
    try {
      listener(warning);
    } catch {
      // A warning subscriber must not interfere with auth persistence.
    }
  }
}

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

function readLocalKeyList(registryKey: string) {
  const value = readLocalValue(registryKey);
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

function writeLocalKeyList(registryKey: string, keys: ReadonlySet<string>) {
  if (keys.size) writeLocalValue(registryKey, JSON.stringify([...keys]));
  else removeLocalValue(registryKey);
}

function readRegisteredAuthKeys() {
  return readLocalKeyList(authKeyRegistryKey);
}

function registerAuthKey(key: string) {
  const keys = new Set(readRegisteredAuthKeys());
  keys.add(key);
  writeLocalKeyList(authKeyRegistryKey, keys);
}

function unregisterAuthKey(key: string) {
  const keys = new Set(readRegisteredAuthKeys().filter((registeredKey) => registeredKey !== key));
  writeLocalKeyList(authKeyRegistryKey, keys);
}

function readPendingAuthDeletes() {
  return readLocalKeyList(pendingAuthDeleteRegistryKey);
}

function isPendingAuthDelete(key: string) {
  return readPendingAuthDeletes().includes(key);
}

function markPendingAuthDelete(key: string) {
  const keys = new Set(readPendingAuthDeletes());
  keys.add(key);
  writeLocalKeyList(pendingAuthDeleteRegistryKey, keys);
}

function clearPendingAuthDelete(key: string) {
  const keys = new Set(readPendingAuthDeletes().filter((pendingKey) => pendingKey !== key));
  writeLocalKeyList(pendingAuthDeleteRegistryKey, keys);
}

async function removeSecureAuthValue(key: string, clearWarningOnSuccess = true) {
  markPendingAuthDelete(key);
  try {
    await SecureStore.deleteItemAsync(secureStoreKey(key));
    unregisterAuthKey(key);
    clearPendingAuthDelete(key);
    if (clearWarningOnSuccess) setSecureStorageWarning(null);
  } catch {
    setSecureStorageWarning(secureStorageWarningMessage);
  }
}

export function getRememberSessionPreference() {
  try {
    return storage()?.getItem(rememberSessionKey) !== 'false';
  } catch {
    return true;
  }
}

export function setRememberSessionPreference(remember: boolean) {
  const keys = new Set([...readRegisteredAuthKeys(), ...readPendingAuthDeletes()]);
  const localStorage = storage();
  try {
    localStorage?.setItem(rememberSessionKey, remember ? 'true' : 'false');
  } catch {
    // The preference is best effort; auth tokens still follow the vault policy.
  }
  if (!remember) {
    try {
      if (localStorage) {
        for (let index = localStorage.length - 1; index >= 0; index -= 1) {
          const key = localStorage.key(index);
          if (key && isAuthTokenKey(key)) {
            keys.add(key);
          }
        }
      }
    } catch {
      // Continue clearing known auth entries even if enumeration fails.
    }
    for (const key of keys) {
      removeLocalValue(key);
      if (useNativeVault) void removeSecureAuthValue(key);
    }
  }
}

export async function clearStoredAuthSession(userId?: string) {
  const keys = new Set([...readRegisteredAuthKeys(), ...readPendingAuthDeletes()]);
  const localStorage = storage();
  if (localStorage) {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && isAuthTokenKey(key)) keys.add(key);
    }
  }
  await Promise.all(
    [...keys].map(async (key) => {
      removeLocalValue(key);
      if (useNativeVault) await removeSecureAuthValue(key);
    }),
  );
  if (userId) removeLocalValue(`sds-local-app-mode:${userId}`);
}

export const authStorage = {
  async getItem(key: string) {
    const authToken = isAuthTokenKey(key);
    if (!getRememberSessionPreference() && authToken) {
      removeLocalValue(key);
      if (useNativeVault) await removeSecureAuthValue(key);
      return null;
    }

    if (useNativeVault && authToken) {
      if (isPendingAuthDelete(key)) {
        removeLocalValue(key);
        await removeSecureAuthValue(key);
        return null;
      }

      let secureValue: string | null = null;
      let secureReadFailed = false;
      try {
        secureValue = await SecureStore.getItemAsync(secureStoreKey(key));
      } catch {
        secureReadFailed = true;
      }
      if (secureValue) {
        registerAuthKey(key);
        setSecureStorageWarning(null);
        return secureValue;
      }

      // Migrate a session written by older builds into Keychain/Keystore.
      const legacyValue = readLocalValue(key);
      if (legacyValue) {
        try {
          await SecureStore.setItemAsync(secureStoreKey(key), legacyValue);
          registerAuthKey(key);
          removeLocalValue(key);
          setSecureStorageWarning(null);
          return legacyValue;
        } catch {
          // Remove the plaintext copy if it cannot be migrated securely.
          removeLocalValue(key);
          unregisterAuthKey(key);
          setSecureStorageWarning(secureStorageWarningMessage);
          return null;
        }
      }
      if (secureReadFailed) setSecureStorageWarning(secureStorageWarningMessage);
      else setSecureStorageWarning(null);
      return null;
    }

    return readLocalValue(key);
  },
  async setItem(key: string, value: string) {
    const authToken = isAuthTokenKey(key);
    if (!getRememberSessionPreference() && authToken) {
      removeLocalValue(key);
      if (useNativeVault) await removeSecureAuthValue(key);
      return;
    }

    if (useNativeVault && authToken) {
      try {
        await SecureStore.setItemAsync(secureStoreKey(key), value);
        registerAuthKey(key);
        removeLocalValue(key);
        clearPendingAuthDelete(key);
        setSecureStorageWarning(null);
        return;
      } catch {
        // Keep the live session in memory; never write a native auth token as plaintext.
        removeLocalValue(key);
        setSecureStorageWarning(secureStorageWarningMessage);
        await removeSecureAuthValue(key, false);
        return;
      }
    }

    writeLocalValue(key, value);
    if (useNativeVault && authToken) registerAuthKey(key);
  },
  async removeItem(key: string) {
    if (useNativeVault && isAuthTokenKey(key)) {
      removeLocalValue(key);
      await removeSecureAuthValue(key);
      return;
    }
    removeLocalValue(key);
  },
};
