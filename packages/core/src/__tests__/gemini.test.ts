import { describe, it, expect } from 'vitest';
import { GeminiProvider } from '../providers/gemini.js';

describe('GeminiProvider', () => {
  it('isAvailable() returns false when GEMINI_API_KEY is not set', async () => {
    const original = process.env['GEMINI_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
    const provider = new GeminiProvider({ kind: 'gemini', model: 'gemini-2.0-flash' });
    const result = await provider.isAvailable();
    expect(result).toBe(false);
    if (original !== undefined) process.env['GEMINI_API_KEY'] = original;
  });

  it('isAvailable() returns true when GEMINI_API_KEY is set', async () => {
    const original = process.env['GEMINI_API_KEY'];
    process.env['GEMINI_API_KEY'] = 'test-key';
    const provider = new GeminiProvider({ kind: 'gemini', model: 'gemini-2.0-flash' });
    const result = await provider.isAvailable();
    expect(result).toBe(true);
    if (original !== undefined) {
      process.env['GEMINI_API_KEY'] = original;
    } else {
      delete process.env['GEMINI_API_KEY'];
    }
  });

  it('kind is gemini', () => {
    const provider = new GeminiProvider({ kind: 'gemini', model: 'gemini-2.0-flash' });
    expect(provider.kind).toBe('gemini');
  });
});

describe('ModelRouter', () => {
  it('getAvailableProviders includes gemini when GEMINI_API_KEY is set', async () => {
    const original = process.env['GEMINI_API_KEY'];
    process.env['GEMINI_API_KEY'] = 'test-key';

    const { ModelRouter } = await import('../router/index.js');
    const router = new ModelRouter();
    // ネットワーク接続なしのため cocoro/ollama はfalse、claude/geminiはリスト掲載
    const providers = await router.getAvailableProviders();
    expect(providers).toContain('claude');
    expect(providers).toContain('gemini');

    if (original !== undefined) {
      process.env['GEMINI_API_KEY'] = original;
    } else {
      delete process.env['GEMINI_API_KEY'];
    }
  });
});
