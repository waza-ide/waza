import * as vscode from "vscode";
import type { ModelRouter, ModelConfig, Message } from "@waza/core";
import { readFile, writeFile, listDirectory, findFiles } from "./tools";

const MAX_STEPS = 10;

const SYSTEM_PROMPT = `あなたはコーディングアシスタントAI（Waza）です。
ユーザーのリクエストを分析し、以下のツールを使って作業を行ってください。

利用可能なツール:
- read_file: ファイルを読む        引数: {"path": "ファイルパス"}
- write_file: ファイルに書く       引数: {"path": "ファイルパス", "content": "内容"}
- list_directory: ディレクトリ一覧  引数: {"path": "ディレクトリパス"}
- find_files: ファイル検索         引数: {"pattern": "**/*.ts"}

ツールを使う場合は以下の形式のみで出力してください（他のテキストは含めない）:
TOOL: <ツール名> <JSON引数>

例:
TOOL: read_file {"path": "src/index.ts"}

タスクが完了したら以下の形式で出力してください:
DONE: <結果の説明>

ツールを使わず直接回答する場合も必ず文末に DONE: <回答> を含めてください。`;

export type AgentState =
  | { status: "idle" }
  | { status: "thinking"; step: number; message: string }
  | { status: "acting"; step: number; action: string }
  | { status: "done"; result: string }
  | { status: "error"; message: string }
  | { status: "stopped" };

export type StateChangeHandler = (state: AgentState) => void;

type ParsedResponse =
  | { type: "done"; result: string }
  | { type: "tool"; tool: string; args: Record<string, unknown> }
  | { type: "text"; content: string };

function parseModelResponse(content: string): ParsedResponse {
  const lines = content.trim().split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("DONE:")) {
      return { type: "done", result: trimmed.slice(5).trim() };
    }

    if (trimmed.startsWith("TOOL:")) {
      const rest = trimmed.slice(5).trim();
      const spaceIdx = rest.indexOf(" ");
      if (spaceIdx === -1) continue;

      const tool = rest.slice(0, spaceIdx).trim();
      const jsonStr = rest.slice(spaceIdx + 1).trim();

      try {
        const args = JSON.parse(jsonStr) as Record<string, unknown>;
        return { type: "tool", tool, args };
      } catch {
        // JSON パース失敗の場合は次の行へ
        continue;
      }
    }
  }

  return { type: "text", content };
}

async function dispatchTool(
  tool: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (tool) {
    case "read_file": {
      const result = await readFile(String(args["path"] ?? ""));
      return result.output;
    }
    case "write_file": {
      const { result } = await writeFile(
        String(args["path"] ?? ""),
        String(args["content"] ?? "")
      );
      return result.output;
    }
    case "list_directory": {
      const result = await listDirectory(String(args["path"] ?? "."));
      return result.output;
    }
    case "find_files": {
      const result = await findFiles(String(args["pattern"] ?? "**/*"));
      return result.output;
    }
    default:
      return `未知のツール: ${tool}`;
  }
}

export class AgentLoop {
  private running = false;
  private abortController: AbortController | undefined;
  private stateHandlers: StateChangeHandler[] = [];
  private currentConfig: ModelConfig = {
    provider: "auto",
    model: "auto",
  };

  constructor(
    private router: ModelRouter,
    private context: vscode.ExtensionContext
  ) {}

  onStateChange(handler: StateChangeHandler): vscode.Disposable {
    this.stateHandlers.push(handler);
    return new vscode.Disposable(() => {
      this.stateHandlers = this.stateHandlers.filter((h) => h !== handler);
    });
  }

  private emit(state: AgentState): void {
    this.stateHandlers.forEach((h) => h(state));
  }

  async run(userInput: string): Promise<void> {
    if (this.running) {
      vscode.window.showWarningMessage("Waza はすでに実行中です");
      return;
    }

    this.running = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      const provider = await this.router.route(this.currentConfig);

      const messages: Message[] = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput },
      ];

      for (let step = 0; step < MAX_STEPS; step++) {
        if (signal.aborted) {
          this.emit({ status: "stopped" });
          return;
        }

        this.emit({
          status: "thinking",
          step,
          message: `ステップ ${step + 1} / ${MAX_STEPS} — 考え中...`,
        });

        const response = await provider.complete({
          messages,
          model: provider.model,
          maxTokens: 4096,
        });

        if (signal.aborted) {
          this.emit({ status: "stopped" });
          return;
        }

        const parsed = parseModelResponse(response.content);

        if (parsed.type === "done") {
          this.emit({ status: "done", result: parsed.result });
          return;
        }

        if (parsed.type === "text") {
          // ツール呼び出しなし・DONE なし → テキスト回答として完了扱い
          this.emit({ status: "done", result: parsed.content });
          return;
        }

        // ツール実行
        this.emit({
          status: "acting",
          step,
          action: `${parsed.tool}(${JSON.stringify(parsed.args)})`,
        });

        let toolOutput: string;
        try {
          toolOutput = await dispatchTool(parsed.tool, parsed.args);
        } catch (toolError) {
          toolOutput = `ツールエラー: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
        }

        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: `[ツール実行結果]\n${toolOutput}`,
        });
      }

      this.emit({
        status: "done",
        result: `最大ステップ数（${MAX_STEPS}）に達しました。`,
      });
    } catch (error) {
      if (signal.aborted) {
        this.emit({ status: "stopped" });
        return;
      }
      this.emit({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }

  stop(): void {
    this.abortController?.abort();
    this.running = false;
    this.emit({ status: "stopped" });
  }

  async selectModel(): Promise<void> {
    const available = await this.router.getAvailableProviders();

    const items: vscode.QuickPickItem[] = [
      {
        label: "$(circuit-board) auto",
        description: "ローカル優先で自動選択",
      },
      ...available
        .filter((p: string) => p !== "claude")
        .map((p: string) => ({
          label: `$(server) ${p}`,
          description:
            p === "cocoro"
              ? "cocoro-OS (local)"
              : p === "ollama"
                ? "Ollama (local)"
                : p,
        })),
      {
        label: "$(cloud) claude",
        description: "Claude API (cloud)",
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      title: "Waza: モデルを選択",
      placeHolder: "使用するモデルを選択してください",
    });

    if (selected) {
      const provider = selected.label
        .replace(/\$\([^)]+\) /, "")
        .trim() as ModelConfig["provider"];

      this.currentConfig = {
        provider,
        model: provider === "auto" ? "auto" : "default",
      };

      vscode.window.showInformationMessage(
        `Waza: ${provider} を選択しました`
      );
    }
  }

  /** テスト・デバッグ用: 現在の設定を返す */
  getCurrentConfig(): ModelConfig {
    return { ...this.currentConfig };
  }

  /** テスト用: 実行中かどうかを返す */
  isRunning(): boolean {
    return this.running;
  }
}
