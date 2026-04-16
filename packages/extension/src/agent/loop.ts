import * as vscode from "vscode";
import type { AgentState } from "@waza/core";
import { ModelRouter } from "../router/index";

/**
 * エージェントループ
 * ユーザーのリクエストを受け取り、LLM との対話を制御する
 */
export class AgentLoop {
  private state: AgentState = "idle";
  private readonly router: ModelRouter;
  private readonly context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.router = new ModelRouter(context);
  }

  /**
   * エージェントセッションを開始する
   */
  async start(): Promise<void> {
    if (this.state !== "idle") {
      vscode.window.showWarningMessage(
        "エージェントはすでに実行中です。完了をお待ちください。"
      );
      return;
    }

    const userInput = await vscode.window.showInputBox({
      prompt: "Waza に何を依頼しますか？",
      placeHolder: "例: src/index.ts に hello world 関数を追加して",
    });

    if (!userInput) return;

    this.state = "thinking";

    try {
      const provider = await this.router.resolve();

      this.state = "executing";

      const response = await provider.complete({
        messages: [{ role: "user", content: userInput }],
        model: provider.model,
      });

      await vscode.window.showInformationMessage(response.content, {
        modal: false,
      });

      this.state = "idle";
    } catch (error) {
      this.state = "error";
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      vscode.window.showErrorMessage(`Waza エラー: ${message}`);
      this.state = "idle";
    }
  }

  /**
   * リソースを解放する
   */
  dispose(): void {
    this.state = "idle";
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}
