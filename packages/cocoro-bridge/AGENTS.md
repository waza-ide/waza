# packages/cocoro-bridge — Agent: bridge 専任

CLAUDE.md / AGENTS.md（ルート）の全ルールを継承する。

## 担当範囲
- `packages/cocoro-bridge/` 配下のすべてのファイル
- cocoro-OS（:8001）および Ollama との HTTP 通信のみ担当

## 禁止事項
- VSCode API を import しない
- `packages/extension/` や `packages/ui/` を直接編集しない
- 直接 Anthropic API を呼ばない（claude はクラウドフォールバック）
