# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-17
- 担当エージェント: Antigravity (Phase 5: VSIX生成・Marketplace公開準備)

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
- [genshijin] .claude/skills/genshijin/SKILL.md 導入 + CLAUDE.md追記
- [Phase 5] packages/extension/package.json — publisher/repository/keywords/icon等追加、private削除
- [Phase 5] packages/extension/.vscodeignore — 不要ファイル除外設定
- [Phase 5] packages/extension/LICENSE — Apache 2.0 コピー
- [Phase 5] packages/extension/assets/icon.png — 技アイコン（teal/circuit）配置
- [Phase 5] README.md — Marketplace掲載用（英日両言語・バッジ・モデル対応表）
- [Phase 5] CHANGELOG.md — v0.1.0 リリースノート
- [Phase 5] .github/workflows/release.yml — タグpush時VSIX自動生成＋Draft Release
- [Phase 5] waza-0.1.0.vsix — ローカル生成確認済み（395KB、警告なし）

## 次のタスク（候補）
- アイコン最適化（128x128px PNG、現在384KBで大きい → Marketplace提出前に差し替え）
- packages/cocoro-bridge 本実装
- DiffView行差分アルゴリズム改善
- Marketplace正式公開（publisher登録 `waza-ide`・アイコン最適化）
- Gemini provider 本実装
- v0.1.0 タグ push + GitHub Draft Release 発火
  → `git tag v0.1.0 && git push origin v0.1.0` でCI起動

## 未解決事項
- packages/extension/src/router/index.ts は Phase 1 の旧実装が残存
  → @waza/core の ModelRouter を使うため未使用。Phase 6でリファクタ対応
- @anthropic-ai/sdk の isAvailable() は models.list() を使用
  → 将来バージョンで型変更時は修正が必要
- アイコン icon.png が384KB（推奨よりも大）
  → Marketplace提出時に128×128px適切サイズに最適化すること

## 注意事項
- packages/extension/src/extension.ts は # FROZEN（変更前に確認）
- packages/core/src/models/types.ts は # FROZEN
- packages/core/src/providers/base.ts は # FROZEN
- core の dist/ をビルドしてから extension の typecheck を実行すること
  → `pnpm -F @waza/core build` を先に実行する
- pnpm は `~/.local/share/pnpm/pnpm` にある（PATH未設定環境では要export）

