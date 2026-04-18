# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-18
- 担当エージェント: Antigravity (Phase 6: 並列実装 / Phase 7: Electron MVP)

## 完了タスク
- [Phase 1] モノレポ初期構造（CLAUDE.md / AGENTS.md / STRUCTURE.md / pnpm workspace）
- [Phase 1] .claude/ ハーネス / 4パッケージ骨格 / CI / CodeRabbit / LICENSE
- [Phase 3] ModelRouter / AgentLoop / WazaPanel / テスト 7/7 pass
- [genshijin] .claude/skills/genshijin/SKILL.md 導入
- [Phase 5] VSIX生成・README・CHANGELOG・release.yml・v0.1.0タグ push
- [Phase 6] cocoro-bridge: zodバリデーション / APIキー認証 / リトライ / detectLocalModels
- [Phase 6] ui: DiffViewWithContent（diffLines / 折りたたみ / y/n キーボードショートカット）
- [Phase 6] core: GeminiProvider 実装 / ModelRouter に gemini フォールバック追加
- [Phase 6] ProviderKind / ModelConfig に "gemini" 追加（FROZEN types.ts に追記）
- [Phase 6] 全テスト: cocoro-bridge 10/10 / ui 5/5 / core 4/4 / extension 7/7 pass
- [Phase 6] commit: ad5e2f4
- [Phase 7] packages/desktop/ 新規作成（Electron v29 + Monaco + React）
  - src/main/index.ts — IPC handlers（readFile/writeFile/readDir/openFolder）
  - src/preload/index.ts — contextBridge（window.wazaAPI）
  - src/renderer/App.tsx — 3ペインレイアウト（FileTree/Editor/WazaSidebar）
  - src/renderer/components/FileTree.tsx — 再帰展開ファイルツリー
  - src/renderer/components/Editor.tsx — Monaco + Ctrl+S保存
  - src/renderer/components/WazaSidebar.tsx — ModelRouter連携チャットUI
  - tsconfig.main/renderer / vite.config.ts / electron-builder.yml / AGENTS.md
  - build:main ✅ / build:renderer ✅（253KB bundle）

## 次のタスク（候補）
- Electron起動確認（Electronダウンロード後: `pnpm desktop:electron`）
  → `packages/desktop/electron` または `NODE_ENV=development pnpm desktop:electron`
- .deb パッケージ生成: `pnpm desktop:package` → `sudo dpkg -i release/waza_*.deb`
- FileTreeの再帰展開深度制限（現在は無制限）
- AgentLoop を extension の loop.ts から desktop に移植
- 自動アップデート（electron-updater）
- Marketplace正式公開（publisher登録 `waza-ide`・アイコン最適化 128px）
- DiffViewWithContent を WazaPanel（extension）にも接続
- v0.2.0計画: マルチファイル編集・コンテキスト管理・テスト自動生成

## 未解決事項
- packages/extension/src/router/index.ts — Phase 1 旧実装残存（未使用）
- アイコン icon.png が384KB（Marketplace提出前に最適化必要）
- FROZEN types.ts に "gemini" を追記済み（union拡張のため破壊なし）
- @anthropic-ai/sdk の isAvailable() は models.list() を使用（API変更時に修正必要）
- pnpm approve-builds で electron build scripts 承認中（ダウンロード待ち）

## Electron 開発サーバー起動手順
```bash
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
- Electron起動前に `pnpm approve-builds` + electron ダウンロードが必要
