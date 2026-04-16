# packages/ui — Agent: ui 専任

CLAUDE.md / AGENTS.md（ルート）の全ルールを継承する。

## 担当範囲
- `packages/ui/` 配下のすべてのファイル
- React / Webview コンポーネントのみ担当

## 禁止事項
- VSCode API に直接アクセスしない（`vscode` モジュールを import しない）
- `packages/extension/` を直接編集しない
- 通信は `postMessage` / `window.addEventListener('message')` のみ使用

## セキュリティ原則
- CSP / nonce の破壊につながるコードを書かない
