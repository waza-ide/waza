# Changelog

All notable changes to Waza will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-04-17

### Added
- Initial release of Waza AI IDE Extension
- Agent loop with plan → tool → eval cycle
- Model router: auto-routing between local and cloud models
- Local model support: cocoro-OS, Ollama
- Cloud model support: Claude API
- Codex-style diff UI with Accept/Reject
- WebviewPanel with React UI (AgentLog, DiffView, ModelPicker)
- VSCode command palette integration
- CodeRabbit automated code review
- genshijin token optimization skill

### Architecture
- pnpm monorepo (extension / core / ui / cocoro-bridge)
- Claude Code optimized: AGENTS.md / STRUCTURE.md / HANDOFF.md
- TypeScript strict mode throughout
