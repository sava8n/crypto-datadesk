import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

// Node 22's built-in localStorage shadows jsdom's; install an in-memory one first
const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const hasStorage =
  !!desc && 'value' in desc && !!desc.value && typeof desc.value.getItem === 'function';
if (!hasStorage) {
  const store = new Map<string, string>();
  const mem = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  } as Storage;
  Object.defineProperty(globalThis, 'localStorage', { value: mem, configurable: true });
}
