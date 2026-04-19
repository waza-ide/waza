import { ModelRouter } from '@waza/core';
import type { AgentState } from './types.js';

export type { AgentState };

export type StateChangeHandler = (state: AgentState) => void;

const MAX_STEPS = 10;

const SYSTEM_PROMPT = `あなたはWazaというAIコーディングアシスタントです。
ユーザーのリクエストを分析し、以下のツールを使って作業を行ってください。

利用可能なツール:
- read_file: ファイルを読む        引数: {"path": "ファイルパス"}
- write_file: ファイルに書く       引数: {"path": "ファイルパス", "content": "内容"}
- exec_command: コマンドを実行する  引数: {"command": "コマンド"}

ツールを使う場合は以下の形式のみで出力してください（他のテキストは含めない）:
TOOL: <ツール名> <JSON引数>

例:
TOOL: read_file {"path": "src/index.ts"}

タスクが完了したら以下の形式で出力してください:
DONE: <結果の説明>

ツールを使わず直接回答する場合も必ず文末に DONE: <回答> を含めてください。`;

type ParsedResponse =
  | { type: 'done'; result: string }
  | { type: 'tool'; tool: string; args: Record<string, unknown> }
  | { type: 'text'; content: string };

export function parseModelResponse(content: string): ParsedResponse {
  const lines = content.trim().split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('DONE:')) {
      return { type: 'done', result: trimmed.slice(5).trim() };
    }

    if (trimmed.startsWith('TOOL:')) {
      const rest = trimmed.slice(5).trim();
      const spaceIdx = rest.indexOf(' ');
      if (spaceIdx === -1) continue;

      const tool = rest.slice(0, spaceIdx).trim();
      const jsonStr = rest.slice(spaceIdx + 1).trim();

      try {
        const args = JSON.parse(jsonStr) as Record<string, unknown>;
        return { type: 'tool', tool, args };
      } catch {
        // JSON パース失敗の場合は次の行へ
        continue;
      }
    }
  }

  return { type: 'text', content };
}

export class DesktopAgentLoop {
  private running = false;
  private abortController: AbortController | undefined;
  private stateHandlers: StateChangeHandler[] = [];
  private currentWorkDir: string;

  constructor(
    private router: ModelRouter,
    workDir: string
  ) {
    this.currentWorkDir = workDir;
  }

  /** StateChangeハンドラーを登録。解除関数を返す */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.push(handler);
    return () => {
      this.stateHandlers = this.stateHandlers.filter(h => h !== handler);
    };
  }

  private emit(state: AgentState): void {
    this.stateHandlers.forEach(h => h(state));
  }

  async run(userInput: string): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      const provider = await this.router.route({ provider: 'auto', model: 'default' });

      const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: userInput },
      ];

      for (let step = 0; step < MAX_STEPS; step++) {
        if (signal.aborted) {
          this.emit({ status: 'stopped' });
          return;
        }

        this.emit({
          status: 'thinking',
          step,
          message: `ステップ ${step + 1} / ${MAX_STEPS} — 考え中...`,
        });

        const response = await provider.complete({
          messages,
          model: provider.model,
          maxTokens: 4096,
        });

        if (signal.aborted) {
          this.emit({ status: 'stopped' });
          return;
        }

        const parsed = parseModelResponse(response.content);

        if (parsed.type === 'done') {
          this.emit({ status: 'done', result: parsed.result });
          return;
        }

        if (parsed.type === 'text') {
          // ツール呼び出しなし・DONE なし → テキスト回答として完了扱い
          this.emit({ status: 'done', result: parsed.content });
          return;
        }

        // ツール実行
        this.emit({
          status: 'acting',
          step,
          action: `${parsed.tool}(${JSON.stringify(parsed.args)})`,
        });

        let toolOutput: string;
        try {
          toolOutput = await this.dispatchTool(parsed.tool, parsed.args, signal);
        } catch (toolError) {
          toolOutput = `ツールエラー: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
        }

        messages.push({ role: 'assistant', content: response.content });
        messages.push({
          role: 'user',
          content: `[ツール実行結果]\n${toolOutput}`,
        });
      }

      this.emit({
        status: 'done',
        result: `最大ステップ数（${MAX_STEPS}）に達しました。`,
      });
    } catch (error) {
      if (signal.aborted) {
        this.emit({ status: 'stopped' });
        return;
      }
      this.emit({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }

  stop(): void {
    this.abortController?.abort();
    this.running = false;
    this.emit({ status: 'stopped' });
  }

  setWorkDir(dir: string): void {
    this.currentWorkDir = dir;
  }

  /** テスト用: 実行中かどうかを返す */
  isRunning(): boolean {
    return this.running;
  }

  private buildSystemPrompt(): string {
    return `${SYSTEM_PROMPT}\n\n作業ディレクトリ: ${this.currentWorkDir}`;
  }

  private async dispatchTool(
    tool: string,
    args: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<string> {
    if (signal.aborted) return '';

    switch (tool) {
      case 'read_file': {
        const p = String(args['path'] ?? '');
        return window.wazaAPI.fs.readFile(p);
      }
      case 'write_file': {
        const p = String(args['path'] ?? '');
        const content = String(args['content'] ?? '');
        await window.wazaAPI.fs.writeFile(p, content);
        return 'written';
      }
      case 'exec_command': {
        const command = String(args['command'] ?? '');
        const result = await window.wazaAPI.agent.exec(command, this.currentWorkDir);
        return result.success ? result.output : `エラー: ${result.output}`;
      }
      default:
        return `未知のツール: ${tool}`;
    }
  }
}
