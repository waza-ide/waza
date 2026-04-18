import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CocoroClient } from '../client.js';

describe('CocoroClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('health() returns false on connection error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'));
    const client = new CocoroClient();
    const result = await client.health();
    expect(result).toBe(false);
  });

  it('health() returns true on 200 response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    const client = new CocoroClient();
    const result = await client.health();
    expect(result).toBe(true);
  });

  it('chat() validates response with zod and returns typed result', async () => {
    const mockResponse = {
      id: 'test-id',
      model: 'qwen',
      choices: [{ message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const client = new CocoroClient();
    const result = await client.chat({ model: 'qwen', messages: [{ role: 'user', content: 'Hi' }] });
    expect(result.id).toBe('test-id');
    expect(result.choices[0]?.message.content).toBe('Hello');
  });

  it('chat() retries on 5xx error then succeeds', async () => {
    const mockSuccessResponse = {
      id: 'retry-id',
      model: 'qwen',
      choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      } as Response);

    const client = new CocoroClient();
    const result = await client.chat({ model: 'qwen', messages: [{ role: 'user', content: 'Hi' }] });
    expect(result.id).toBe('retry-id');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('uses COCORO_API_KEY env var as default', () => {
    process.env['COCORO_API_KEY'] = 'test-key-from-env';
    const client = new CocoroClient();
    // apiKeyはprivateなので、health()のfetchが認証ヘッダー付きで呼ばれることを確認
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    void client.health();
    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs?.[1]?.headers).toEqual(
      expect.objectContaining({ 'Authorization': 'Bearer test-key-from-env' })
    );
    delete process.env['COCORO_API_KEY'];
  });
});
