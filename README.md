# Waza — AI IDE

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-%5E1.87.0-blue)](https://marketplace.visualstudio.com/items?itemName=waza-ide.waza)
[![CI](https://github.com/waza-ide/waza/actions/workflows/ci.yml/badge.svg)](https://github.com/waza-ide/waza/actions)

> **Privacy-first AI coding agent for VSCode. Your code stays on your machine.**

---

## What is Waza?

Waza (技) is a privacy-first AI coding agent for VSCode.  
It automatically routes to local models (cocoro-OS, Ollama) when available,  
falling back to cloud models (Claude, Gemini) only when needed.  
**Your code never leaves your machine by default.**

---

## Privacy-first: Local Model Routing

```
Request
  └─► Is local model (Ollama / cocoro-OS) available?
        ├─ YES → run locally  (code stays on your machine)
        └─ NO  → cloud fallback (Claude / Gemini)
```

No telemetry. No data collection. Local-first by design.

---

## Features

- 🤖 **Agent Loop** — plan → tool → eval cycle with up to 10 steps
- 🔀 **Automatic model routing** — local-first, cloud fallback
- 📁 **File tools** — read, write, list, search within your workspace
- ✅ **Diff UI** — Codex-style Accept / Reject for every file change
- ⌨️ **Command palette** — `Ctrl+Shift+W` / `Cmd+Shift+W`
- 🔒 **CSP + nonce** — secure Webview implementation

---

## Quick Start

1. Install from VSCode Marketplace (search **"Waza"**)
2. Open Command Palette → `Waza: Open Agent Panel`
3. Type your request in natural language
4. Accept or reject file changes with one click

Or install locally:

```bash
code --install-extension waza-0.1.0.vsix
```

---

## Model Support

| Provider | Type | Status |
|---|---|---|
| cocoro-OS | Local | ✅ Supported |
| Ollama | Local | ✅ Supported |
| Claude API | Cloud | ✅ Supported |
| Gemini | Cloud | 🚧 Coming soon |

Configure in VSCode Settings (`waza.*`):

| Setting | Default | Description |
|---|---|---|
| `waza.preferLocalModel` | `true` | Prefer local model |
| `waza.localModelUrl` | `http://localhost:11434` | Local model endpoint |
| `waza.cloudModel` | `claude-sonnet-4-5` | Cloud fallback model |

---

## Architecture

pnpm monorepo with four packages:

| Package | Role |
|---|---|
| `packages/extension` | VSCode extension host (commands, Webview, agent loop) |
| `packages/core` | Business logic: ModelRouter, providers, types |
| `packages/ui` | Webview React UI (AgentLog, DiffView, ModelPicker) |
| `packages/cocoro-bridge` | External API bridge (cocoro-OS, Ollama) |

Dependency direction: `core` → `extension` (one-way only).

---

## Contributing

We welcome contributions! Please read [AGENTS.md](AGENTS.md) before submitting PRs.  
All PRs are automatically reviewed by CodeRabbit.

```bash
git clone https://github.com/waza-ide/waza
pnpm install
pnpm build
pnpm test
```

---

## License

[Apache License 2.0](LICENSE) — © 2026 Waza Contributors

---
---

# Waza — AI IDE（日本語）

> **プライバシーファースト設計。コードはあなたのマシンから出ない。**

---

## Wazaとは

WazaはVSCode向けのプライバシーファーストAIコーディングエージェント。  
ローカルモデル（cocoro-OS、Ollama）が利用可能な場合は自動的にローカルへルーティング。  
利用できない場合のみクラウドモデル（Claude、Gemini）にフォールバック。  
**デフォルトでコードは外部に送信されません。**

---

## プライバシーファースト設計

```
リクエスト
  └─► ローカルモデル（Ollama / cocoro-OS）は利用可能？
        ├─ YES → ローカル実行（コードはマシン内）
        └─ NO  → クラウドフォールバック（Claude / Gemini）
```

テレメトリなし。データ収集なし。ローカルファーストの設計。

---

## 機能一覧

- 🤖 **エージェントループ** — plan → tool → eval サイクル（最大10ステップ）
- 🔀 **自動モデルルーティング** — ローカル優先、クラウドフォールバック
- 📁 **ファイルツール** — 読取・書込・一覧・検索
- ✅ **差分UI** — 変更ごとにAccept / Reject選択
- ⌨️ **コマンドパレット** — `Ctrl+Shift+W` / `Cmd+Shift+W`
- 🔒 **CSP + nonce** — セキュアWebview実装

---

## クイックスタート

1. VSCode Marketplaceからインストール（「Waza」で検索）
2. コマンドパレット → `Waza: Open Agent Panel`
3. 自然言語でリクエスト入力
4. 変更をAccept / Rejectで確認

---

## 対応モデル

| プロバイダー | 種別 | 状態 |
|---|---|---|
| cocoro-OS | ローカル | ✅ 対応済み |
| Ollama | ローカル | ✅ 対応済み |
| Claude API | クラウド | ✅ 対応済み |
| Gemini | クラウド | 🚧 Coming soon |

---

## アーキテクチャ

pnpmモノレポ構成（4パッケージ）:

| パッケージ | 役割 |
|---|---|
| `packages/extension` | VSCode拡張ホスト（コマンド・Webview・エージェントループ） |
| `packages/core` | ビジネスロジック：ModelRouter・プロバイダー・型定義 |
| `packages/ui` | Webview React UI（AgentLog・DiffView・ModelPicker） |
| `packages/cocoro-bridge` | 外部API ブリッジ（cocoro-OS・Ollama） |

依存方向: `core` → `extension`（一方向のみ）

---

## コントリビュート

PRの前に[AGENTS.md](AGENTS.md)を必ず読んでください。  
PRはCodeRabbitによる自動レビューが実施されます。

---

## ライセンス

[Apache License 2.0](LICENSE) — © 2026 Waza Contributors
