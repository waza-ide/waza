// # FROZEN — activate/deactivate のシグネチャ変更禁止

import * as vscode from "vscode";
import { WazaPanel } from "./webview/panel";
import { AgentLoop } from "./agent/loop";
import { ModelRouter } from "@waza/core";

let agentLoop: AgentLoop | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const router = new ModelRouter();

  agentLoop = new AgentLoop(router, context);

  context.subscriptions.push(
    vscode.commands.registerCommand("waza.openPanel", () => {
      WazaPanel.createOrShow(context.extensionUri, agentLoop!);
    }),

    vscode.commands.registerCommand("waza.runAgent", async () => {
      const input = await vscode.window.showInputBox({
        prompt: "Waza に何をさせますか？",
        placeHolder: "例: このファイルのバグを修正して",
      });
      if (input) {
        WazaPanel.createOrShow(context.extensionUri, agentLoop!);
        await agentLoop!.run(input);
      }
    }),

    vscode.commands.registerCommand("waza.selectModel", async () => {
      await agentLoop!.selectModel();
    }),

    vscode.commands.registerCommand("waza.stopAgent", () => {
      agentLoop!.stop();
    })
  );

  vscode.window.showInformationMessage("Waza が起動しました 🚀");
}

export function deactivate(): void {
  agentLoop?.stop();
  agentLoop = undefined;
}
