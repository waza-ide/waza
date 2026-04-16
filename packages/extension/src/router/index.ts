import * as vscode from "vscode";
import {
  ClaudeProvider,
  OllamaProvider,
  type BaseProvider,
  type RouterConfig,
} from "@waza/core";

/**
 * ローカルモデル優先でプロバイダーを選択するモデルルーター
 */
export class ModelRouter {
  private readonly config: RouterConfig;

  constructor(context: vscode.ExtensionContext) {
    const cfg = vscode.workspace.getConfiguration("waza");

    this.config = {
      preferLocal: cfg.get<boolean>("preferLocalModel") ?? true,
      local: {
        kind: "ollama",
        model: "llama3.2",
        baseUrl: cfg.get<string>("localModelUrl") ?? "http://localhost:11434",
      },
      cloud: {
        kind: "claude",
        model: cfg.get<string>("cloudModel") ?? "claude-sonnet-4-5",
        apiKey: process.env["ANTHROPIC_API_KEY"],
      },
    };
  }

  /**
   * 利用可能なプロバイダーを解決して返す
   * preferLocal=true の場合、まずローカルを試みてフォールバックする
   */
  async resolve(): Promise<BaseProvider> {
    const local = new OllamaProvider(this.config.local);
    const cloud = new ClaudeProvider(this.config.cloud);

    if (this.config.preferLocal) {
      const localAvailable = await local.isAvailable();
      if (localAvailable) {
        return local;
      }
      // ローカルが使えない場合はクラウドにフォールバック
      vscode.window.showInformationMessage(
        "ローカルモデルに接続できません。クラウドモデルを使用します。"
      );
    }

    return cloud;
  }
}
