import { ChatRequestSchema, ChatResponseSchema } from './types.js';

export type CocoroChatRequest = {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
};

export type CocoroChatResponse = {
  id: string;
  model: string;
  choices: {
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
};

export type CocoroStreamChunk = {
  id: string;
  choices: {
    delta: { content?: string };
    finish_reason: string | null;
  }[];
};

export type CocoroClientConfig = {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
};

const DEFAULT_BASE_URL = 'http://localhost:8001';
const DEFAULT_API_KEY = 'cocoro-2026';
const MAX_RETRIES = 3;

/**
 * cocoro-core（LiteLLM ゲートウェイ）への HTTP クライアント
 * OpenAI 互換 API を使用する
 * - APIキー認証（Authorization: Bearer）
 * - zodバリデーション
 * - 5xx時のexponential backoffリトライ
 */
export class CocoroClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config?: CocoroClientConfig) {
    this.baseUrl = (config?.baseUrl ?? process.env['COCORO_BASE_URL'] ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.apiKey = config?.apiKey ?? process.env['COCORO_API_KEY'] ?? DEFAULT_API_KEY;
    this.timeout = config?.timeout ?? 30_000;
  }

  /**
   * サーバーが稼働しているか確認する（5秒タイムアウト）
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * @deprecated health()を使用してください
   */
  async ping(): Promise<boolean> {
    return this.health();
  }

  /**
   * 利用可能なモデル一覧を取得する
   */
  async listModels(): Promise<string[]> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`モデル一覧取得エラー: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { data: { id: string }[] };
    return data.data.map((m) => m.id);
  }

  /**
   * 非ストリームで補完リクエストを送る（zodバリデーション付き）
   */
  async chat(request: CocoroChatRequest): Promise<CocoroChatResponse> {
    // zodバリデーション（リクエスト）
    const validated = ChatRequestSchema.parse({ ...request, stream: false });

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...validated, stream: false }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`cocoro-core API エラー: ${response.status} — ${body}`);
    }

    const json = await response.json();
    // zodバリデーション（レスポンス）
    return ChatResponseSchema.parse(json) as CocoroChatResponse;
  }

  /**
   * ストリームで補完リクエストを送る（Server-Sent Events）
   */
  async *chatStream(request: CocoroChatRequest): AsyncGenerator<CocoroStreamChunk, void, unknown> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...request, stream: true }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`cocoro-core ストリームエラー: ${response.status} — ${body}`);
    }

    if (!response.body) {
      throw new Error('cocoro-core からのレスポンスボディが空です');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        yield JSON.parse(data) as CocoroStreamChunk;
      }
    }
  }

  /**
   * exponential backoffリトライ付きfetch
   * 5xxエラー時のみリトライ、4xxは即座にエラー
   */
  private async fetchWithRetry(url: string, init: RequestInit, retries = MAX_RETRIES): Promise<Response> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
      }
      try {
        const response = await fetch(url, init);
        if (response.status >= 500 && attempt < retries) {
          lastError = new Error(`Server error: ${response.status}`);
          continue;
        }
        return response;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < retries) continue;
      }
    }
    throw lastError ?? new Error('fetch failed');
  }
}
