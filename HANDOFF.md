# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-19
- 担当エージェント: Antigravity (Codex Mode Phase 1: v0.6.0)

## 完了タスク
- [Phase 1–11] v0.5.4 まで完了済み（旧 HANDOFF 参照）
- **[Codex Phase 1] v0.6.0 ✅ — Task/Step データモデル + Zustand + 構造化ロガー**
  - branch: `codex-mode/phase-1-foundation`
  - commit: 9f0167f / tag: v0.6.0
  - `packages/core/src/task/types.ts` — Task/Step/TaskAction/AgentPlan/LogEntry 型定義 + type guards
  - `packages/core/src/logging/logger.ts` — Logger class / consoleSink / createCaptureSink
  - `packages/core/src/index.ts` — 上記を @waza/core から export
  - `packages/desktop/src/renderer/stores/taskStore.ts` — Zustand store
    mutations: createTask / updateTaskStatus / appendStep / updateStepStatus / appendAction / appendLog / setActive / clearTasks
  - `packages/desktop/src/renderer/agent/loop.ts` — Phase 1 リファクタ完了
    run() ごとに Task→Step を生成し taskStore 経由で永続化
    AgentState イベントは後方互換のためアダプタ継続
  - テスト: core 24/24 (taskTypes:11, logger:9, gemini:4) / desktop 73/73 / total 119/119

## 次のタスク

### Phase 2 — Review Gateway (v0.7.0) [最優先]

実装対象ブランチ: `codex-mode/phase-2-gateway`

1. `packages/core/src/gateway/triggers.ts` — requiresReview() / batchRequiresReview()
2. `packages/core` に diff パッケージ追加 + `packages/core/src/gateway/diff.ts`
3. Gateway 状態機械 (running → proposing → awaiting_review → {execute|aborted})
4. `packages/desktop/src/renderer/components/review/ReviewModal.tsx` — 差分表示 + 承認/却下
5. 却下時 → Step.status='aborted' → Auto-Fix Loop
6. テスト: triggers.ts の全 actionType x 危険トークン組み合わせ 50 件以上

Phase 2 完了まで write_file / delete_file はセキュリティリスク。
ReviewModal なしで実行することは絶対に許容しない。

### Phase 3 — 並列実行 & Scheduler (v0.8.0)
- Electron Main process への TaskRunner 移設
- IPC: task:create / task:control / task:subscribe
- TaskQueue + 優先度スケジューラ + スターベーション防止 (60s)
- TaskControl { pause, resume, cancel, retry }

### Phase 4 — Automation / Skill / Telemetry (v0.9.0)
- Skill エンティティ + System Prompt 注入
- Automation トリガー (cron / file-watch / git-hook)
- Model Telemetry (heartbeat 30s / latency / last-used)

## 未解決事項
- packages/extension/src/router/index.ts — 旧実装残存（未使用）
- アイコン icon.png が384KB（Marketplace提出前に最適化必要）
- AgentPanel.tsx は依然 AgentState ベース（Phase 3 で taskStore 直結予定）
- @anthropic-ai/sdk の isAvailable() は models.list() を使用（API変更時に修正必要）
- FileTree: サブディレクトリ再帰 fetch 未実装

## Electron 開発サーバー起動手順
```bash
export PATH="$HOME/.local/share/pnpm:$PATH"

# Terminal 1（renderer Vite dev server）
cd packages/desktop && pnpm dev:renderer

# Terminal 2（Electron起動）
NODE_ENV=development pnpm -F @waza/desktop electron
```

## 注意事項
- packages/extension/src/extension.ts は # FROZEN（変更前に確認）
- packages/core/src/models/types.ts は # FROZEN（gemini追加は承認済み）
- packages/core/src/providers/base.ts は # FROZEN
- core の dist/ をビルドしてから extension の typecheck を実行
- pnpm は `~/.local/share/pnpm/pnpm` にある（PATH要export）
- `pnpm -r build` は desktop パッケージを含む（5パッケージ）
- packages/desktop/release/ は .gitignore 対象（バイナリは大きすぎるため）
- Review Gateway が実装されるまで write_file / delete_file はユーザー承認なしで実行される
  → Phase 2 完了（v0.7.0）まで自律書き込みタスクは運用禁止
