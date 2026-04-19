# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-19
- 担当エージェント: Antigravity (Codex Mode Phase 2: v0.7.0)

## 完了タスク
- [Phase 1–11] v0.5.4 まで完了済み（旧 HANDOFF 参照）
- **[Codex Phase 1] v0.6.0 ✅ — Task/Step データモデル + Zustand + 構造化ロガー**
  - branch: codex-mode/phase-1-foundation / commit: 9f0167f / tag: v0.6.0
  - packages/core: Task/Step/TaskAction/AgentPlan/LogEntry 型定義 + Logger + createCaptureSink
  - packages/desktop: Zustand taskStore (appendAction 含む 8 mutations)
  - DesktopAgentLoop: run() ごとに Task→Step→LogEntry を store 永続化
  - テスト: 119/119 pass

- **[Codex Phase 2] v0.7.0 ✅ — Review Gateway**
  - branch: codex-mode/phase-2-gateway / commit: e012080 / tag: v0.7.0
  - packages/core/src/gateway/triggers.ts
    - requiresReview(): write_file/delete_file/dangerous shell/git → true
    - DANGEROUS_SHELL_TOKENS (38 tokens) + DANGEROUS_GIT_SUBCOMMANDS (20)
    - batchRequiresReview(): 2+ mutating actions → always review
    - reviewReason(): human-readable explanation
  - packages/core/src/gateway/diff.ts
    - generateDiff(): injected readFileFn → DiffResult { patch, isNewFile, +/- lines }
    - parseDiffLines(): unified diff → DiffLine[] for UI rendering
  - packages/core/src/gateway/gateway.ts
    - ReviewGateway: check() / checkBatch() / reset() / getStatus()
    - assertValidTransition(): strict Step status machine enforcement
    - 状態: idle → proposing → awaiting_review → { approved | aborted }
  - packages/desktop/src/renderer/components/review/ReviewModal.tsx
    - createPortal でルート直下描画
    - 差分行ハイライト (added: 緑 / removed: 赤 / header: 紫)
    - [Approve] / [Reject] + キーボード Cmd+Enter / Escape
    - action type バッジ + reason + 詳細表示
  - packages/desktop/src/renderer/agent/loop.ts
    - ReviewGateway をコンストラクタ注入（テスト可能）
    - setReviewHandler() でランタイムスワップ
    - write_file → generateDiff → gateway.check() → 承認後に dispatchTool
    - 却下時 → step.status='aborted' → Auto-Fix Loop (re-prompt with rejection context)
  - テスト: 253/253 pass (core:150 / desktop:81 / extension:7 / bridge:10 / ui:5)

## 次のタスク

### Phase 3 — 並列実行 & Scheduler (v0.8.0)

実装対象ブランチ: codex-mode/phase-3-scheduler

1. 実行ロジックを Electron Main process の Worker へ移設
   - packages/desktop/src/main/scheduler/queue.ts — TaskQueue + 優先度 + スターベーション防止(60s)
   - MAX_WORKERS = 3
2. IPC channel 定義: packages/desktop/src/main/ipc/task.ts
   - task:create / task:control / task:subscribe
   - webContents.send('task:update', patch)
3. TaskControl { pause, resume, cancel, retry } 全実装
4. テスト: 60秒スターベーション(時刻モック) / MAX_WORKERS制限 / pause/resume

### Phase 4 — Automation / Skill / Telemetry (v0.9.0)
- Skill エンティティ + System Prompt 注入
- Automation トリガー (cron / file-watch / git-hook)
- Model Telemetry (heartbeat 30s / latency / last-used)

## App.tsx への ReviewModal 接続 (未接続残件)

loop.ts の setReviewHandler() は実装済みだが App.tsx からまだ呼ばれていない。
Phase 3 で AgentPanel.tsx を taskStore 直結にするタイミングで一緒に繋ぐ予定。
暫定: コンストラクタのデフォルト = 自動承認。

## 未解決事項
- packages/extension/src/router/index.ts — 旧実装残存（未使用）
- AgentPanel.tsx は依然 AgentState ベース（Phase 3 で taskStore 直結予定）
- ReviewModal は App.tsx にまだマウントされていない（setReviewHandler 未接続）
- アイコン icon.png が384KB（Marketplace提出前に最適化必要）

## Electron 開発サーバー起動手順
```bash
export PATH="$HOME/.local/share/pnpm:$PATH"
cd packages/core && pnpm build  # Gatewayモジュールをビルド

# Terminal 1（renderer Vite dev server）
cd packages/desktop && pnpm dev:renderer

# Terminal 2（Electron起動）
NODE_ENV=development pnpm -F @waza/desktop electron
```

## 注意事項
- packages/extension/src/extension.ts は # FROZEN（変更前に確認）
- packages/core/src/models/types.ts は # FROZEN（gemini追加は承認済み）
- packages/core/src/providers/base.ts は # FROZEN
- pnpm は ~/.local/share/pnpm/pnpm にある（PATH要export）
- core の dist/ をビルドしてから desktop の typecheck / test を実行
- packages/desktop/release/ は .gitignore 対象（バイナリは大きすぎるため）
- ReviewGateway は packages/core に置く（Electron / React 依存なし — テスト容易）
- App.tsx で ReviewModal を setReviewHandler に接続するまでは自動承認モード
