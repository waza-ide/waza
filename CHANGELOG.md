# Changelog

All notable changes to Waza will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] - 2026-04-19

### Added
- Desktop: auto-updater via `electron-updater` + GitHub Releases publish
- Desktop: `UpdaterBadge` component — available/downloading/downloaded 3状態 UI
- Desktop: multi-file tab management with dirty state indicator (`●`)
- Desktop: `TabBar` component — horizontal scroll, active highlight, close button
- Desktop: `MultiFileDiffView` — accordion diff with per-file and all Accept/Reject
- Desktop: `useEditorTabs` hook — open/close/save/isDirty/applyMultiFileEdit
- Desktop: agent-driven multi-file edits via `DesktopAgentLoop.applyMultiFileEdit`
- Desktop: title bar with `UpdaterBadge` and workspace name display
- Desktop: `types/editor.ts` — `EditorTab` / `MultiFileEdit` type definitions

### Changed
- Desktop: `Editor` now receives `onChange` callback for real-time content sync
- Desktop: `App.tsx` restructured with title bar + 3-pane + multi-file diff layout
- Desktop: `detectLanguage` extracted to shared hook (`useEditorTabs.ts`)
- Desktop: `electron-builder.yml` — added GitHub publish configuration

### Architecture
- `useEditorTabs` + `tabsRef` pattern for stable async state access
- `MultiFileDiffView` uses `diffLines` from `diff` library (consistent with `@waza/ui`)

## [0.2.0] - 2026-04-19

### Added
- Desktop app: recursive file tree with lazy loading and expand/collapse
- Desktop app: IGNORE filter (.git / node_modules / dist / out / .next / __pycache__)
- Desktop app: directory-first alphabetical sorting in FileTree
- Desktop app: file extension color coding (.ts=blue / .tsx=teal / .py=yellow / .rs=orange etc.)
- Desktop app: selected file highlight in FileTree
- Desktop app: `DesktopAgentLoop` — plan→tool→eval cycle without VSCode dependency
- Desktop app: `exec_command` tool via IPC (agent:exec in main process)
- Desktop app: stop button to abort running agent
- Desktop app: agent state transitions in WazaSidebar (thinking / acting / done / error / stopped)
- Desktop app: vitest unit tests for FileTree logic and AgentLoop parseModelResponse

### Fixed
- electron-builder executable name on Linux (`executableName: waza` instead of `@wazadesktop`)

### Architecture
- AgentLoop ported from VSCode extension to Electron renderer (no vscode.* API dependency)
- IPC bridge extended: `agent.exec(command, cwd)` for shell command execution

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
