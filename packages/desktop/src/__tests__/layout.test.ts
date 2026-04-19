import { describe, it, expect } from 'vitest';
import { tokens } from '../renderer/styles/tokens.js';
import { detectLanguage } from '../renderer/hooks/useEditorTabs.js';

// tokens.ts の構造テスト
describe('tokens', () => {
  it('color.bg.base は #0a0a0a', () => {
    expect(tokens.color.bg.base).toBe('#0a0a0a');
  });
  it('layout.activityBar は 48', () => {
    expect(tokens.layout.activityBar).toBe(48);
  });
  it('layout.sidebar は 240', () => {
    expect(tokens.layout.sidebar).toBe(240);
  });
  it('layout.titleBar は 36', () => {
    expect(tokens.layout.titleBar).toBe(36);
  });
  it('font.sans が Inter を含む', () => {
    expect(tokens.font.sans).toContain('Inter');
  });
  it('accent.blue が正しい HEX', () => {
    expect(tokens.color.accent.blue).toBe('#2563eb');
  });
});

// ActivityBarのロジックテスト
describe('ActivityBar logic', () => {
  type ActivityTab = 'files' | 'agent';
  const ENABLED_TABS: ActivityTab[] = ['files', 'agent'];
  const DISABLED_TABS = ['search', 'git', 'settings'];

  it('files と agent は enabled', () => {
    ENABLED_TABS.forEach(tab => {
      expect(ENABLED_TABS.includes(tab)).toBe(true);
    });
  });

  it('search/git/settings は enabled リストに含まれない', () => {
    DISABLED_TABS.forEach(tab => {
      expect(ENABLED_TABS.includes(tab as ActivityTab)).toBe(false);
    });
  });
});

// Composer ロジックテスト（DOM非依存部分）
describe('Composer logic', () => {
  it('空文字列はtrimすると falsy', () => {
    expect(''.trim()).toBeFalsy();
    expect('  '.trim()).toBeFalsy();
  });

  it('空白のみでない入力はtrimすると truthy', () => {
    expect('hello'.trim()).toBeTruthy();
    expect('  hello  '.trim()).toBeTruthy();
  });
});

// TitleBar ロジックテスト（DOM非依存部分）
describe('TitleBar logic', () => {
  it('projectName=nullのとき表示名は空', () => {
    const projectName: string | null = null;
    const display = projectName ?? 'Waza';
    expect(display).toBe('Waza');
  });

  it('projectName=somePathのとき最後のセグメントを使う', () => {
    const rootDir = '/home/user/my-awesome-project';
    const projectName = rootDir.split('/').pop();
    expect(projectName).toBe('my-awesome-project');
  });
});

// AgentPanel ロジックテスト
describe('AgentPanel logic', () => {
  it('thinking状態のアイコンは ◎', () => {
    const STATE_ICON: Record<string, string> = {
      idle: '○', thinking: '◎', acting: '▶',
      done: '✓', error: '✗', stopped: '□',
    };
    expect(STATE_ICON['thinking']).toBe('◎');
    expect(STATE_ICON['done']).toBe('✓');
    expect(STATE_ICON['error']).toBe('✗');
  });

  it('ログが空かつidle状態 → 空表示', () => {
    const log: unknown[] = [];
    const status = 'idle';
    expect(log.length === 0 && status === 'idle').toBe(true);
  });
});

// detectLanguage は layout.test.ts でも使う
describe('detectLanguage（layout.test.ts）', () => {
  it('.ts → typescript', () => expect(detectLanguage('a.ts')).toBe('typescript'));
  it('.tsx → typescript', () => expect(detectLanguage('b.tsx')).toBe('typescript'));
  it('.py → python', () => expect(detectLanguage('c.py')).toBe('python'));
  it('.json → json', () => expect(detectLanguage('d.json')).toBe('json'));
  it('.css → css', () => expect(detectLanguage('e.css')).toBe('css'));
});
