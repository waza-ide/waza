---
name: review-prep
description: PR作成前の自己レビューチェック。「レビュー準備して」と言われたら使う。
---

## チェックリスト
1. STRUCTURE.md の凍結ファイルに変更がないか確認する
2. `pnpm typecheck` を実行してエラーがないか確認する
3. `pnpm lint` を実行してエラーがないか確認する
4. `pnpm test` を実行してテストが通るか確認する
5. APIキー・トークンのハードコードがないか grep で確認する
   `grep -r "sk-\|api_key\|apiKey\|token" --include="*.ts" packages/`
6. TODO / FIXME コメントが残っていないか確認する
7. 問題がなければ「PR作成準備完了」と報告する
