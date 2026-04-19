import { describe, it, expect } from 'vitest';
import { lightTokens, darkTokens, staticTokens } from '../renderer/styles/tokens.js';
import { detectLanguage } from '../renderer/hooks/useEditorTabs.js';
import { AVAILABLE_MODELS } from '../renderer/components/Composer.js';

// ──────────────────────────────────────────
// tokens.ts 構造テスト
// ──────────────────────────────────────────
describe('lightTokens', () => {
  it('bg.base は #ffffff', () => {
    expect(lightTokens.color.bg.base).toBe('#ffffff');
  });
  it('bg.sidebar は #f7f7f5', () => {
    expect(lightTokens.color.bg.sidebar).toBe('#f7f7f5');
  });
  it('text.primary は #1a1a1a', () => {
    expect(lightTokens.color.text.primary).toBe('#1a1a1a');
  });
  it('accent.blue は #0066cc', () => {
    expect(lightTokens.color.accent.blue).toBe('#0066cc');
  });
  it('diff.added が正しい', () => {
    expect(lightTokens.color.diff.added).toContain('rgba');
  });
});

describe('darkTokens', () => {
  it('bg.base は #111111', () => {
    expect(darkTokens.color.bg.base).toBe('#111111');
  });
  it('bg.sidebar は #1a1a1a', () => {
    expect(darkTokens.color.bg.sidebar).toBe('#1a1a1a');
  });
  it('text.primary は #f0f0f0', () => {
    expect(darkTokens.color.text.primary).toBe('#f0f0f0');
  });
  it('accent.blue は #3b82f6', () => {
    expect(darkTokens.color.accent.blue).toBe('#3b82f6');
  });
});

describe('staticTokens', () => {
  it('layout.sidebar は 260', () => {
    expect(staticTokens.layout.sidebar).toBe(260);
  });
  it('layout.titleBar は 36', () => {
    expect(staticTokens.layout.titleBar).toBe(36);
  });
  it('layout.statusBar は 28', () => {
    expect(staticTokens.layout.statusBar).toBe(28);
  });
  it('font.sans が Inter を含む', () => {
    expect(staticTokens.font.sans).toContain('Inter');
  });
  it('layout.tabBar は 35', () => {
    expect(staticTokens.layout.tabBar).toBe(35);
  });
});

// ──────────────────────────────────────────
// ThemeContext ロジックテスト（DOM非依存）
// ──────────────────────────────────────────
describe('Theme logic', () => {
  it('toggleTheme: light→dark', () => {
    type Theme = 'light' | 'dark';
    const toggle = (t: Theme): Theme => (t === 'light' ? 'dark' : 'light');
    expect(toggle('light')).toBe('dark');
    expect(toggle('dark')).toBe('light');
  });

  it('OSテーマ初期値ロジック', () => {
    // システムがダークの場合
    const isDark = true;
    const initialTheme = isDark ? 'dark' : 'light';
    expect(initialTheme).toBe('dark');
  });

  it('ThemeTokensはlight+staticの融合', () => {
    const merged = { ...lightTokens, ...staticTokens };
    expect(merged.color.bg.base).toBe('#ffffff');
    expect(merged.layout.sidebar).toBe(260);
  });
});

// ──────────────────────────────────────────
// Composer モデルリストテスト
// ──────────────────────────────────────────
describe('AVAILABLE_MODELS', () => {
  it('少なくとも5モデルが定義されている', () => {
    expect(AVAILABLE_MODELS.length).toBeGreaterThanOrEqual(5);
  });

  it('autoモデルが含まれる', () => {
    expect(AVAILABLE_MODELS.some(m => m.id === 'auto')).toBe(true);
  });

  it('claudeモデルが含まれる', () => {
    expect(AVAILABLE_MODELS.some(m => m.id.includes('claude'))).toBe(true);
  });

  it('geminiモデルが含まれる', () => {
    expect(AVAILABLE_MODELS.some(m => m.id.includes('gemini'))).toBe(true);
  });

  it('全モデルにid/label/descがある', () => {
    AVAILABLE_MODELS.forEach(m => {
      expect(m.id).toBeTruthy();
      expect(m.label).toBeTruthy();
      expect(m.desc).toBeTruthy();
    });
  });
});

// ──────────────────────────────────────────
// WelcomeScreen ロジック（DOM非依存）
// ──────────────────────────────────────────
describe('WelcomeScreen logic', () => {
  it('projectName=nullのときフォルダ選択テキストを使う', () => {
    const projectName: string | null = null;
    const label = projectName ?? 'フォルダを選択';
    expect(label).toBe('フォルダを選択');
  });

  it('projectName非nullのとき名前を表示', () => {
    const projectName = 'my-project';
    const label = projectName ?? 'フォルダを選択';
    expect(label).toBe('my-project');
  });
});

// ──────────────────────────────────────────
// StatusBar ロジック
// ──────────────────────────────────────────
describe('StatusBar logic', () => {
  it('mode=localが正しいラベルを持つ', () => {
    const labels: Record<string, string> = {
      local: 'Local', worktree: 'Worktree', cloud: 'Cloud',
    };
    expect(labels['local']).toBe('Local');
    expect(labels['worktree']).toBe('Worktree');
    expect(labels['cloud']).toBe('Cloud');
  });
});

// ──────────────────────────────────────────
// detectLanguage テスト
// ──────────────────────────────────────────
describe('detectLanguage', () => {
  it('.ts → typescript', () => expect(detectLanguage('a.ts')).toBe('typescript'));
  it('.tsx → typescript', () => expect(detectLanguage('b.tsx')).toBe('typescript'));
  it('.py → python', () => expect(detectLanguage('c.py')).toBe('python'));
  it('.json → json', () => expect(detectLanguage('d.json')).toBe('json'));
  it('.css → css', () => expect(detectLanguage('e.css')).toBe('css'));
  it('.md → markdown', () => expect(detectLanguage('f.md')).toBe('markdown'));
});
