/**
 * config.test.ts — extension/src/config.ts のユニットテスト
 *
 * vscode.workspace.getConfiguration をモックして、
 * VSCode API に依存せずに実行できる。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

// vscode モジュールをモックする (extension テストでは既に vi.mock 設定済み)
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
  },
}));

import { readConfig } from '../config.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCfg(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    preferLocalModel: false,
    localModelUrl: '',
    localModel: 'qwen25-72b',
    localApiKey: '',
    ...overrides,
  };
  return {
    get: vi.fn(<T>(key: string, fallback?: T): T =>
      (key in defaults ? defaults[key] : fallback) as T
    ),
  };
}

afterEach(() => {
  delete process.env['WAZA_LOCAL_API_KEY'];
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('readConfig()', () => {
  it('returns default values when nothing is set', () => {
    const cfg = readConfig(makeCfg() as never);
    expect(cfg.preferLocalModel).toBe(false);
    expect(cfg.localModel).toBe('qwen25-72b');
    expect(cfg.localModelUrl).toBe('');
    expect(cfg.localApiKey).toBe('');
  });

  it('respects preferLocalModel=true from settings', () => {
    const cfg = readConfig(makeCfg({ preferLocalModel: true }) as never);
    expect(cfg.preferLocalModel).toBe(true);
  });

  it('respects localModelUrl from settings', () => {
    const cfg = readConfig(makeCfg({ localModelUrl: 'http://192.168.50.112:8000/v1' }) as never);
    expect(cfg.localModelUrl).toBe('http://192.168.50.112:8000/v1');
  });

  it('respects localModel from settings', () => {
    const cfg = readConfig(makeCfg({ localModel: 'qwen25-72b' }) as never);
    expect(cfg.localModel).toBe('qwen25-72b');
  });

  it('reads localApiKey from VSCode settings', () => {
    const cfg = readConfig(makeCfg({ localApiKey: 'mdl-llm-2026' }) as never);
    expect(cfg.localApiKey).toBe('mdl-llm-2026');
  });

  it('WAZA_LOCAL_API_KEY env var overrides VSCode localApiKey', () => {
    process.env['WAZA_LOCAL_API_KEY'] = 'env-key-override';
    const cfg = readConfig(makeCfg({ localApiKey: 'settings-key' }) as never);
    expect(cfg.localApiKey).toBe('env-key-override');
  });

  it('falls back to settings key when env var is not set', () => {
    delete process.env['WAZA_LOCAL_API_KEY'];
    const cfg = readConfig(makeCfg({ localApiKey: 'settings-key' }) as never);
    expect(cfg.localApiKey).toBe('settings-key');
  });

  it('default localModel is qwen25-72b (not gpt-4o)', () => {
    const cfg = readConfig(makeCfg() as never);
    expect(cfg.localModel).toBe('qwen25-72b');
    expect(cfg.localModel).not.toBe('gpt-4o');
  });
});
