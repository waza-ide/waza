import { ClaudeProvider } from "../providers/claude.js";
import { GeminiProvider } from "../providers/gemini.js";
import { OllamaProvider } from "../providers/ollama.js";
import { CocoroCLMProvider } from "../providers/cocoro_clm.js";
import { LocalProvider } from "../providers/LocalProvider.js";
import type { LocalProviderConfig } from "../providers/LocalProvider.js";
import type { BaseProvider } from "../providers/base.js";
import type { ModelConfig } from "../models/config.js";

// cocoro-llm-server (mdl-systems internal GPU server: RTX PRO 6000 Blackwell)
const COCORO_CLM_URL = "http://192.168.50.112:8000";
const COCORO_CLM_API_KEY = "mdl-llm-2026";
const COCORO_CLM_MODEL = "qwen25-72b"; // Qwen 2.5 72B Instruct AWQ (実名)

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
  async getAvailableProviders(): Promise<Array<"cocoro-clm" | "cocoro" | "ollama" | "claude" | "gemini">> {
    const [cocoroClmOk, cocoroOk, ollamaOk] = await Promise.all([
      this.checkUrl(`${COCORO_CLM_URL}/health`),
      this.checkUrl(`${COCORO_URL}/health`),
      this.checkUrl(`${OLLAMA_URL}/api/tags`),
    ]);

    const available: Array<"cocoro-clm" | "cocoro" | "ollama" | "claude" | "gemini"> = [];
    if (cocoroClmOk) available.push("cocoro-clm");
    if (cocoroOk) available.push("cocoro");
    if (ollamaOk) available.push("ollama");
    available.push("claude");
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
        // cocoro-llm-server (internal GPU server) — OpenAI-compatible
        return new CocoroCLMProvider({
          kind: "cocoro",
          model: config.model === "default" ? COCORO_CLM_MODEL : config.model,
          baseUrl: `${COCORO_CLM_URL}/v1`,
          apiKey: COCORO_CLM_API_KEY,
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
    // Priority: cocoro-llm-server → local ollama → claude fallback
    if (await this.checkUrl(`${COCORO_CLM_URL}/health`)) {
      return new CocoroCLMProvider({
        kind: "cocoro",
        model: COCORO_CLM_MODEL,
        baseUrl: `${COCORO_CLM_URL}/v1`,
        apiKey: COCORO_CLM_API_KEY,
      });
    }
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
  }

  /**
   * preferLocalModel=true 時: LocalProvider を優先し、障害時は cloud にフォールバックする。
   * preferLocalModel=false 時: cloud を使用する。
   *
   * extension/src/router/index.ts から呼ばれる用途向け。
   * localConfig が未指定の場合はデフォルト値 (192.168.50.112) を使う。
   */
  async routeWithPreference(
    preferLocal: boolean,
    localConfig?: Partial<LocalProviderConfig>,
    cloudApiKey?: string
  ): Promise<import('../providers/base.js').BaseProvider> {
    const local = new LocalProvider({
      baseUrl:  localConfig?.baseUrl  ?? `${COCORO_CLM_URL}/v1`,
      apiKey:   localConfig?.apiKey   ?? COCORO_CLM_API_KEY,
      model:    localConfig?.model    ?? COCORO_CLM_MODEL,
      maxTokens: localConfig?.maxTokens,
      timeoutMs: localConfig?.timeoutMs,
    });

    if (!preferLocal) {
      return new ClaudeProvider({
        kind:   'claude',
        model:  'claude-sonnet-4-5',
        apiKey: cloudApiKey ?? process.env['ANTHROPIC_API_KEY'],
      });
    }

    const available = await local.isAvailable();
    if (available) return local;

    // フォールバック: cloud
    return new ClaudeProvider({
      kind:   'claude',
      model:  'claude-sonnet-4-5',
      apiKey: cloudApiKey ?? process.env['ANTHROPIC_API_KEY'],
    });
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
