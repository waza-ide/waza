/**
 * モデル設定型
 * エージェントがどのプロバイダー / モデルを使うかを表す
 */
export type ModelConfig = {
  provider: "auto" | "cocoro" | "ollama" | "claude" | "gemini";
  model: string;
};
