---
paths:
  - "packages/ui/**"
  - "packages/extension/src/webview/**"
---

# Webview セキュリティ規約

- Content Security Policy（CSP）を必ず設定
- nonce をすべてのインラインスクリプト・スタイルに適用
- VSCode API への直接アクセス禁止（メッセージパッシングのみ）
- postMessage のデータは必ず型バリデーション
