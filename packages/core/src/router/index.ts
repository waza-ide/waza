import { ClaudeProvider } from "../providers/claude.js";
import { GeminiProvider } from "../providers/gemini.js";
import { OllamaProvider } from "../providers/ollama.js";
import type { BaseProvider } from "../providers/base.js";
import type { ModelConfig } from "../models/config.js";

const COCORO_URL = "http://localhost:8001";
const OLLAMA_URL = "http://localhost:11434";

/**
 * ローカルモデル優先でプロバイダーを自動選択するルーター
 * cocoro-core → Ollama → Claude → Gemini の優先順で試みる
 */
export class ModelRouter {
  /**
   * 現在利用可能なプロバイダー名の一覧を返す
   */
  async getAvailableProviders(): Promise<Array<"cocoro" | "ollama" | "claude" | "gemini">> {
    const [cocoroOk, ollamaOk] = await Promise.all([
      this.checkUrl(`${COCORO_URL}/health`),
      this.checkUrl(`${OLLAMA_URL}/api/tags`),
    ]);

    const available: Array<"cocoro" | "ollama" | "claude" | "gemini"> = [];
    if (cocoroOk) available.push("cocoro");
    if (ollamaOk) available.push("ollama");
    available.push("claude"); // クラウドは常にリスト掲載（API キーなしの場合は呼び出し時にエラー）
    if (process.env["GEMINI_API_KEY"]) available.push("gemini");
    return available;
  }

  /**
   * ModelConfig に従いプロバイダーを解決して返す
   */
  async route(config: ModelConfig): Promise<BaseProvider> {
    if (config.provider === "auto") {
      return this.resolveAuto();
    }

    switch (config.provider) {
      case "cocoro":
        return new OllamaProvider({
          kind: "ollama",
          model: config.model === "default" ? "llama3.2" : config.model,
          baseUrl: `${COCORO_URL}/v1`,
        });
      case "ollama":
        return new OllamaProvider({
          kind: "ollama",
          model: config.model === "default" ? "llama3.2" : config.model,
          baseUrl: OLLAMA_URL,
        });
      case "claude":
        return new ClaudeProvider({
          kind: "claude",
          model: config.model === "default" ? "claude-sonnet-4-5" : config.model,
          apiKey: process.env["ANTHROPIC_API_KEY"],
        });
      case "gemini":
        return new GeminiProvider({
          kind: "gemini",
          model: config.model === "default" ? "gemini-2.0-flash" : config.model,
          apiKey: process.env["GEMINI_API_KEY"],
        });
    }
  }

  /**
   * auto モード: cocoro → ollama → claude の順で利用可能なものを選ぶ
   */
  private async resolveAuto(): Promise<BaseProvider> {
    if (await this.checkUrl(`${COCORO_URL}/health`)) {
      return new OllamaProvider({
        kind: "ollama",
        model: "llama3.2",
        baseUrl: `${COCORO_URL}/v1`,
      });
    }
    if (await this.checkUrl(`${OLLAMA_URL}/api/tags`)) {
      return new OllamaProvider({
        kind: "ollama",
        model: "llama3.2",
        baseUrl: OLLAMA_URL,
      });
    }
    return new ClaudeProvider({
      kind: "claude",
      model: "claude-sonnet-4-5",
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });
    // Gemini は claude が失敗した場合のフォールバック
    // （ClaudeProvider のコンストラクタが apiKey なしでも例外を投げるため
    //   ここでは到達しない場合がある）
  }

  private async checkUrl(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
