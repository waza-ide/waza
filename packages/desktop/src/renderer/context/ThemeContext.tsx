import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  lightTokens,
  darkTokens,
  staticTokens,
  type Theme,
  type ThemeTokens,
} from '../styles/tokens.js';

interface ThemeContextValue {
  theme: Theme;
  tokens: ThemeTokens;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  // OSのテーマ設定を初期値に使う
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  );

  // OSのテーマ変更を検知
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent): void => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // bodyにdata-theme属性を付与（CSS変数・Monaco切り替え用）
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const tokens: ThemeTokens = {
    ...(theme === 'light' ? lightTokens : darkTokens),
    ...staticTokens,
  };

  function toggleTheme(): void {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }

  return (
    <ThemeContext.Provider value={{ theme, tokens, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
