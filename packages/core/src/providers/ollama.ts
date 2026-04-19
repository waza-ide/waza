import type {
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  ProviderConfig,
  ProviderKind,
} from "../models/types.js";
import { BaseProvider } from "./base.js";
import type { HealthCheckable, HealthCheckResult } from "./health.js";

type OllamaGenerateResponse = {
  model: string;
  response: string;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
};

type OllamaChatMessage = {
  role: string;
  content: string;
};

type OllamaChatResponse = {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
};

/**
 * Ollama プロバイダー実装（ローカルモデル向け）
 */
export class OllamaProvider extends BaseProvider implements HealthCheckable {
  constructor(config: ProviderConfig) {
    super(config);
  }

  get kind(): ProviderKind {
    return "ollama";
  }

  protected defaultBaseUrl(): string {
    return "http://localhost:11434";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(this.config.timeout ?? 3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 4096,
        },
      }),
      signal: AbortSignal.timeout(this.config.timeout ?? 60_000),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API エラー: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as OllamaChatResponse;

    return {
      content: data.message.content,
      model: data.model,
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      },
    };
  }

  async *stream(
    request: LLMRequest
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        stream: true,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 4096,
        },
      }),
      signal: AbortSignal.timeout(this.config.timeout ?? 120_000),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API エラー: ${response.status} ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error("Ollama からのレスポンスボディが空です");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const chunk = JSON.parse(trimmed) as OllamaGenerateResponse;
        yield { delta: chunk.response, done: chunk.done };

        if (chunk.done) return;
      }
    }

    yield { delta: "", done: true };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const base = this.config.baseUrl ?? 'http://localhost:11434';
    const start = Date.now();
    try {
      const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return { ok: res.ok, latencyMs: Date.now() - start, detail: `HTTP ${res.status}` };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }
}
