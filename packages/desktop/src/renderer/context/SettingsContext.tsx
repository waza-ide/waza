/**
 * SettingsContext — Global configuration store (Phase 5 update)
 * Persisted to localStorage. Accessible via useSettings().
 *
 * Phase 5 additions:
 * - skills: enabled Skill IDs (array of string)
 * - Version bumped to waza-settings-v2 to avoid conflicts
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type AppTheme = 'light' | 'dark' | 'system';
export type DefaultModel =
  | 'auto'
  | 'cocoro'
  | 'ollama/llama3.2'
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-6'
  | 'gemini-2.0-flash';

export interface WazaSettings {
  // Theme
  theme: AppTheme;

  // cocoro-llm-server (mdl-systems internal GPU server)
  cocoroBaseUrl: string;
  cocoroApiKey: string;
  cocoroModel: string;

  // Local Ollama
  ollamaBaseUrl: string;
  ollamaModel: string;

  // Cloud providers
  anthropicApiKey: string;
  geminiApiKey: string;

  // Agent behaviour
  defaultModel: DefaultModel;
  maxSteps: number;

  // Editor
  editorFontSize: number;
  editorFontFamily: string;
  wordWrap: boolean;

  // Codex Mode Phase 4 — enabled Skill IDs
  activeSkillIds: string[];
}

const DEFAULTS: WazaSettings = {
  theme:            'system',
  cocoroBaseUrl:    'http://192.168.50.112:8000/v1',
  cocoroApiKey:     'mdl-llm-2026',
  cocoroModel:      'gpt-4o',
  ollamaBaseUrl:    'http://localhost:11434',
  ollamaModel:      'llama3.2',
  anthropicApiKey:  '',
  geminiApiKey:     '',
  defaultModel:     'auto',
  maxSteps:         10,
  editorFontSize:   14,
  editorFontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
  wordWrap:         true,
  activeSkillIds:   [],
};

const LS_KEY = 'waza-settings-v2';

function load(): WazaSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<WazaSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(s: WazaSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

interface SettingsContextValue {
  settings: WazaSettings;
  updateSettings: (patch: Partial<WazaSettings>) => void;
  resetSettings: () => void;
  toggleSkill: (skillId: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [settings, setSettings] = useState<WazaSettings>(load);

  const updateSettings = useCallback((patch: Partial<WazaSettings>): void => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback((): void => {
    const def = { ...DEFAULTS };
    save(def);
    setSettings(def);
  }, []);

  const toggleSkill = useCallback((skillId: string): void => {
    setSettings(prev => {
      const ids = prev.activeSkillIds;
      const next = ids.includes(skillId)
        ? ids.filter(id => id !== skillId)
        : [...ids, skillId];
      const updated = { ...prev, activeSkillIds: next };
      save(updated);
      return updated;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, toggleSkill }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
