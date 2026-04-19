# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-19
- 担当エージェント: Antigravity (Codex Mode Phase 4: v0.9.0)

## 完了タスク

| Phase | バージョン | 内容 |
|---|---|---|
| Phase 1 | v0.6.0 | Task/Step 型 + Zustand + Logger |
| Phase 2 | v0.7.0 | Review Gateway |
| Phase 3 | v0.8.0 | 並列実行 & Scheduler |
| **Phase 4** | **v0.9.0** | **Automation / Skill / Telemetry** |

### Phase 4 詳細 (v0.9.0)
- branch: codex-mode/phase-4-skill-automation / commit: fb20ed3 / tag: v0.9.0
- **packages/core/src/skill/types.ts**
  - Skill エンティティ型
  - buildSkillPrompt(): skillIds × allSkills → system-prompt block
  - injectSkills(): base prompt への prepend (disabled 除外)
  - BUILTIN_SKILLS: json-only / concise / test-first (全デフォルト無効)
- **packages/core/src/automation/types.ts**
  - Automation エンティティ型
  - CronTrigger / FileWatchTrigger / GitHookTrigger
  - renderAutomationPrompt(): {{placeholder}} → event data
- **packages/core/src/providers/health.ts**
  - HealthCheckable interface (base.ts FROZEN のため分離)
  - isHealthCheckable() 型ガード
  - ProviderTelemetry record (latency / lastUsedAt)
- **全 Provider に healthCheck() 追加**
  - CocoroCLMProvider: /health endpoint
  - OllamaProvider: /api/tags endpoint
  - ClaudeProvider: models.list()
  - GeminiProvider: countTokens('ping')
- テスト: skill.test.ts (19) + automation.test.ts (10) + health.test.ts (11)
- 合計: **322/322 pass** (core:190 / desktop:110 / extension:7 / bridge:10 / ui:5)

## 次のタスク

### Phase 5 — UI 統合 & MVP 完成 (v1.0.0)

**ブランチ**: `codex-mode/phase-5-ui-integration`

#### 5.1 ReviewModal の App.tsx 接続 (Phase 2 残件)
- App.tsx で `ReviewModal` をマウント
- `loop.setReviewHandler()` を呼び出し、Promise ベースの UI フロー確立
- `useTaskStore` のアクティブタスクを ReviewModal に渡す

#### 5.2 AgentPanel → taskStore 直結 (Phase 1/3 残件)
- AgentPanel.tsx を taskStore 直結に書き直し
- AgentState adapter を削除
- `task:update` push events を受信して UI 更新

#### 5.3 SkillsPanel UI
- packages/desktop/src/renderer/components/settings/SkillsPanel.tsx
- Skill 一覧 + トグル + カスタム Skill 作成
- WazaSettings に skills[] 永続化

#### 5.4 Telemetry Status Bar
- Settings panel にプロバイダー稼働状況表示
  (🟢/🔴 / latency / last-used)
- 30秒 heartbeat (setInterval + healthCheck)

#### 5.5 Automation Panel (初版)
- Automation 一覧 UI (有効/無効/最終実行時刻)
- cron トリガーの手動テスト発火ボタン

## 未解決事項 (前フェーズ引き継ぎ)
- ReviewModal ← App.tsx 未接続 → Phase 5 で対応
- AgentPanel.tsx は AgentState ベース → Phase 5 で taskStore 直結
- TaskRunner.scheduleNext() は不完全 → Phase 5 で drain-loop 実装

## 開発サーバー起動手順
```bash
export PATH="$HOME/.local/share/pnpm:$PATH"
cd packages/core && pnpm build  # MUST BUILD FIRST

# Terminal 1: Renderer
cd packages/desktop && pnpm dev:renderer

# Terminal 2: Electron
NODE_ENV=development pnpm -F @waza/desktop electron
```

## 注意事項
- packages/core/src/providers/base.ts は **FROZEN**
- packages/core/src/models/types.ts は **FROZEN**
- packages/extension/src/extension.ts は **FROZEN**
- pnpm: ~/.local/share/pnpm/pnpm (PATH に要 export)
- core build → test の順序を守ること
- HealthCheckable は health.ts に定義 (base.ts に触れない)
- BUILTIN_SKILLS はデフォルト disabled — ユーザーが手動で有効化
