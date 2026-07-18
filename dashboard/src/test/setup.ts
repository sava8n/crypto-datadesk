import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// unmount React trees between tests so renders don't leak across cases
afterEach(cleanup);

// `localStorage` slot is taken by Node 22's built-in Web Storage and it shadows
// jsdom's own localStorage. Install a minimal in-memory storage over that slot 
// up front, so Node's warning getter is never triggered.
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
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
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
