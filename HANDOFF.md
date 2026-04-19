# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-19
- 担当エージェント: Antigravity (LocalProvider + Skill injection: v1.0.1)

## Codex Mode 全フェーズ完了サマリー

| Phase | バージョン | Branch | 内容 |
|---|---|---|---|
| Phase 1 | v0.6.0 | codex-mode/phase-1-foundation | Task/Step 型 + Zustand + Logger |
| Phase 2 | v0.7.0 | codex-mode/phase-2-gateway | Review Gateway (安全層) |
| Phase 3 | v0.8.0 | codex-mode/phase-3-scheduler | 並列実行 / TaskQueue / IPC |
| Phase 4 | v0.9.0 | codex-mode/phase-4-skill-automation | Skill / Automation / Telemetry |
| Phase 5 | v1.0.0 | codex-mode/phase-5-ui-integration | UI 統合 / MVP 完成 |
| **LocalProvider** | **v1.0.1相当** | codex-mode/phase-5-ui-integration | cocoro-llm-server 本格統合 |

## LocalProvider 詳細 (最新)

### 接続情報
| 項目 | 値 |
|---|---|
| エンドポイント | http://192.168.50.112:8000/v1 |
| モデル名 | qwen25-72b（Qwen 2.5 72B Instruct AWQ）|
| Bearer Token | 環境変数 WAZA_LOCAL_API_KEY 推奨 (/.vscode/settings.json は gitignore) |
| ヘルスチェック | GET /v1/models (200 OK) |
| タイムアウト | 120,000ms |

### 実装ファイル
- **packages/core/src/providers/LocalProvider.ts** (NEW)
  - `LocalProviderConfig`: baseUrl / apiKey / model / maxTokens / timeoutMs
  - `isAvailable()`: GET /v1/models (3s timeout, Bearer auth)
  - `complete()`: stream=false
  - `stream()`: SSE (data: chunks + [DONE])
  - `healthCheck()`: HealthCheckable実装
- **packages/core/src/router/index.ts**
  - `COCORO_CLM_MODEL`: gpt-4o → **qwen25-72b**
  - `routeWithPreference(preferLocal, localConfig?, cloudApiKey?)`: preferLocal=true → LocalProvider → Claude fallback
- **packages/extension/src/config.ts** (NEW)
  - `readConfig()`: `waza.preferLocalModel` / `localModelUrl` / `localModel` / `localApiKey`
  - 優先度: `WAZA_LOCAL_API_KEY` 環境変数 → VSCode設定
- **packages/extension/src/router/index.ts**
  - readConfig() + routeWithPreference() 連携
- **packages/desktop/src/renderer/agent/loop.ts**
  - `DEFAULT_SETTINGS.cocoroModel`: gpt-4o → **qwen25-72b**
  - `LoopSettings.activeSkillIds?: string[]` 追加
  - `buildSystemPrompt(activeSkillIds)`: `injectSkills()` 適用 (Skill injection E2E)
  - `resolveAuto()`: /health → **/v1/models** (LocalProvider整合)

### テスト
- `packages/core/src/__tests__/LocalProvider.test.ts` (23 tests)
- `packages/extension/src/__tests__/config.test.ts` (8 tests)
- **合計: 364/364 tests passing**

### VSCode 設定 (動作確認手順)
```bash
# .vscode/settings.json をコピーして API キーを設定
cp .vscode/settings.json.example .vscode/settings.json
# localApiKey にトークンを記入 (または環境変数で)
export WAZA_LOCAL_API_KEY=mdl-llm-2026
```

## 残件 (次バージョン v1.1.0)

### 短期
1. **Automation Engine** — cron/file-watch イベントループを Main process で実装 (node-cron / chokidar)
2. **task:update applyPatch()** — IPC push イベントで taskStore を自動更新するreducer
3. **TaskRunner drain-loop** — queue の真の非同期スケジューリング
4. **SkillsPanel カスタム Skill 永続化** — localStorage へ保存

### 中期
5. マルチタスク UI (タスク一覧サイドバー)
6. extension/src/router → LocalProvider を直接インスタンス化 (不要な CocoroCLMProvider 依存を除去)

## 開発サーバー起動
```bash
export PATH="$HOME/.local/share/pnpm:$PATH"
cd packages/core && pnpm build   # 必須

# Terminal 1 — Vite renderer
cd packages/desktop && pnpm dev:renderer

# Terminal 2 — Electron
NODE_ENV=development pnpm -F @waza/desktop electron
```

## 注意事項
- **FROZEN**: base.ts / models/types.ts / extension.ts
- **gitignore**: .vscode/settings.json (APIキー含む)
- **qwen25-72b** が正式モデル名。gpt-4o / gpt-4o-mini は LiteLLM エイリアス (非推奨)
- `WAZA_LOCAL_API_KEY` 環境変数が VSCode settings.localApiKey より優先
- `isAvailable()` は GET /v1/models (not /health) を使用
- pnpm: `~/.local/share/pnpm/pnpm` (PATH export 必須)
- core build → test の順序を守ること
