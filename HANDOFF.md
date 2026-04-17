# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-17
- 担当エージェント: Antigravity (Phase 1 初期構築 / Phase 3 extension 実装)

## 完了タスク
- [Phase 1] モノレポ初期構造の構築（CLAUDE.md / AGENTS.md / STRUCTURE.md / pnpm workspace）
- [Phase 1] .claude/ ハーネス（settings / rules / skills / agents）
- [Phase 1] 4パッケージ骨格（extension / core / ui / cocoro-bridge）
- [Phase 1] CI / CodeRabbit 設定 / LICENSE
- [Phase 3] @waza/core に ModelConfig 型・ModelRouter クラスを追加
- [Phase 3] packages/extension/src/extension.ts — FROZEN 実装（activate/deactivate）
- [Phase 3] packages/extension/src/agent/loop.ts — AgentLoop（plan→tool→eval、最大10ステップ）
- [Phase 3] packages/extension/src/agent/tools.ts — readFile / writeFile / listDirectory / findFiles
- [Phase 3] packages/extension/src/webview/panel.ts — WazaPanel（CSP+nonce / Accept-Reject diff）
- [Phase 3] packages/extension/src/__tests__/agent.test.ts — 7テスト全通過
- [Phase 3] pnpm typecheck ✅ / lint ✅ / test ✅ 7/7

## 次のタスク
- Phase 4: packages/ui — Webview React UI の本実装（現在はプレースホルダー HTML）
  - AgentLog / DiffView / ModelPicker コンポーネントのバンドル
  - WazaPanel.getHtml() を React に差し替え
- Phase 5: packages/cocoro-bridge の本格実装
- VSIX パッケージング検証（`pnpm -F extension package`）

## 未解決事項
- packages/extension/src/router/index.ts は Phase 1 の旧実装が残存
  → Phase 3 では @waza/core の ModelRouter を使うため未使用だが削除は Phase 4 向けリファクタで対応
- @anthropic-ai/sdk は packages/core に追加済みだが Claude API の isAvailable() は models.list() を使用
  → 将来のバージョンで SDK の型が変わった場合は修正が必要

## 注意事項
- packages/extension/src/extension.ts は # FROZEN（変更前に確認）
- packages/core/src/models/types.ts は # FROZEN
- packages/core/src/providers/base.ts は # FROZEN
- core の dist/ をビルドしてから extension の typecheck を実行すること
  → `pnpm -F @waza/core build` を先に実行する
