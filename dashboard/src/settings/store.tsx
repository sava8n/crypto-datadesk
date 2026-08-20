import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type ChartScope,
  DEFAULT_SCOPE,
  DEFAULT_SETTINGS,
  refreshMs,
  type Settings,
} from '../config';
import { applyTheme, DEFAULT_THEME, isThemeMode, type ThemeMode } from '../theme/mode';

// also read by the inline script in index.html, which stamps the theme before first paint
const KEY = 'datadesk.settings.v3';
const SCOPES_KEY = 'datadesk.scopes.v1';

type ScopeMap = Record<string, Partial<ChartScope>>;

// spread over the defaults, so an older blob still picks up fields added later
function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const stored = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    // an unknown theme would leave <html data-theme> unstyled
    return isThemeMode(stored.theme) ? stored : { ...stored, theme: DEFAULT_THEME };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadScopes(): ScopeMap {
  try {
    const raw = localStorage.getItem(SCOPES_KEY);
    return raw ? (JSON.parse(raw) as ScopeMap) : {};
  } catch {
    return {};
  }
}

function persist(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode or quota: overrides live for this session only
  }
}

interface SettingsControl {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  scopes: ScopeMap;
  updateScope: (chartId: string, patch: Partial<ChartScope>) => void;
}

const SettingsContext = createContext<SettingsControl | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(load);
  const [scopes, setScopes] = useState(loadScopes);

  // charts read their colours as plain strings, so they have to be switched before anything
  // below re-renders - an effect would leave them a frame behind
  applyTheme(settings.theme);

  // persist here rather than in the setState updater, which StrictMode double-invokes
  useEffect(() => {
    persist(KEY, settings);
  }, [settings]);

  useEffect(() => {
    persist(SCOPES_KEY, scopes);
  }, [scopes]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateScope = useCallback((chartId: string, patch: Partial<ChartScope>) => {
    setScopes((prev) => ({ ...prev, [chartId]: { ...prev[chartId], ...patch } }));
  }, []);

  const value = useMemo(
    () => ({ settings, update, scopes, updateScope }),
    [settings, update, scopes, updateScope],
  );

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

export function useCurrency(): Settings['currency'] {
  return useSettingsContext().settings.currency;
}

export function useRefreshMs(): number {
  return refreshMs(useSettingsContext().settings.refreshSeconds);
}

export function useTheme(): ThemeMode {
  return useSettingsContext().settings.theme;
}

export function useSettingsControl(): SettingsControl {
  return useSettingsContext();
}

export function useChartScope(chartId: string): {
  scope: ChartScope;
  update: (patch: Partial<ChartScope>) => void;
} {
  const { scopes, updateScope } = useSettingsContext();
  const stored = scopes[chartId];

  const scope = useMemo(() => ({ ...DEFAULT_SCOPE, ...stored }), [stored]);
  const update = useCallback(
    (patch: Partial<ChartScope>) => updateScope(chartId, patch),
    [chartId, updateScope],
  );

  return { scope, update };
}
