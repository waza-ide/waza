---
name: commit
description: 変更をステージングしてコミットする。「コミットして」と言われたら使う。
---

## 手順
1. `git status` で変更ファイルを確認する
2. 変更内容を分析し、conventional commits 形式でメッセージを作成する
   - feat / fix / chore / docs / refactor / test / style
3. `git add -A` でステージング
4. `git commit -m "type(scope): message"` でコミット
5. コミット内容を日本語で要約して報告する
