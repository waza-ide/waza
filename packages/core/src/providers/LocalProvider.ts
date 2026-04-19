/**
 * LocalProvider — cocoro-llm-server 専用プロバイダー (Phase 5+)
 *
 * cocoro-llm-server (LiteLLM + vLLM) に接続する OpenAI-compatible client。
 * CocoroCLMProvider との違い:
 *   - 設定スキーマ (LocalProviderConfig) を明示的に公開
 *   - デフォルトモデルが qwen25-72b（gpt-4o エイリアスではない実名）
 *   - isAvailable() が GET /v1/models を使用（/health に依存しない）
 *   - stream() で SSE ストリーミングを完全実装
 *
 * HealthCheckable の healthCheck() は health.ts の HealthCheckable interface で
 * base.ts を変更せずに実装済み。
 */

import type {
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  ProviderConfig,
  ProviderKind,
} from "../models/types.js";
import { BaseProvider } from "./base.js";
import type { HealthCheckable, HealthCheckResult } from "./health.js";

// ─── Config ───────────────────────────────────────────────────────────────

/**
 * LocalProvider の設定スキーマ
 * ProviderConfig のスーパーセット — 追加フィールドは extension 側で設定する
 */
export interface LocalProviderConfig {
  /** LiteLLM base URL, e.g. "http://192.168.50.112:8000/v1" */
  baseUrl:   string;
  /** Bearer token, e.g. "mdl-llm-2026" */
  apiKey:    string;
  /** Model name served by the server, e.g. "qwen25-72b" */
  model:     string;
  maxTokens?: number;
  timeoutMs?: number;
}

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TIMEOUT_MS = 120_000;

// ─── OpenAI-compatible SSE types ──────────────────────────────────────────

type OAIMessage = { role: string; content: string };

type OAIChoice = {
  index: number;
  message?: OAIMessage;
  delta?: { content?: string };
  finish_reason: string | null;
};

type OAIUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

type OAIChatCompletion = {
  id: string;
  model: string;
  choices: OAIChoice[];
  usage: OAIUsage;
};

// ─── LocalProvider ────────────────────────────────────────────────────────

export class LocalProvider extends BaseProvider implements HealthCheckable {
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(localConfig: LocalProviderConfig) {
    // Map LocalProviderConfig → ProviderConfig (BaseProvider requires it)
    const providerConfig: ProviderConfig = {
      kind:     'cocoro' as ProviderKind,
      model:    localConfig.model,
      baseUrl:  localConfig.baseUrl,
      apiKey:   localConfig.apiKey,
      timeout:  localConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
    super(providerConfig);
    this.maxTokens = localConfig.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.timeoutMs = localConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  // ── BaseProvider contract ────────────────────────────────────────────────

  get kind(): ProviderKind { return 'cocoro'; }

  protected defaultBaseUrl(): string {
    return 'http://192.168.50.112:8000/v1';
  }

  /**
   * GET /v1/models でヘルスを確認する。
   * タイムアウト 3000ms — 応答なし or 非 2xx → false
   */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * 非ストリーム完了
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({
        model:      this.model,
        messages:   request.messages,
        max_tokens: request.maxTokens ?? this.maxTokens,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`LocalProvider HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as OAIChatCompletion;
    const content = data.choices[0]?.message?.content ?? '';

    return {
      content,
      model: data.model,
      usage: {
        inputTokens:  data.usage?.prompt_tokens     ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  /**
   * SSE ストリーミング — OpenAI-compatible `data: {...}` 形式
   */
  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({
        model:      this.model,
        messages:   request.messages,
        max_tokens: request.maxTokens ?? this.maxTokens,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`LocalProvider stream HTTP ${res.status}: ${res.statusText}`);
    }
    if (!res.body) {
      throw new Error('LocalProvider: empty response body');
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';   // last incomplete line stays in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') {
          yield { delta: '', done: true };
          return;
        }

        try {
          const chunk = JSON.parse(jsonStr) as { choices?: OAIChoice[] };
          const delta = chunk.choices?.[0]?.delta?.content ?? '';
          if (delta) yield { delta, done: false };
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    yield { delta: '', done: true };
  }

  // ── HealthCheckable ──────────────────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(3000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start, detail: `HTTP ${res.status}` };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private authHeaders(): Record<string, string> {
    const key = this.config.apiKey;
    return key ? { 'Authorization': `Bearer ${key}` } : {};
  }
}
