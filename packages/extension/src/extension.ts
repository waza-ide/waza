// # FROZEN — このファイルのインターフェース変更は禁止。変更前にユーザーに確認すること。

import * as vscode from "vscode";
import { AgentLoop } from "./agent/loop";
import { WazaPanel } from "./webview/panel";

let agentLoop: AgentLoop | undefined;

/**
 * 拡張機能のエントリーポイント
 * VSCode がアクティベートしたときに呼ばれる
 */
export function activate(context: vscode.ExtensionContext): void {
  agentLoop = new AgentLoop(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("waza.openPanel", () => {
      WazaPanel.createOrShow(context);
    }),

    vscode.commands.registerCommand("waza.startAgent", async () => {
      await agentLoop?.start();
    })
  );

  vscode.window.showInformationMessage("Waza が起動しました 🚀");
}

/**
 * 拡張機能が非アクティブになるときに呼ばれる
 */
export function deactivate(): void {
  agentLoop?.dispose();
  agentLoop = undefined;
}
