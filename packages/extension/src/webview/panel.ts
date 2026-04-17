import * as vscode from "vscode";
import * as crypto from "crypto";
import type { AgentLoop, AgentState } from "../agent/loop";
import type { FileDiff } from "../agent/tools";

export class WazaPanel {
  static currentPanel: WazaPanel | undefined;
  private static readonly viewType = "wazaAgent";

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  static createOrShow(
    extensionUri: vscode.Uri,
    agentLoop: AgentLoop
  ): void {
    const column = vscode.ViewColumn.Beside;

    if (WazaPanel.currentPanel) {
      WazaPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      WazaPanel.viewType,
      "Waza",
      column,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true,
      }
    );

    WazaPanel.currentPanel = new WazaPanel(panel, agentLoop);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private agentLoop: AgentLoop
  ) {
    this.panel = panel;

    // 初期 HTML 設定（CSP + nonce）
    this.panel.webview.html = this.getHtml();

    // AgentLoop の状態変化を Webview に転送
    const stateDisposable = agentLoop.onStateChange((state: AgentState) => {
      void this.panel.webview.postMessage({ type: "stateChange", state });
    });

    // Webview からのメッセージ受信
    this.panel.webview.onDidReceiveMessage(
      (message: { type: string; diff?: FileDiff }) => {
        switch (message.type) {
          case "stop":
            agentLoop.stop();
            break;

          case "acceptDiff":
            // diff はすでに writeFile で disk に書き込み済みのため Accept は確認のみ
            if (message.diff) {
              vscode.window.showInformationMessage(
                `変更を適用しました: ${message.diff.filePath}`
              );
            }
            break;

          case "rejectDiff":
            // Reject 時は元のファイル内容に戻す
            if (message.diff) {
              void this.revertDiff(message.diff);
            }
            break;

          default:
            // eslint-disable-next-line no-console
            console.warn(`[WazaPanel] 未知のメッセージ type: ${message.type}`);
        }
      },
      null,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.disposables.push(stateDisposable);
  }

  /** Reject 時に元のファイル内容に戻す */
  private async revertDiff(diff: FileDiff): Promise<void> {
    try {
      const uri = vscode.Uri.file(diff.filePath);
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(
        uri,
        encoder.encode(diff.originalContent)
      );
      vscode.window.showInformationMessage(
        `変更を元に戻しました: ${diff.filePath}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `ファイルの復元に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private getHtml(): string {
    const nonce = crypto.randomBytes(16).toString("hex");
    const cspSource = this.panel.webview.cspSource;

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'nonce-${nonce}' ${cspSource};
             style-src 'nonce-${nonce}' ${cspSource};" />
  <title>Waza</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
      font-size: 13px;
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    header h1 { font-size: 1rem; font-weight: 600; }
    #status-badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    #log {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.8rem;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 60vh;
      overflow-y: auto;
      background: var(--vscode-terminal-background, var(--vscode-editor-background));
      padding: 8px;
      border-radius: 4px;
      border: 1px solid var(--vscode-panel-border);
    }
    #log .entry { margin-bottom: 4px; }
    #log .thinking { color: var(--vscode-foreground); opacity: 0.7; }
    #log .acting   { color: var(--vscode-terminal-ansiYellow); }
    #log .done     { color: var(--vscode-terminal-ansiGreen); }
    #log .error    { color: var(--vscode-editorError-foreground); }
    #log .stopped  { color: var(--vscode-disabledForeground); }
    #stop-btn {
      margin-top: 12px;
      padding: 4px 12px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    #stop-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
  </style>
</head>
<body>
  <header>
    <h1>🚀 Waza</h1>
    <span id="status-badge">待機中</span>
  </header>
  <div id="log" aria-live="polite" aria-label="エージェントログ"></div>
  <button id="stop-btn" onclick="stopAgent()">■ 停止</button>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const log = document.getElementById('log');
    const badge = document.getElementById('status-badge');

    function stopAgent() {
      vscode.postMessage({ type: 'stop' });
    }

    function appendLog(text, cls) {
      const div = document.createElement('div');
      div.className = 'entry ' + cls;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    window.addEventListener('message', (event) => {
      const { type, state } = event.data;
      if (type !== 'stateChange') return;

      switch (state.status) {
        case 'thinking':
          badge.textContent = '考え中';
          appendLog('[' + (state.step + 1) + '] ' + state.message, 'thinking');
          break;
        case 'acting':
          badge.textContent = '実行中';
          appendLog('[' + (state.step + 1) + '] ▶ ' + state.action, 'acting');
          break;
        case 'done':
          badge.textContent = '完了';
          appendLog('✔ ' + state.result, 'done');
          break;
        case 'error':
          badge.textContent = 'エラー';
          appendLog('✖ ' + state.message, 'error');
          break;
        case 'stopped':
          badge.textContent = '停止';
          appendLog('■ 停止しました', 'stopped');
          break;
        case 'idle':
          badge.textContent = '待機中';
          break;
      }
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }

  dispose(): void {
    WazaPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}
