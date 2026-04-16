/**
 * cocoro-core HTTP クライアント
 * cocoro-core :8001 との通信を担当する
 */

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
  baseUrl: string;
  timeout?: number;
};

/**
 * cocoro-core（LiteLLM ゲートウェイ）への HTTP クライアント
 * OpenAI 互換 API を使用する
 */
export class CocoroClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: CocoroClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeout = config.timeout ?? 60_000;
  }

  /**
   * サーバーが稼働しているか確認する
   */
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 利用可能なモデル一覧を取得する
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `モデル一覧取得エラー: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as {
      data: { id: string }[];
    };

    return data.data.map((m) => m.id);
  }

  /**
   * 非ストリームで補完リクエストを送る
   */
  async chat(request: CocoroChatRequest): Promise<CocoroChatResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, stream: false }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`cocoro-core API エラー: ${response.status} — ${body}`);
    }

    return (await response.json()) as CocoroChatResponse;
  }

  /**
   * ストリームで補完リクエストを送る（Server-Sent Events）
   */
  async *chatStream(
    request: CocoroChatRequest
  ): AsyncGenerator<CocoroStreamChunk, void, unknown> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, stream: true }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `cocoro-core ストリームエラー: ${response.status} — ${body}`
      );
    }

    if (!response.body) {
      throw new Error("cocoro-core からのレスポンスボディが空です");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        yield JSON.parse(data) as CocoroStreamChunk;
      }
    }
  }
}
