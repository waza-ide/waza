export const tokens = {
  // カラー
  color: {
    bg: {
      base:       '#0a0a0a',   // 最深背景
      surface:    '#111111',   // カード・パネル
      elevated:   '#1a1a1a',   // ホバー・選択
      border:     '#2a2a2a',   // ボーダー
      borderSub:  '#1e1e1e',   // 薄いボーダー
    },
    text: {
      primary:    '#f0f0f0',   // 主要テキスト
      secondary:  '#888888',   // サブテキスト
      tertiary:   '#555555',   // ヒント・無効
      accent:     '#ffffff',   // 強調
    },
    accent: {
      blue:       '#2563eb',   // プライマリアクション
      blueHover:  '#3b82f6',
      green:      '#16a34a',   // 成功・Accept
      red:        '#dc2626',   // エラー・Reject
      amber:      '#d97706',   // 警告
    },
    // ファイル拡張子カラー
    ext: {
      ts:   '#4fc1ff',
      tsx:  '#4ec9b0',
      js:   '#f7df1e',
      jsx:  '#f7df1e',
      py:   '#ffde57',
      rs:   '#f74c00',
      md:   '#888888',
      json: '#f9c74f',
      css:  '#c084fc',
      html: '#e34c26',
    },
  },
  // スペーシング
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  // タイポグラフィ
  font: {
    sans: '"Inter", "Hiragino Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    size: {
      xs:   11,
      sm:   12,
      base: 13,
      md:   14,
      lg:   16,
    },
    weight: {
      normal:   400,
      medium:   500,
      semibold: 600,
    },
  },
  // レイアウトサイズ
  layout: {
    activityBar: 48,
    sidebar:     240,
    titleBar:    36,
    tabBar:      35,
    composer:    120,
  },
  // ボーダーラジウス
  radius: {
    sm:  4,
    md:  6,
    lg:  8,
    xl:  12,
    full: 9999,
  },
  // トランジション
  transition: {
    fast:   '100ms ease',
    normal: '150ms ease',
    slow:   '200ms ease',
  },
} as const;
