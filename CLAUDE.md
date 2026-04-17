# Waza — Claude Code 指示書

## 基本方針
- 返答・コメントはすべて日本語
- 応急処置禁止・根本修正のみ（# QUICKFIX コメントを見つけたら必ず報告）
- パッケージ間依存は core → extension の一方向のみ
- 凍結ファイルは STRUCTURE.md を参照。変更前に必ず確認すること

## スタック
- pnpm workspaces（packages/ 配下）
- TypeScript strict モード
- Vitest（テスト）
- ESLint + Prettier

## コマンド
- `pnpm build` — 全パッケージビルド
- `pnpm test` — 全テスト実行
- `pnpm lint` — lint チェック
- `pnpm -F extension package` — VSIX 生成

## エージェント境界
- packages/extension/ → Agent: ext（VSCode API 専任）
- packages/core/      → Agent: core（ビジネスロジック専任）
- packages/ui/        → Agent: ui（Webview React 専任）
- packages/cocoro-bridge/ → Agent: bridge（外部API専任）
- 自分のパッケージ外を編集する前に必ずユーザーに確認する

## セキュリティ
- APIキー・トークンをコードにハードコード禁止
- .env ファイルは .gitignore に含める
- Webview は CSP + nonce を必ず実装

## トークン効率化

genshijin スキル導入済み。
エージェントは `/genshijin` で起動可能。
通常モード・丁寧モード・極限モードの3段階。
破壊的操作の確認時のみ通常語に自動復帰。
