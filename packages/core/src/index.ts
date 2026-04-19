// barrel export — packages/core public API
export type {
  AgentAction,
  AgentState,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  Message,
  MessageRole,
  ProviderConfig,
  ProviderKind,
  RouterConfig,
} from "./models/types.js";

export type { ModelConfig } from "./models/config.js";

// Codex Mode — Task data model (Phase 1)
export type {
  Task,
  TaskType,
  TaskStatus,
  Step,
  StepStatus,
  TaskAction,
  AgentPlan,
  LogEntry,
  LogLevel,
  LogSource,
} from "./task/types.js";
export {
  isTask,
  isStep,
  isReadFileAction,
  isWriteFileAction,
  isRunShellAction,
} from "./task/types.js";

// Codex Mode — Structured Logger (Phase 1)
export type { LogSink } from "./logging/logger.js";
export { Logger, consoleSink, createCaptureSink } from "./logging/logger.js";

export { BaseProvider } from "./providers/base.js";
export { ClaudeProvider } from "./providers/claude.js";
export { GeminiProvider } from "./providers/gemini.js";
export { OllamaProvider } from "./providers/ollama.js";
export { CocoroCLMProvider } from "./providers/cocoro_clm.js";
export { ModelRouter } from "./router/index.js";
