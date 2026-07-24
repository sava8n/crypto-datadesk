import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_SETTINGS, type Settings } from '../config';

const KEY = 'datadesk.settings.v1';

// stored overrides spread over the defaults, so a field added to config.ts later
// still shows up for a browser holding an older blob
function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      levels: { ...DEFAULT_SETTINGS.levels, ...saved.levels },
    };
  } catch {
    return DEFAULT_SETTINGS; // unparseable blob or storage blocked
  }
}

function save(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // private mode or quota: overrides live for this session only
  }
}

interface SettingsControl {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsControl | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(load);

  // persist here rather than in the setState updater, which StrictMode double-invokes
  useEffect(() => {
    save(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

function useSettingsContext(): SettingsControl {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

export function useSettings(): Settings {
  return useSettingsContext().settings;
}

export function useSettingsControl(): SettingsControl {
  return useSettingsContext();
}
