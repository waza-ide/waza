// # FROZEN — このファイルのインターフェース変更は禁止。変更前にユーザーに確認すること。

import type {
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  ProviderConfig,
  ProviderKind,
} from "../models/types.js";

/**
 * すべての LLM プロバイダーが実装すべき抽象基底クラス
 */
export abstract class BaseProvider {
  protected readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * プロバイダーの種別を返す
   */
  abstract get kind(): ProviderKind;

  /**
   * プロバイダーが利用可能か確認する
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * 非ストリームで LLM にリクエストを送る
   */
  abstract complete(request: LLMRequest): Promise<LLMResponse>;

  /**
   * ストリームで LLM にリクエストを送る
   */
  abstract stream(
    request: LLMRequest
  ): AsyncGenerator<LLMStreamChunk, void, unknown>;

  /**
   * 使用するモデル名を返す
   */
  get model(): string {
    return this.config.model;
  }

  /**
   * ベース URL を返す（未設定の場合はデフォルト値）
   */
  protected get baseUrl(): string {
    return this.config.baseUrl ?? this.defaultBaseUrl();
  }

  /**
   * サブクラスでデフォルトのベース URL を定義する
   */
  protected abstract defaultBaseUrl(): string;
}
