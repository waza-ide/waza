---
paths:
  - "packages/**/*.ts"
  - "packages/**/*.tsx"
---

# TypeScript コード規約

- strict モード遵守
- interface より type を優先（Union型との相性のため）
- 非同期処理は async/await 統一（Promise.then チェーン禁止）
- barrel export（index.ts）を各パッケージに必ず用意する
