// # FROZEN — このファイルのインターフェース変更は禁止。変更前にユーザーに確認すること。

/**
 * LLM プロバイダーの種別
 */
export type ProviderKind = "claude" | "ollama" | "openai" | "cocoro" | "gemini";

/**
 * チャットメッセージのロール
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * チャットメッセージ
 */
export type Message = {
  role: MessageRole;
  content: string;
};

/**
 * LLM へのリクエスト
 */
export type LLMRequest = {
  messages: Message[];
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
};

/**
 * LLM からのレスポンス（非ストリーム）
 */
export type LLMResponse = {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

/**
 * LLM からのストリームチャンク
 */
export type LLMStreamChunk = {
  delta: string;
  done: boolean;
};

/**
 * プロバイダー設定
 */
export type ProviderConfig = {
  kind: ProviderKind;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
};

/**
 * モデルルーティング設定
 */
export type RouterConfig = {
  local: ProviderConfig;
  cloud: ProviderConfig;
  preferLocal: boolean;
};

/**
 * エージェントの状態
 */
export type AgentState =
  | "idle"
  | "thinking"
  | "executing"
  | "waiting_input"
  | "error";

/**
 * エージェントアクション
 */
export type AgentAction = {
  type: "read_file" | "write_file" | "run_command" | "ask_user" | "finish";
  payload: Record<string, unknown>;
};
