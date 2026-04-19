# Waza — AI IDE

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-%5E1.87.0-blue)](https://marketplace.visualstudio.com/items?itemName=waza-ide.waza)
[![CI](https://github.com/waza-ide/waza/actions/workflows/ci.yml/badge.svg)](https://github.com/waza-ide/waza/actions)
[![Release](https://img.shields.io/badge/release-v1.5.0-brightgreen)](https://github.com/waza-ide/waza/releases/tag/v1.5.0)
[![Tests](https://img.shields.io/badge/tests-375%20passing-brightgreen)](#)

> **Privacy-first autonomous AI coding IDE. Your code stays on your machine.**

---

## What is Waza?

Waza (技) is a privacy-first autonomous AI coding IDE.  
It routes to **local LLMs first** (cocoro-OS, Ollama) and falls back to cloud (Claude, Gemini) only when needed.  
An autonomous agent loop plans tasks, uses tools, and asks for your review before making destructive changes.  
**Your code never leaves your machine by default.**

---

## Privacy-first routing

```
Request
  └─► Is local model (cocoro-OS / Ollama) available?
        ├─ YES → run locally  (code stays on your machine)
        └─ NO  → cloud fallback (Claude / Gemini)
```

No telemetry. No data collection. Local-first by design.

---

## Features

### UI (v1.5.0 — Codex-inspired)
- 🎨 **Light / Dark theme** — Auto-detects OS setting (`prefers-color-scheme`), manual toggle in title bar
- 🗂️ **Sidebar** — New thread / Automations / Skills nav + thread groups + file tree
- 💬 **Model picker** — Select model inline: `auto` / `cocoro-OS` / `Ollama` / `Claude Sonnet` / `Claude Opus` / `Gemini 2.0 Flash`
- 🖥️ **Welcome screen** — "Let's build" with folder selector
- 📊 **Status bar** — `Local | Worktree | Cloud` + Git branch + cocoro-OS live indicator (🟢/🔴)
- 🪟 **Monaco editor** — Theme syncs automatically (`vs` / `vs-dark`)

### Agent (Codex Mode)
- 🤖 **Autonomous agent loop** — Task → Step → tool cycle (up to 10 steps)
- ⏸️ **Task controls** — Pause / Resume / Cancel / Retry in AgentPanel
- 🛡️ **Review Gateway** — Diff-based review before any destructive file write, delete, or dangerous shell command
- 📋 **Task store** — Zustand-based Task / Step state with live log streaming
- 💡 **Skills** — `json-only` / `concise` / `test-first` injected into system prompt; custom skills supported

### Local LLM (LocalProvider)
- 🖧 **OpenAI-compatible API** — any server speaking `/v1/chat/completions`
- ✅ **Health check** — `GET /v1/models` with 3s timeout
- ⚡ **SSE streaming** — full `data:` chunk handling including `[DONE]`
- 🔄 **Auto-fallback** — `routeWithPreference()` tries local first, falls back to Claude on failure

### Model providers
| Provider | Type | Kind |
|---|---|---|
| cocoro-OS (qwen25-72b) | Local GPU | `LocalProvider` |
| Ollama | Local CPU/GPU | `OllamaProvider` |
| Claude Sonnet / Opus | Cloud | `ClaudeProvider` |
| Gemini 2.0 Flash | Cloud | `GeminiProvider` |
| CocoroCLM | OpenAI-compat | `CocoroCLMProvider` |

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

Download both from: **[GitHub Releases → v1.5.0](https://github.com/waza-ide/waza/releases/tag/v1.5.0)**

### Requirements

- VSCode 1.87.0+ (extension)
- Node.js 20+ (development)
- (Optional) Local LLM: any OpenAI-compatible inference server

---

## Quick Start

1. Install extension or desktop app
2. Open Command Palette → `Waza: Open Agent Panel`  
   (or press `Ctrl+Shift+W` / `Cmd+Shift+W`)
3. Type your task in natural language
4. Waza plans and executes autonomously — review diffs before changes are applied

---

## Configuration

### Local model (`.vscode/settings.json`)

```json
{
  "waza.preferLocalModel": true,
  "waza.localModelUrl": "http://your-server:8000/v1",
  "waza.localModel": "qwen25-72b",
  "waza.localApiKey": ""
}
```

> **Note**: `.vscode/settings.json` is gitignored. Copy from `.vscode/settings.json.example`.  
> Set `WAZA_LOCAL_API_KEY` env var for the API key (takes priority over the settings file).

### All settings

| Setting | Default | Description |
|---|---|---|
| `waza.preferLocalModel` | `false` | Route to local model first |
| `waza.localModelUrl` | `""` | Base URL (OpenAI-compatible, e.g. `http://localhost:8000/v1`) |
| `waza.localModel` | `"qwen25-72b"` | Model name |
| `waza.localApiKey` | `""` | Bearer token (`WAZA_LOCAL_API_KEY` env var takes priority) |
| `waza.anthropicApiKey` | `""` | Claude API key |
| `waza.geminiApiKey` | `""` | Gemini API key |

---

## Architecture

pnpm monorepo — five packages:

| Package | Version | Role |
|---|---|---|
| `packages/desktop` | 1.5.0 | Electron desktop app (Vite + React + Monaco + Zustand) |
| `packages/extension` | 1.5.0 | VSCode extension (commands, Webview, agent loop) |
| `packages/core` | 0.0.1 | Business logic: ModelRouter, providers, Task model, Gateway, Skills, Automation |
| `packages/ui` | — | Shared React UI components |
| `packages/cocoro-bridge` | — | External API bridge |

Dependency direction: `core` → `extension` / `desktop` (one-way only).

### `@waza/core` public API (key exports)

```typescript
// Providers
LocalProvider, CocoroCLMProvider, ClaudeProvider, GeminiProvider, OllamaProvider
ModelRouter                    // routeWithPreference(preferLocal, localConfig?, apiKey?)

// Agent / Task model
Task, Step, TaskAction         // Codex Mode task data model
Logger, createCaptureSink      // Structured logging

// Review Gateway
ReviewGateway, requiresReview  // Safe-writing gate with diff generation
generateDiff, parseDiffLines   // Unified diff utilities

// Skills
BUILTIN_SKILLS, injectSkills   // System prompt injection
buildSkillPrompt               // Per-skill prompt builder

// Automation
Automation, CronTrigger, FileWatchTrigger, GitHookTrigger

// Telemetry
HealthCheckable, isHealthCheckable, ProviderTelemetry
```

---

## Tests

```
@waza/core          213 / 213
@waza/desktop       132 / 132
@waza/extension      15 /  15
@waza/cocoro-bridge  10 /  10
@waza/ui              5 /   5
─────────────────────────────
Total               375 / 375  ✅
```

```bash
export PATH="$HOME/.local/share/pnpm:$PATH"
pnpm build   # core must be built first
pnpm test
pnpm lint    # 0 errors
```

---

## Development

```bash
git clone https://github.com/waza-ide/waza
cd waza
pnpm install
pnpm build

# Desktop dev server
cd packages/desktop
pnpm dev:renderer          # Terminal 1 — Vite
NODE_ENV=development pnpm -F @waza/desktop electron  # Terminal 2 — Electron
```

---

## Contributing

Please read [AGENTS.md](AGENTS.md) before submitting PRs.  
All PRs are automatically reviewed by CodeRabbit.

---

## License

[Apache License 2.0](LICENSE) — © 2026 Waza Contributors

---

# Waza — AI IDE（日本語）

> **プライバシーファースト設計。コードはあなたのマシンから出ない。**

---

## Wazaとは

WazaはVSCode向けのプライバシーファーストAI IDE。  
ローカルモデル（cocoro-OS、Ollama）が利用可能な場合は自動的にローカルへルーティングし、  
利用できない場合のみクラウドモデル（Claude、Gemini）にフォールバック。  
エージェントが自律的にタスクを計画・実行し、破壊的な変更の前にレビューを求めます。

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

ダウンロード: **[GitHub Releases → v1.5.0](https://github.com/waza-ide/waza/releases/tag/v1.5.0)**

---

## 機能概要（v1.5.0）

| カテゴリ | 機能 |
|---|---|
| **UI** | Codex風レイアウト / ライト・ダークテーマ / モデルピッカー / WelcomeScreen / StatusBar |
| **エージェント** | 自律ループ / Pause・Resume・Cancel・Retry / Review Gateway / Skill injection |
| **プロバイダー** | LocalProvider (OpenAI互換) / Ollama / Claude / Gemini / CocoroCLM |
| **ルーティング** | ローカル優先 → 障害時クラウド自動フォールバック |
| **セキュリティ** | APIキーはenv変数で管理 / `.vscode/settings.json` はgitignore |

---

## ローカルモデル設定

```json
// .vscode/settings.json （gitignore済み — .example を参照）
{
  "waza.preferLocalModel": true,
  "waza.localModelUrl": "http://your-server:8000/v1",
  "waza.localModel": "qwen25-72b",
  "waza.localApiKey": ""
}
```

APIキーは `WAZA_LOCAL_API_KEY` 環境変数で設定（設定ファイルより優先）。

---

## ライセンス

[Apache License 2.0](LICENSE) — © 2026 Waza Contributors
