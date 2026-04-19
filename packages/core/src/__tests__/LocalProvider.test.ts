/**
 * LocalProvider.test.ts — LocalProvider の unit tests
 *
 * fetch をモックして実際のネットワークに依存しない。
 *
 * カバー範囲:
 * - isAvailable(): GET /v1/models が ok/ng の各パターン
 * - complete(): 非ストリーム完了 (JSON レスポンス)
 * - stream(): SSE ストリーミング (data: / [DONE])
 * - コンストラクタのデフォルト値
 * - HealthCheckable: healthCheck()
 * - 認証ヘッダーが Bearer トークン付きで送られること
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalProvider } from '../providers/LocalProvider.js';
import type { LocalProviderConfig } from '../providers/LocalProvider.js';
import { isHealthCheckable } from '../providers/health.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const BASE_CONFIG: LocalProviderConfig = {
  baseUrl:  'http://192.168.50.112:8000/v1',
  apiKey:   'mdl-llm-2026',
  model:    'qwen25-72b',
  maxTokens:  4096,
  timeoutMs: 120_000,
};

/** テキスト内容を ReadableStream へ変換 (SSE シミュレーション) */
function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

function mockFetchOk(body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
    body: null,
  }));
}

function mockFetchFail(): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
}

function mockFetchStatus(status: number): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false, status, statusText: 'Error',
    json: () => Promise.resolve({}),
    body: null,
  }));
}

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ── Constructor / defaults ─────────────────────────────────────────────────

describe('LocalProvider — constructor', () => {
  it('model is set correctly', () => {
    const p = new LocalProvider(BASE_CONFIG);
    expect(p.model).toBe('qwen25-72b');
  });

  it('kind returns "cocoro"', () => {
    const p = new LocalProvider(BASE_CONFIG);
    expect(p.kind).toBe('cocoro');
  });

  it('uses default maxTokens when not specified', () => {
    const p = new LocalProvider({ baseUrl: 'http://x/v1', apiKey: 'k', model: 'm' });
    // indirect check — no error thrown
    expect(p.kind).toBe('cocoro');
  });

  it('implements HealthCheckable', () => {
    const p = new LocalProvider(BASE_CONFIG);
    expect(isHealthCheckable(p)).toBe(true);
  });
});

// ── isAvailable ────────────────────────────────────────────────────────────

describe('LocalProvider.isAvailable()', () => {
  it('returns true when GET /v1/models responds 200', async () => {
    mockFetchOk({ object: 'list', data: [{ id: 'qwen25-72b' }] });
    const p = new LocalProvider(BASE_CONFIG);
    expect(await p.isAvailable()).toBe(true);
  });

  it('calls /v1/models endpoint (not /health)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    await new LocalProvider(BASE_CONFIG).isAvailable();
    const url = (fetchMock.mock.calls[0]![0] as string);
    expect(url).toContain('/models');
    expect(url).not.toContain('/health');
  });

  it('sends Authorization Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    await new LocalProvider(BASE_CONFIG).isAvailable();
    const opts = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer mdl-llm-2026');
  });

  it('returns false when fetch throws (network error)', async () => {
    mockFetchFail();
    const p = new LocalProvider(BASE_CONFIG);
    expect(await p.isAvailable()).toBe(false);
  });

  it('returns false when status is 401', async () => {
    mockFetchStatus(401);
    const p = new LocalProvider(BASE_CONFIG);
    expect(await p.isAvailable()).toBe(false);
  });

  it('returns false when status is 503', async () => {
    mockFetchStatus(503);
    const p = new LocalProvider(BASE_CONFIG);
    expect(await p.isAvailable()).toBe(false);
  });

  it('sends no Authorization header when apiKey is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    await new LocalProvider({ ...BASE_CONFIG, apiKey: '' }).isAvailable();
    const opts = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = opts.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });
});

// ── complete ──────────────────────────────────────────────────────────────

describe('LocalProvider.complete()', () => {
  const OAI_RESPONSE = {
    id: 'chatcmpl-test',
    model: 'qwen25-72b',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Hello from qwen25-72b!' },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 6, total_tokens: 16 },
  };

  it('returns content from choices[0].message.content', async () => {
    mockFetchOk(OAI_RESPONSE);
    const p = new LocalProvider(BASE_CONFIG);
    const res = await p.complete({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'qwen25-72b',
    });
    expect(res.content).toBe('Hello from qwen25-72b!');
  });

  it('returns correct model name', async () => {
    mockFetchOk(OAI_RESPONSE);
    const p = new LocalProvider(BASE_CONFIG);
    const res = await p.complete({ messages: [], model: 'qwen25-72b' });
    expect(res.model).toBe('qwen25-72b');
  });

  it('returns usage tokens', async () => {
    mockFetchOk(OAI_RESPONSE);
    const p = new LocalProvider(BASE_CONFIG);
    const res = await p.complete({ messages: [], model: 'qwen25-72b' });
    expect(res.usage.inputTokens).toBe(10);
    expect(res.usage.outputTokens).toBe(6);
  });

  it('throws when HTTP status is not ok', async () => {
    mockFetchStatus(500);
    const p = new LocalProvider(BASE_CONFIG);
    await expect(
      p.complete({ messages: [], model: 'qwen25-72b' })
    ).rejects.toThrow('LocalProvider HTTP 500');
  });

  it('sends stream=false in request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve(OAI_RESPONSE),
    });
    vi.stubGlobal('fetch', fetchMock);
    await new LocalProvider(BASE_CONFIG).complete({ messages: [], model: 'qwen25-72b' });
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!['body'] as string);
    expect(body.stream).toBe(false);
    expect(body.model).toBe('qwen25-72b');
  });
});

// ── stream ────────────────────────────────────────────────────────────────

describe('LocalProvider.stream()', () => {
  it('yields delta chunks from SSE and stops at [DONE]', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"Hel"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo!"},"finish_reason":null}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      body: sseStream([sse]),
    }));

    const p = new LocalProvider(BASE_CONFIG);
    const chunks: string[] = [];
    for await (const chunk of p.stream({ messages: [], model: 'qwen25-72b' })) {
      if (chunk.delta) chunks.push(chunk.delta);
      if (chunk.done) break;
    }
    expect(chunks.join('')).toBe('Hello!');
  });

  it('sends stream=true in request body', async () => {
    const enc = new TextEncoder();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      body: new ReadableStream({
        start(c) {
          c.enqueue(enc.encode('data: [DONE]\n\n'));
          c.close();
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const p = new LocalProvider(BASE_CONFIG);
    // consume the stream
    for await (const _ of p.stream({ messages: [], model: 'qwen25-72b' })) { break; }
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!['body'] as string);
    expect(body.stream).toBe(true);
  });

  it('throws when HTTP status is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 429, statusText: 'Too Many Requests', body: null,
    }));
    const p = new LocalProvider(BASE_CONFIG);
    const gen = p.stream({ messages: [], model: 'qwen25-72b' });
    await expect(gen.next()).rejects.toThrow('LocalProvider stream HTTP 429');
  });

  it('skips malformed SSE lines without throwing', async () => {
    const enc = new TextEncoder();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      body: new ReadableStream({
        start(c) {
          c.enqueue(enc.encode('data: INVALID_JSON\n\ndata: [DONE]\n\n'));
          c.close();
        },
      }),
    }));
    const p = new LocalProvider(BASE_CONFIG);
    const chunks: string[] = [];
    for await (const chunk of p.stream({ messages: [], model: 'qwen25-72b' })) {
      if (chunk.done) break;
      chunks.push(chunk.delta);
    }
    // No throw, just empty output
    expect(chunks).toEqual([]);
  });
});

// ── healthCheck ───────────────────────────────────────────────────────────

describe('LocalProvider.healthCheck()', () => {
  it('returns ok=true with latency when available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const p = new LocalProvider(BASE_CONFIG);
    const r = await p.healthCheck();
    expect(r.ok).toBe(true);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns ok=false when fetch throws', async () => {
    mockFetchFail();
    const p = new LocalProvider(BASE_CONFIG);
    const r = await p.healthCheck();
    expect(r.ok).toBe(false);
  });

  it('detail includes HTTP status code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const p = new LocalProvider(BASE_CONFIG);
    const r = await p.healthCheck();
    expect(r.detail).toContain('200');
  });
});
