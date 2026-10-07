export const businessChimeStorage = {
  get: (key: string) => globalThis.localStorage.getItem(key),
  set: (key: string, value: string) => globalThis.localStorage.setItem(key, value),
};
