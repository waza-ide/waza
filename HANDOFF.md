# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-19
- 担当エージェント: Antigravity (Codex Mode Phase 5: **v1.0.0 MVP**)

## Codex Mode 全フェーズ完了サマリー

| Phase | バージョン | Branch | 内容 |
|---|---|---|---|
| Phase 1 | v0.6.0 | codex-mode/phase-1-foundation | Task/Step 型 + Zustand + Logger |
| Phase 2 | v0.7.0 | codex-mode/phase-2-gateway | Review Gateway (安全層) |
| Phase 3 | v0.8.0 | codex-mode/phase-3-scheduler | 並列実行 / TaskQueue / IPC |
| Phase 4 | v0.9.0 | codex-mode/phase-4-skill-automation | Skill / Automation / Telemetry |
| **Phase 5** | **v1.0.0** | **codex-mode/phase-5-ui-integration** | **UI 統合 / MVP 完成** |

## Phase 5 詳細 (v1.0.0 MVP)
- branch: codex-mode/phase-5-ui-integration / tag: v1.0.0
- **App.tsx** — ReviewModal を Promise ブリッジで接続 (`setReviewHandler()`)
- **AgentPanelV2.tsx** — taskStore 直結 (Pause/Resume/Cancel/Retry 制御バー付き)
- **SkillsPanel.tsx** — built-in 3 Skills + カスタム作成 + toggle 永続化
- **TelemetryPanel.tsx** — 🟢/🔴 ドット / latency / 30s heartbeat
- **SettingsContext.tsx** — `activeSkillIds[]` + `toggleSkill()` + `waza-settings-v2`
- **SettingsPanel.tsx** — Skills / Telemetry セクション追加 (計 7 セクション)
- テスト: agentPanelV2.test.ts (11 tests)
- 合計: **333/333 pass** (core:190 / desktop:121 / extension:7 / bridge:10 / ui:5)

## 残件 (v1.0.0 後の課題)

### 短期 (v1.1.0)
- AgentPanel.tsx の削除 (V2 安定後)
- Skill を Task 実行時に実際に注入 (loop.ts `injectSkills()` 呼び出し)
- task:update イベントで taskStore を自動更新する `applyPatch()` reducer 実装
- Automation トリガーの実際実装 (node-cron / chokidar を Main process で起動)

### 中期 (v1.2.0)
- TaskRunner.tick() + drain-loop での真の非同期スケジューリング
- マルチタスク UI (タスク一覧サイドバー)
- diff-based file change preview (ReviewModal → SkillsPanel 連携)

## 開発サーバー起動
```bash
export PATH="$HOME/.local/share/pnpm:$PATH"
cd packages/core && pnpm build   # 必須

# Terminal 1 — Vite renderer
cd packages/desktop && pnpm dev:renderer

# Terminal 2 — Electron
NODE_ENV=development pnpm -F @waza/desktop electron
```

## 重要な注意事項
- `packages/core/src/providers/base.ts` **FROZEN**
- `packages/core/src/models/types.ts` **FROZEN**
- `packages/extension/src/extension.ts` **FROZEN**
- localStorage key: `waza-settings-v2` (v1 から変更済み)
- pnpm: `~/.local/share/pnpm/pnpm` (PATH export 必須)
- テスト実行前に `cd packages/core && pnpm build` を実行
- ReviewModal は `@waza/core` の `ReviewRequest` / `GatewayDecision` 型を使用
- SkillsPanel で作成したカスタム Skill は現状ページリロードで消える (localStorage 永続化は次フェーズ)
