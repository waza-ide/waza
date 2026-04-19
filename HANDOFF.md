# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-19
- 担当エージェント: Antigravity (Codex Mode Phase 3: v0.8.0)

## 完了タスク
- [Phase 1–11] v0.5.4 まで完了済み
- **[Codex Phase 1] v0.6.0 ✅** — Task/Step 型 + Zustand + Logger
  - branch: codex-mode/phase-1-foundation / tag: v0.6.0
- **[Codex Phase 2] v0.7.0 ✅** — Review Gateway
  - branch: codex-mode/phase-2-gateway / tag: v0.7.0
  - triggers.ts / diff.ts / gateway.ts / ReviewModal.tsx / Auto-Fix Loop
- **[Codex Phase 3] v0.8.0 ✅** — 並列実行 & Scheduler
  - branch: codex-mode/phase-3-scheduler / commit: 0533e06 / tag: v0.8.0
  - packages/desktop/src/main/scheduler/queue.ts
    - TaskQueue: priority(0/1/2) / MAX_WORKERS=3 / starvation boost >60s
    - dequeue() はフル時でもブーストを適用（正確な優先度蓄積）
  - packages/desktop/src/main/scheduler/runner.ts
    - TaskRunner: Main process エンジン / AbortController で pause/cancel
    - runAgentLoop(): node:fetch + node:fs でRendererに非依存
    - webContents.send('task:update', patch) でリアルタイムpush
  - packages/desktop/src/main/ipc/task.ts
    - setupTaskIpc(): task:create / task:control / task:snapshot
  - packages/desktop/src/preload/index.ts
    - wazaAPI.task: create / control / snapshot / onUpdate
  - packages/desktop/src/renderer/stores/taskStore.ts
    - pauseTask / resumeTask / cancelTask / retryTask (IPC委譲 + 楽観更新)
  - packages/core/src/task/types.ts — TaskStatus に 'paused' 追加
  - src/__tests__/queue.test.ts (23 tests — 時刻モックでスターベーション検証)
  - src/__tests__/taskStore.test.ts (+9 TaskControl tests)
  - テスト合計: 282/282 pass (core:150 / desktop:110 / extension:7 / bridge:10 / ui:5)

## 次のタスク

### Phase 4 — Automation / Skill / Telemetry (v0.9.0) [次フェーズ]

実装対象ブランチ: codex-mode/phase-4-skill-automation

#### 4.1 Skill
- packages/core/src/skill/types.ts — Skill { id, name, content, enabled }
- Task 実行時 task.skills[] を解決しシステムプロンプトへ注入
- packages/desktop/src/renderer/components/settings/SkillsPanel.tsx — CRUD UI
- テスト: 「Always respond in JSON」Skill が System Prompt に結合されること

#### 4.2 Automation
- packages/core/src/automation/types.ts — Automation { id, name, trigger, taskTemplate }
- トリガー: cron (node-cron) / file-watch (chokidar) / git-hook
- WazaSettings.automations に追加、Queueに流す (priority: 0)

#### 4.3 Model Telemetry
- packages/core/src/providers/base.ts — HealthCheckable interface 追加
- 各Provider: healthCheck() → { ok, latencyMs }
- Settings Panel: 🟢/🔴 + latency + last-used 表示 (30s heartbeat)

## 未解決事項 (Phase 3 残件)
- ReviewModal は App.tsx にまだマウントされていない
  → setReviewHandler() は実装済み。AgentPanel置換時に接続予定
- TaskRunner.tick() / scheduleNext() は未完全 (Phase 3 = IPC→execute 直結)
  → Phase 4 完了後に drain-loop 実装でも可
- AgentPanel.tsx は依然 AgentState ベース (Phase 3 で残存)
  → 次回 taskStore 直結に置換予定

## Electron 開発サーバー起動手順
```bash
export PATH="$HOME/.local/share/pnpm:$PATH"
cd packages/core && pnpm build   # 最初にビルド必須

# Terminal 1（renderer Vite dev server）
cd packages/desktop && pnpm dev:renderer

# Terminal 2（Electron起動）
NODE_ENV=development pnpm -F @waza/desktop electron
```

## 注意事項
- packages/extension/src/extension.ts は # FROZEN
- packages/core/src/models/types.ts は # FROZEN（gemini追加は承認済み）
- packages/core/src/providers/base.ts は # FROZEN（Phase 4 で HealthCheckable 追加時は確認）
- pnpm は ~/.local/share/pnpm/pnpm にある（PATH要export）
- core build → desktop test の順序を守ること
- packages/desktop/release/ は .gitignore 対象
- ReviewGateway は core に置く（Electron/React依存なし）
- TaskRunner は Main process 専用（Renderer から直接importしない）
