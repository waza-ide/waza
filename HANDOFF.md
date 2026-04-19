# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-19
- 担当エージェント: Antigravity (Phase 8: v0.2.0 リリース)

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
- [Phase 7] .deb パッケージ生成 ✅ — `waza_0.1.0_amd64.deb` (80MB)
  - executableName: waza 修正（@wazadesktop → waza）
  - commit: 7e9d536
- [Phase 8] v0.2.0 リリース ✅
  - FileTree再帰展開（TreeNodeベース遅延ロード / IGNORE / ソート / カラー / 選択ハイライト）
  - DesktopAgentLoop移植（src/renderer/agent/loop.ts + types.ts）
    - VSCode依存完全除去（vscode.window.* / vscode.Disposable → コールバック/IPC）
    - parseModelResponse: TOOL: / DONE: / text パース（export済みテスト可能）
    - dispatchTool: read_file / write_file / exec_command
  - IPC agent:exec 追加（mainプロセスでexecSync実行, timeout=30s）
  - WazaSidebar: DesktopAgentLoop差し替え + 停止ボタン + 状態表示
  - vitest追加: desktop 13/13 / 全パッケージ 34/34 pass
  - waza_0.2.0_amd64.deb 生成確認 (80MB)
  - commit: 34b565d / tag: v0.2.0 push済み
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
- [Phase 7] .deb パッケージ生成 ✅ — `waza_0.1.0_amd64.deb` (80MB) / `waza_0.1.0_x86_64.AppImage` (120MB)
  - electron-builder.yml: maintainer / artifactName 追記
  - package.json: author / description / homepage 追記
  - commit: f116f65

## 次のタスク（候補）
- `sudo dpkg -i packages/desktop/release/waza_0.1.0_amd64.deb && waza` — インストール・起動確認（要ターミナル）
- Electron開発サーバー起動確認（詳細は下記手順参照）
- FileTreeの再帰展開（現在はルートのみ、サブディレクトリ展開は未実装）
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
- FileTree: ルートのエントリーのみ表示（サブディレクトリのクリック展開は状態管理のみで再帰fetchなし）

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
