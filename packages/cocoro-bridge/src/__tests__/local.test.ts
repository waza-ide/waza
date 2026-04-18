import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectLocalModels, isCocoroAvailable, isOllamaAvailable } from '../local.js';

describe('detectLocalModels', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty array when both services unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'));
    const models = await detectLocalModels();
    expect(models).toEqual([]);
  });

  it('returns ollama models when ollama is running', async () => {
    const ollamaTags = { models: [{ name: 'llama3.2', size: 2000000 }] };
    vi.mocked(fetch).mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('11434')) {
        return Promise.resolve({ ok: true, json: async () => ollamaTags } as Response);
      }
      return Promise.reject(new Error('not available'));
    });
    const models = await detectLocalModels();
    const ollama = models.filter((m) => m.provider === 'ollama');
    expect(ollama.length).toBeGreaterThan(0);
    expect(ollama[0]?.name).toBe('llama3.2');
  });
});

describe('isCocoroAvailable', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns false on error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('refused'));
    expect(await isCocoroAvailable()).toBe(false);
  });

  it('returns true on 200 response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    expect(await isCocoroAvailable()).toBe(true);
  });
});

describe('isOllamaAvailable', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns false on error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('refused'));
    expect(await isOllamaAvailable()).toBe(false);
  });
});
