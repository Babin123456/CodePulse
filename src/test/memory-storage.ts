/**
 * Installs an in-memory localStorage on `window`. The test environment does not
 * provide a working one, so tests that read or write it install this first.
 */
export function installMemoryStorage(overrides: Partial<Storage> = {}): Storage {
  const data = new Map<string, string>();

  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
    ...overrides,
  } as Storage;

  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
  });

  return storage;
}
