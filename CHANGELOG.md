# Changelog

All notable changes to Waza will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [0.5.0] - 2026-04-19

### Changed (Desktop)
- **Complete UI redesign matching Codex app**
  - Light/dark theme with OS auto-detection (`prefers-color-scheme`) + manual toggle
  - `TitleBar`: thread name + theme toggle button (○/●)
  - `Sidebar` (260px): New thread / Automations / Skills nav + Thread groups + FileTree fallback
  - `WelcomeScreen`: "Let's build" + folder selector (replaces empty state)
  - `Composer`: Inline model picker dropdown (auto/cocoro/Llama/Claude/Gemini)
  - `StatusBar`: Local | Worktree | Cloud + branch display
  - **Removed ActivityBar** (48px icon column)
- **Design token system split**: `lightTokens` / `darkTokens` / `staticTokens`
- **ThemeContext** (`useTheme()` hook): OS-aware init, `body[data-theme]` attribute

### Added (Desktop)
- `context/ThemeContext.tsx` — ThemeProvider + useTheme hook
- `components/WelcomeScreen.tsx` — "Let's build" landing
- `components/layout/StatusBar.tsx` — Codex-style status bar
- All components migrated to `useTheme()`: FileTree, TabBar, Editor, AgentPanel,
  MultiFileDiffView, UpdaterBadge, Composer, Sidebar, TitleBar
- Monaco Editor theme switches between `vs` (light) and `vs-dark` (dark)
- `layout.test.ts` expanded: 31 tests (lightTokens/darkTokens/staticTokens/Theme logic/
  AVAILABLE_MODELS/WelcomeScreen/StatusBar/detectLanguage)

### Fixed
- global.css: `body[data-theme="dark"]` scoped scrollbar/selection/focus-ring styles

## [0.4.0] - 2026-04-19

### Changed (Desktop)
- **UI Complete Redesign**: Codex-inspired layout
  - ActivityBar (48px) + Sidebar (240px) + MainArea (flex) structure
  - TitleBar (36px) with drag region + UpdaterBadge
  - Dark theme: `#0a0a0a` base, Inter font
- **Design Token System**: `styles/tokens.ts` — color/space/font/layout/radius/transition
- **Global CSS**: `styles/global.css` — custom scrollbar, selection, focus ring, animations

### Added (Desktop)
- `components/layout/TitleBar.tsx` — drag-region, project name, UpdaterBadge
- `components/layout/ActivityBar.tsx` — Files/Agent (enabled) + Search/Git/Settings (disabled)
- `components/layout/Sidebar.tsx` — tab-based content switcher (FileTree ↔ AgentHistory)
- `components/AgentHistory.tsx` — agent conversation history list
- `components/AgentPanel.tsx` — real-time agent log + animation dots + status badges
- `components/Composer.tsx` — Codex-style input with model selector + send/stop
- `src/__tests__/layout.test.ts` — 19 tests for token structure and UI logic

### Removed (Desktop)
- `WazaSidebar.tsx` usage from App.tsx (replaced by AgentPanel + Composer)

### Fixed
- `@import` moved to top of `global.css` (CSS spec compliance)

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
