# packages/core — Agent: core 専任

CLAUDE.md / AGENTS.md（ルート）の全ルールを継承する。

## 担当範囲
- `packages/core/` 配下のすべてのファイル

## 禁止事項
- `packages/extension/` への直接依存・編集
- `packages/ui/` への直接依存・編集
- VSCode API の import

## 凍結ファイル（変更前にユーザー確認必須）
- `src/models/types.ts`
- `src/providers/base.ts`
