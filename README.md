# Waza — AI IDE

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-%5E1.87.0-blue)](https://marketplace.visualstudio.com/items?itemName=waza-ide.waza)
[![CI](https://github.com/waza-ide/waza/actions/workflows/ci.yml/badge.svg)](https://github.com/waza-ide/waza/actions)
[![Release](https://img.shields.io/github/v/release/waza-ide/waza)](https://github.com/waza-ide/waza/releases/latest)

> **Privacy-first AI coding agent. Your code stays on your machine.**

---

## What is Waza?

Waza (技) is a privacy-first AI coding IDE with an autonomous agent loop.  
It automatically routes to **local models first** (cocoro-OS, Ollama),  
falling back to cloud (Claude, Gemini) only when needed.  
**Your code never leaves your machine by default.**

---

## Privacy-first: Local Model Routing

```
Request
  └─► Is local model (cocoro-OS / Ollama) available?
        ├─ YES → run locally  (code stays on your machine)
        └─ NO  → cloud fallback (Claude / Gemini)
```

No telemetry. No data collection. Local-first by design.

---

## Features

- 🎨 **Codex-inspired UI** — Light / Dark theme, auto-detects OS setting
- 🤖 **Autonomous Agent Loop** — Task → Step → Review cycle with Pause/Resume/Cancel
- 🔀 **Automatic model routing** — local-first, cloud fallback
- 🖥️ **Local LLM support** — OpenAI-compatible API (cocoro-OS, Ollama, LiteLLM)
- 📁 **File tools** — read, write, exec within your workspace
- ✅ **Review Gateway** — Codex-style diff viewer with Accept / Reject before destructive ops
- 💡 **Skills injection** — inject json-only / concise / test-first behaviors into agent prompts
- ⌨️ **Model picker** — select auto / cocoro-OS / Ollama / Claude / Gemini from composer
- 🔒 **CSP + nonce** — secure Webview implementation

---

## Install

### VSCode Extension

```bash
code --install-extension waza-1.5.0.vsix
```

### Desktop app (Debian / Ubuntu)

```bash
sudo dpkg -i waza_1.5.0_amd64.deb
waza
```

Download from: **[GitHub Releases](https://github.com/waza-ide/waza/releases/latest)**

### Requirements

- VSCode 1.87.0+
- Node.js 20+
- (Optional) Local model server: OpenAI-compatible API on any port

---

## Quick Start

1. Install the extension or open the desktop app
2. Open Command Palette → `Waza: Open Agent Panel`
3. Type your request — Waza will plan and use tools autonomously
4. Accept or reject file changes with one click

---

## Model Support

| Provider | Type | Status |
|---|---|---|
| cocoro-OS (qwen25-72b) | Local GPU | ✅ Supported |
| Ollama | Local CPU/GPU | ✅ Supported |
| Claude Sonnet / Opus | Cloud | ✅ Supported |
| Gemini 2.0 Flash | Cloud | ✅ Supported |

### Configure local model

```json
// .vscode/settings.json
{
  "waza.preferLocalModel": true,
  "waza.localModelUrl": "http://your-server:8000/v1",
  "waza.localModel": "your-model-name",
  "waza.localApiKey": ""
}
```

Set `WAZA_LOCAL_API_KEY` environment variable for the API key.

| Setting | Default | Description |
|---|---|---|
| `waza.preferLocalModel` | `false` | Prefer local model over cloud |
| `waza.localModelUrl` | `""` | Local model base URL (OpenAI-compatible) |
| `waza.localModel` | `"qwen25-72b"` | Model name to request |
| `waza.localApiKey` | `""` | Bearer token (env var takes priority) |
| `waza.cloudModel` | `"claude-sonnet-4-5"` | Cloud fallback model |

---

## Architecture

pnpm monorepo with five packages:

| Package | Role |
|---|---|
| `packages/desktop` | Electron desktop app (Vite + React + Monaco) |
| `packages/extension` | VSCode extension (commands, Webview, agent loop) |
| `packages/core` | Business logic: ModelRouter, LocalProvider, TaskQueue, Skills |
| `packages/ui` | Shared React UI components |
| `packages/cocoro-bridge` | External API bridge (cocoro-OS, Ollama) |

Dependency direction: `core` → `extension` / `desktop` (one-way only).

---

## Contributing

We welcome contributions! Please read [AGENTS.md](AGENTS.md) before submitting PRs.

```bash
git clone https://github.com/waza-ide/waza
pnpm install
pnpm build   # build all packages
pnpm test    # 375 tests
pnpm lint    # 0 errors
```

---

## License

[Apache License 2.0](LICENSE) — © 2026 Waza Contributors

---

# Waza — AI IDE（日本語）

> **プライバシーファースト設計。コードはあなたのマシンから出ない。**

---

## Wazaとは

WazaはVSCode向けのプライバシーファーストAI IDEです。  
ローカルモデル（cocoro-OS、Ollama）が利用可能な場合は自動的にローカルへルーティング。  
利用できない場合のみクラウドモデル（Claude、Gemini）にフォールバック。  
**デフォルトでコードは外部に送信されません。**

---

## インストール

### VSCode Extension

```bash
code --install-extension waza-1.5.0.vsix
```

### デスクトップアプリ（Debian / Ubuntu）

```bash
sudo dpkg -i waza_1.5.0_amd64.deb
waza
```

ダウンロード: **[GitHub Releases](https://github.com/waza-ide/waza/releases/latest)**

---

## 機能一覧

- 🎨 **Codex風UI** — ライト/ダークテーマ（OS設定自動検知）
- 🤖 **自律エージェントループ** — タスク駆動型 Pause/Resume/Cancel
- 🔀 **自動モデルルーティング** — ローカル優先、クラウドフォールバック
- 🖥️ **ローカルLLM対応** — OpenAI互換API（cocoro-OS、Ollama）
- ✅ **Review Gateway** — 破壊的操作前に差分確認（Accept/Reject）
- 💡 **Skill injection** — エージェントの振る舞いをカスタマイズ
- ⌨️ **モデルピッカー** — Composerから直接モデル選択

---

## ローカルモデル設定

```json
// .vscode/settings.json
{
  "waza.preferLocalModel": true,
  "waza.localModelUrl": "http://your-server:8000/v1",
  "waza.localModel": "qwen25-72b",
  "waza.localApiKey": ""
}
```

APIキーは `WAZA_LOCAL_API_KEY` 環境変数で設定（設定ファイルより優先）。

---

## コントリビュート

PRの前に [AGENTS.md](AGENTS.md) を必ず読んでください。

---

## ライセンス

[Apache License 2.0](LICENSE) — © 2026 Waza Contributors
