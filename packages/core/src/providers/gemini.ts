import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  ProviderConfig,
  ProviderKind,
} from '../models/types.js';
import { BaseProvider } from './base.js';
import type { HealthCheckable, HealthCheckResult } from './health.js';

/**
 * Gemini API プロバイダー実装
 * デフォルトモデル: gemini-2.0-flash
 */
export class GeminiProvider extends BaseProvider implements HealthCheckable {
  private readonly genAI: GoogleGenerativeAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.genAI = new GoogleGenerativeAI(config.apiKey ?? process.env['GEMINI_API_KEY'] ?? '');
  }

  get kind(): ProviderKind {
    return 'gemini' as ProviderKind;
  }

  protected defaultBaseUrl(): string {
    return 'https://generativelanguage.googleapis.com';
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey ?? process.env['GEMINI_API_KEY']);
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
    });

    const { history, lastUserMessage } = this.toGeminiMessages(request);

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastUserMessage);
    const response = await result.response;
    const text = response.text();

    return {
      content: text,
      model: this.model,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }

  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
    });

    const { history, lastUserMessage } = this.toGeminiMessages(request);

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastUserMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { delta: text, done: false };
      }
    }

    yield { delta: '', done: true };
  }

  /**
   * LLMRequest の messages を Gemini形式に変換する
   * system メッセージは最初のユーザーメッセージに結合する
   */
  private toGeminiMessages(request: LLMRequest): {
    history: { role: string; parts: { text: string }[] }[];
    lastUserMessage: string;
  } {
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const nonSystemMessages = request.messages.filter((m) => m.role !== 'system');

    // 最後のユーザーメッセージを抽出
    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
    const lastUserMessage = lastMessage?.content ?? '';

    // historyは最後のメッセージを除く
    const historyMessages = nonSystemMessages.slice(0, -1);

    // 最初のユーザーメッセージにsystemプロンプトを結合
    const history = historyMessages.map((m, idx) => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      let text = m.content;
      if (idx === 0 && systemMessage && role === 'user') {
        text = `${systemMessage.content}\n\n${text}`;
      }
      return { role, parts: [{ text }] };
    });

    return { history, lastUserMessage };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // List models to verify API key and connectivity
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      // Minimal request: count tokens for empty string
      await model.countTokens({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] });
      return { ok: true, latencyMs: Date.now() - start, detail: 'gemini-2.0-flash' };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }
}
