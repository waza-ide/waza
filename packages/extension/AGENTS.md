# packages/extension — Agent: ext 専任

CLAUDE.md / AGENTS.md（ルート）の全ルールを継承する。

## 担当範囲
- `packages/extension/` 配下のすべてのファイル
- VSCode Extension API のみ扱う

## 禁止事項
- `packages/ui/` を直接編集しない
- `packages/core/` のプロバイダー内部を編集しない
- VSCode API 以外の外部 HTTP 通信を直接実装しない（bridge 経由）

## 凍結ファイル（変更前にユーザー確認必須）
- `src/extension.ts`
