# Agent: desktop 専任

## 担当範囲
packages/desktop/ のみ。

## 制約
- packages/core / ui / extension / cocoro-bridge には触れない
- @waza/core @waza/ui は import のみ
- Electron の contextBridge 経由でのみ Node API にアクセス（nodeIntegration 禁止）
- IPC ハンドラーは main/index.ts に集約する

## ビルド順序
@waza/core → @waza/ui → @waza/desktop
