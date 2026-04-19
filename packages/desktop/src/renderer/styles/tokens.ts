// テーマ定義
export type Theme = 'light' | 'dark';

export const lightTokens = {
  color: {
    bg: {
      base:      '#ffffff',
      sidebar:   '#f7f7f5',
      surface:   '#f7f7f5',
      elevated:  '#ffffff',
      active:    '#ebebeb',
      hover:     '#f0f0ee',
      border:    '#e8e8e4',
      borderSub: '#efefeb',
    },
    text: {
      primary:   '#1a1a1a',
      secondary: '#666666',
      tertiary:  '#999999',
      accent:    '#000000',
      inverse:   '#ffffff',
    },
    accent: {
      blue:       '#0066cc',
      blueHover:  '#0052a3',
      green:      '#16a34a',
      red:        '#dc2626',
      amber:      '#d97706',
    },
    diff: {
      added:       'rgba(0,160,0,0.08)',
      addedText:   '#166534',
      removed:     'rgba(220,0,0,0.08)',
      removedText: '#991b1b',
    },
  },
} as const;

export const darkTokens = {
  color: {
    bg: {
      base:      '#111111',
      sidebar:   '#1a1a1a',
      surface:   '#1a1a1a',
      elevated:  '#222222',
      active:    '#2a2a2a',
      hover:     '#222222',
      border:    '#2a2a2a',
      borderSub: '#1e1e1e',
    },
    text: {
      primary:   '#f0f0f0',
      secondary: '#888888',
      tertiary:  '#555555',
      accent:    '#ffffff',
      inverse:   '#000000',
    },
    accent: {
      blue:       '#3b82f6',
      blueHover:  '#2563eb',
      green:      '#22c55e',
      red:        '#ef4444',
      amber:      '#f59e0b',
    },
    diff: {
      added:       'rgba(34,197,94,0.1)',
      addedText:   '#4ade80',
      removed:     'rgba(239,68,68,0.1)',
      removedText: '#f87171',
    },
  },
} as const;

// 共通トークン（テーマ非依存）
export const staticTokens = {
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  font: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
    size: { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20, xxl: 28 },
    weight: { normal: 400, medium: 500, semibold: 600 },
  },
  layout: {
    sidebar:   260,
    titleBar:  36,
    tabBar:    35,
    statusBar: 28,
  },
  radius: { sm: 4, md: 6, lg: 8, xl: 12, full: 9999 },
  transition: { fast: '80ms ease', normal: '150ms ease' },
} as const;

export type ThemeTokens = typeof lightTokens & typeof staticTokens;

// 後方互換用 (既存コードが tokens.xxx を使っている箇所向け)
export const tokens = {
  ...darkTokens,
  ...staticTokens,
} as const;
