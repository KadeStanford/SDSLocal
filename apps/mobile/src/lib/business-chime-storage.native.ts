import Storage from 'expo-sqlite/kv-store';
export const businessChimeStorage = {
  get: (key: string) => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemSync(key, value),
};
