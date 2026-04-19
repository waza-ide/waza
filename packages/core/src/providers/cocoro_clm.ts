/**
 * CocoroCLMProvider — OpenAI-compatible API client
 *
 * Target: cocoro-llm-server (mdl-systems internal LLM inference server)
 * API: http://192.168.50.112:8000/v1  (LiteLLM gateway)
 * Auth: Bearer mdl-llm-2026
 * Model aliases: gpt-4o / gpt-4o-mini / qwen25-72b
 *
 * The server runs Qwen 2.5 72B AWQ via vLLM + LiteLLM proxy,
 * fully compatible with OpenAI Chat Completions API.
 */

import type {
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  ProviderConfig,
  ProviderKind,
} from "../models/types.js";
import { BaseProvider } from "./base.js";

// OpenAI-compatible response types
type OpenAIMessage = {
  role: string;
  content: string;
};

type OpenAIChoice = {
  index: number;
  message: OpenAIMessage;
  delta?: { content?: string };
  finish_reason: string | null;
};

type OpenAIUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

type OpenAIChatResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: OpenAIUsage;
};

type OpenAIStreamChunk = {
  id: string;
  object: string;
  choices: Array<{
    index: number;
    delta: { content?: string; role?: string };
    finish_reason: string | null;
  }>;
};

/**
 * CocoroCLMProvider
 *
 * OpenAI Chat Completions compatible provider for cocoro-llm-server.
 * Default base URL: http://192.168.50.112:8000/v1
 * Default model:    gpt-4o  (maps to Qwen 2.5 72B AWQ)
 */
export class CocoroCLMProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
  }

  get kind(): ProviderKind {
    return "cocoro";
  }

  protected defaultBaseUrl(): string {
    return "http://192.168.50.112:8000/v1";
  }

  /** Authorization header: Bearer <apiKey or default> */
  private get authHeader(): string {
    return `Bearer ${this.config.apiKey ?? "mdl-llm-2026"}`;
  }

  /**
   * Health check — LiteLLM gateway health endpoint
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try /health first, fall back to /models
      const [healthUrl, modelsUrl] = [
        this.baseUrl.replace("/v1", "/health"),
        `${this.baseUrl}/models`,
      ];
      const healthRes = await fetch(healthUrl, {
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);
      if (healthRes?.ok) return true;

      const modelsRes = await fetch(modelsUrl, {
        headers: { Authorization: this.authHeader },
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);
      return modelsRes?.ok ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Non-streaming chat completion
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }),
      signal: AbortSignal.timeout(this.config.timeout ?? 120_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `CocoroCLM API error: ${response.status} ${response.statusText} — ${body}`
      );
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const choice = data.choices[0];
    if (!choice) throw new Error("CocoroCLM: empty choices in response");

    return {
      content: choice.message.content,
      model: data.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  /**
   * Streaming chat completion (Server-Sent Events)
   */
  async *stream(
    request: LLMRequest
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
      signal: AbortSignal.timeout(this.config.timeout ?? 180_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `CocoroCLM stream error: ${response.status} ${response.statusText} — ${body}`
      );
    }

    if (!response.body) {
      throw new Error("CocoroCLM: empty response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") {
          if (trimmed === "data: [DONE]") yield { delta: "", done: true };
          continue;
        }
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = trimmed.slice(6);
          const chunk = JSON.parse(json) as OpenAIStreamChunk;
          const delta = chunk.choices[0]?.delta?.content ?? "";
          const isDone = chunk.choices[0]?.finish_reason !== null;
          yield { delta, done: isDone };
          if (isDone) return;
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    yield { delta: "", done: true };
  }
}
