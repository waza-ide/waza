# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-19
- 担当エージェント: Antigravity (Phase 11 Codex UI: **v1.5.0**)
- Branch: `phase-11-codex-ui` / tag: `v1.5.0`

## バージョン履歴

| Tag | Branch | 内容 |
|---|---|---|
| v0.6.0 | codex-mode/phase-1-foundation | Task/Step 型 + Zustand + Logger |
| v0.7.0 | codex-mode/phase-2-gateway | Review Gateway (安全層) |
| v0.8.0 | codex-mode/phase-3-scheduler | 並列実行 / TaskQueue / IPC |
| v0.9.0 | codex-mode/phase-4-skill-automation | Skill / Automation / Telemetry |
| v1.0.0 | codex-mode/phase-5-ui-integration | UI 統合 / MVP 完成 |
| — | codex-mode/phase-5-ui-integration | LocalProvider + cocoro-llm-server 本格統合 |
| **v1.5.0** | **phase-11-codex-ui** | **Codex実UI完全準拠 + ライト/ダーク対応** |

## Phase 11 詳細 (v1.5.0)

### デザインシステム
| ファイル | 内容 |
|---|---|
| `styles/tokens.ts` | `lightTokens` / `darkTokens` / `staticTokens` 分離。`ThemeTokens` 型。後方互換 `tokens` export |
| `context/ThemeContext.tsx` | OS auto-detect (`prefers-color-scheme`) + `toggleTheme()` + `body[data-theme]` 属性付与 |
| `styles/global.css` | `data-theme="dark"` 対応スクロールバー/selection/focus-visible |

### コンポーネント一覧 (Codex準拠)
| コンポーネント | 説明 |
|---|---|
| `TitleBar` | macOSトラフィックライト / スレッド名 / テーマToggle (内部でuseTheme) / UpdaterBadge |
| `Sidebar` | SVGアイコン付き New thread✦ / Automations◈ / Skills⬡ ナビ + スレッドグループ + FileTree fallback |
| `StatusBar` | Local\|Worktree\|Cloud + ⎇branch + cocoro🟢ドット→Settings (endpoint: /v1/models) |
| `WelcomeScreen` | 技ロゴ / "Let's build" / フォルダ選択ボタン |
| `Composer` | `AVAILABLE_MODELS` export / インラインモデルピッカー (auto/cocoro/Ollama/Claude/Gemini) |
| `AgentPanelV2` | taskStore直結 / Pause\|Resume\|Cancel\|Retry / ステップログストリーム |
| `ReviewModal` | Promise bridge / unified diff viewer |
| `SkillsPanel` | built-in 3 Skills toggle + カスタム作成 |
| `TelemetryPanel` | 🟢/🔴 + latency + 30s heartbeat |

### 廃止 (削除済み)
- `components/layout/ActivityBar.tsx` — Sidebar に統合
- `components/WazaSidebar.tsx` — 未使用
- `components/AgentHistory.tsx` — 未使用

### テスト (375/375)
| パッケージ | テスト数 |
|---|---|
| core | 213 |
| desktop | **132** (+11: Phase 11 layout) |
| extension | 15 |
| cocoro-bridge | 10 |
| ui | 5 |
| **Total** | **375** |

## cocoro-llm-server 接続
| 項目 | 値 |
|---|---|
| エンドポイント | http://192.168.50.112:8000/v1 |
| モデル | qwen25-72b |
| ヘルスチェック | GET /v1/models |
| API キー | 環境変数 `WAZA_LOCAL_API_KEY` (または .vscode/settings.json — gitignore) |

## 残件 (v1.6.0)

### 短期
1. **Automation Engine** — cron/file-watch を Main process で実装
2. **task:update applyPatch()** — IPC push → taskStore 自動更新
3. **TaskRunner drain-loop** — 真の非同期スケジューリング
4. **SkillsPanel カスタム Skill 永続化** — localStorage
5. **StatusBar branch 表示** — `window.wazaAPI.git.branch()` IPC 経由で実際のブランチ名を取得

### 中期
6. マルチタスク UI (タスク一覧サイドバー)
7. Thread グループ永続化 (localStorage or IndexedDB)

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
- **FROZEN**: `base.ts` / `models/types.ts` / `extension.ts`
- **gitignore**: `.vscode/settings.json` (APIキー含む → `.vscode/settings.json.example` 参照)
- **qwen25-72b** が正式モデル名（gpt-4o エイリアスは非推奨）
- `useTheme()` 経由で tokens を取得。ハードコード色は禁止
- StatusBar の cocoro 死活は GET /v1/models (not /health)
- pnpm: `~/.local/share/pnpm/pnpm` (PATH export 必須)
- core build → test の順序を守ること
