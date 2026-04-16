import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  ProviderConfig,
  ProviderKind,
} from "../models/types.js";
import { BaseProvider } from "./base.js";

/**
 * Claude API プロバイダー実装
 */
export class ClaudeProvider extends BaseProvider {
  private readonly client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error("Claude プロバイダーには apiKey が必要です");
    }
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  get kind(): ProviderKind {
    return "claude";
  }

  protected defaultBaseUrl(): string {
    return "https://api.anthropic.com";
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const systemMessage = request.messages.find((m) => m.role === "system");
    const userMessages = request.messages.filter((m) => m.role !== "system");

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages: userMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    return {
      content,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async *stream(
    request: LLMRequest
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const systemMessage = request.messages.find((m) => m.role === "system");
    const userMessages = request.messages.filter((m) => m.role !== "system");

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages: userMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { delta: event.delta.text, done: false };
      }
    }

    yield { delta: "", done: true };
  }
}
