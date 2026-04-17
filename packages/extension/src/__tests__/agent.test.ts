import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentLoop } from "../agent/loop";
import type { ModelRouter, ModelConfig } from "@waza/core";

// vscode モジュールをモック
vi.mock("vscode", () => ({
  window: {
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showQuickPick: vi.fn(),
  },
  Disposable: class {
    constructor(public fn: () => void) {}
    dispose() {
      this.fn();
    }
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: "/workspace" } }],
    findFiles: vi.fn().mockResolvedValue([]),
  },
}));

// tools をモック（fs アクセスを避ける）
vi.mock("../agent/tools", () => ({
  readFile: vi.fn().mockResolvedValue({ success: true, output: "ファイル内容" }),
  writeFile: vi.fn().mockResolvedValue({
    result: { success: true, output: "書き込み完了" },
    diff: { filePath: "test.ts", originalContent: "", newContent: "new" },
  }),
  listDirectory: vi.fn().mockResolvedValue({ success: true, output: "📄 index.ts" }),
  findFiles: vi.fn().mockResolvedValue({ success: true, output: "1件: src/index.ts" }),
}));

/** テスト用 ModelRouter ファクトリ */
function createMockRouter(
  completeContent = "DONE: テスト完了"
): ModelRouter {
  return {
    getAvailableProviders: vi
      .fn()
      .mockResolvedValue(["claude"] as Array<"cocoro" | "ollama" | "claude">),
    route: vi.fn().mockResolvedValue({
      model: "mock-model",
      kind: "claude" as const,
      complete: vi.fn().mockResolvedValue({
        content: completeContent,
        model: "mock-model",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      stream: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    }),
  } as unknown as ModelRouter;
}

/** テスト用の最低限 ExtensionContext */
const mockContext = {} as import("vscode").ExtensionContext;

describe("AgentLoop", () => {
  let router: ModelRouter;
  let loop: AgentLoop;

  beforeEach(() => {
    vi.clearAllMocks();
    router = createMockRouter();
    loop = new AgentLoop(router, mockContext);
  });

  // -----------------------------------------------------------------------
  it("run() が DONE: を受け取ったら done 状態を emit する", async () => {
    const states: { status: string }[] = [];
    loop.onStateChange((s) => states.push(s));

    await loop.run("テストリクエスト");

    expect(states.some((s) => s.status === "done")).toBe(true);
    const doneState = states.find((s) => s.status === "done") as
      | { status: "done"; result: string }
      | undefined;
    expect(doneState?.result).toBe("テスト完了");
  });

  // -----------------------------------------------------------------------
  it("二重実行を防ぐ — 実行中に run() を呼ぶと警告が出る", async () => {
    // 内部フラグを直接 true にして「実行中」状態をシミュレート
    (loop as unknown as { running: boolean }).running = true;

    await loop.run("2 回目のリクエスト");

    const vscode = await import("vscode");
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      "Waza はすでに実行中です"
    );
  });

  // -----------------------------------------------------------------------
  it("onStateChange ハンドラーが状態変化を受け取る", async () => {
    const received: string[] = [];
    loop.onStateChange((s) => received.push(s.status));

    await loop.run("テスト");

    // thinking → done の順で受け取るはず
    expect(received).toContain("thinking");
    expect(received).toContain("done");
  });

  // -----------------------------------------------------------------------
  it("onStateChange の Disposable で購読解除できる", async () => {
    const received: string[] = [];
    const disposable = loop.onStateChange((s) => received.push(s.status));

    // 購読解除
    disposable.dispose();

    await loop.run("テスト");

    // イベントが届かないはず
    expect(received).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  it("stop() を呼ぶと stopped 状態を emit する", () => {
    const states: { status: string }[] = [];
    loop.onStateChange((s) => states.push(s));

    loop.stop();

    expect(states.some((s) => s.status === "stopped")).toBe(true);
  });

  // -----------------------------------------------------------------------
  it("TOOL: コマンドを解釈してツールを実行したあと次のステップへ進む", async () => {
    // 1 回目: TOOL: read_file、2 回目: DONE:
    let callCount = 0;
    const toolRouter = createMockRouter();
    (toolRouter.route as ReturnType<typeof vi.fn>).mockResolvedValue({
      model: "mock-model",
      kind: "claude" as const,
      complete: vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          content:
            callCount === 1
              ? 'TOOL: read_file {"path": "src/index.ts"}'
              : "DONE: ツール実行後に完了",
          model: "mock-model",
          usage: { inputTokens: 10, outputTokens: 5 },
        });
      }),
      stream: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    });

    const toolLoop = new AgentLoop(toolRouter, mockContext);
    const states: string[] = [];
    toolLoop.onStateChange((s) => states.push(s.status));

    await toolLoop.run("ファイルを読んで");

    expect(states).toContain("acting");
    expect(states).toContain("done");
  });

  // -----------------------------------------------------------------------
  it("getCurrentConfig() が初期設定を返す", () => {
    const config: ModelConfig = loop.getCurrentConfig();
    expect(config.provider).toBe("auto");
    expect(config.model).toBe("auto");
  });
});
