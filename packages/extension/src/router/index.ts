/**
 * ModelRouter (Extension layer) — Codex Mode Phase 5+
 *
 * VSCode 設定から接続情報を読み取り、適切なプロバイダーを返す。
 *
 * ルーティング優先順位 (preferLocalModel=true の場合):
 *   1. LocalProvider (cocoro-llm-server / qwen25-72b)
 *      GET /v1/models が 200 → ローカル使用
 *   2. ClaudeProvider (claude-sonnet-4-5) にフォールバック
 *
 * preferLocalModel=false の場合: ClaudeProvider を直接使用
 *
 * 設定キー (packages.json/contributes.configuration):
 *   waza.preferLocalModel  boolean
 *   waza.localModelUrl     string
 *   waza.localModel        string
 *   waza.localApiKey       string  (WAZA_LOCAL_API_KEY 環境変数が優先)
 */
import * as vscode from 'vscode';
import {
  ClaudeProvider,
  ModelRouter as CoreModelRouter,
  type BaseProvider,
} from '@waza/core';
import { readConfig } from '../config.js';

export class ModelRouter {
  private readonly coreRouter: CoreModelRouter;

  constructor(_context: vscode.ExtensionContext) {
    this.coreRouter = new CoreModelRouter();
  }

  /**
   * 利用可能なプロバイダーを解決して返す。
   * preferLocalModel=true → ローカル優先 → 失敗時クラウドフォールバック
   * preferLocalModel=false → クラウド直接
   */
  async resolve(): Promise<BaseProvider> {
    const config = readConfig();

    if (!config.preferLocalModel) {
      // クラウドモデルを直接使用
      return new ClaudeProvider({
        kind:   'claude',
        model:  'claude-sonnet-4-5',
        apiKey: process.env['ANTHROPIC_API_KEY'],
      });
    }

    // ローカル優先: LocalProvider の isAvailable() をチェックしてフォールバック
    const localConfig = {
      baseUrl: config.localModelUrl || undefined,   // 空文字は undefined に変換
      apiKey:  config.localApiKey   || undefined,
      model:   config.localModel    || undefined,
    };

    const provider = await this.coreRouter.routeWithPreference(
      true,
      localConfig,
      process.env['ANTHROPIC_API_KEY']
    );

    // フォールバックが発生した場合にユーザー通知
    if (provider.kind !== 'cocoro') {
      void vscode.window.showInformationMessage(
        'LocalProvider (cocoro-llm-server) に接続できません。クラウドモデルを使用します。'
      );
    }

    return provider;
  }
}
