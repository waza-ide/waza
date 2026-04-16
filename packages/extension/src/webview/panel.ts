import * as vscode from "vscode";
import * as crypto from "crypto";

/**
 * Waza のメイン Webview パネルを管理するクラス
 */
export class WazaPanel {
  private static current: WazaPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext
  ) {
    this.panel = panel;
    this.context = context;

    this.panel.webview.html = this.buildHtml();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Webview からのメッセージを受信
    this.panel.webview.onDidReceiveMessage(
      (message: unknown) => this.handleMessage(message),
      null,
      this.disposables
    );
  }

  /**
   * パネルを作成するか、既存のものを前面に出す
   */
  static createOrShow(context: vscode.ExtensionContext): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (WazaPanel.current) {
      WazaPanel.current.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "wazaPanel",
      "Waza",
      column ?? vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "dist"),
        ],
      }
    );

    WazaPanel.current = new WazaPanel(panel, context);
  }

  /**
   * Webview に送信するメッセージ型
   */
  postMessage(type: string, payload: Record<string, unknown>): void {
    void this.panel.webview.postMessage({ type, payload });
  }

  /**
   * Webview からのメッセージハンドラー
   * postMessage のデータは必ず型チェックする
   */
  private handleMessage(message: unknown): void {
    if (
      typeof message !== "object" ||
      message === null ||
      !("type" in message)
    ) {
      return;
    }

    const msg = message as { type: string; payload?: unknown };

    switch (msg.type) {
      case "ready":
        // Webview 準備完了
        break;
      default:
        // 未知のメッセージは無視（ログのみ）
        console.warn(`[WazaPanel] 未知のメッセージ type: ${msg.type}`);
    }
  }

  /**
   * CSP + nonce を設定した HTML を生成する
   */
  private buildHtml(): string {
    const nonce = crypto.randomBytes(16).toString("hex");
    const webview = this.panel.webview;
    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'nonce-${nonce}' ${cspSource};
             style-src 'nonce-${nonce}' ${cspSource};
             img-src ${cspSource} data:;
             connect-src 'none';" />
  <title>Waza</title>
  <style nonce="${nonce}">
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
    }
    h1 { font-size: 1.2rem; }
  </style>
</head>
<body>
  <h1>Waza 🚀</h1>
  <p>エージェントパネルが起動しました。</p>
  <div id="root"></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', (event) => {
      const message = event.data;
      console.log('[Waza Webview] received:', message.type);
    });
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }

  private dispose(): void {
    WazaPanel.current = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}
