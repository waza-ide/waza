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

// Codex Mode — Review Gateway (Phase 2)
export {
  requiresReview,
  batchRequiresReview,
  reviewReason,
  DANGEROUS_SHELL_TOKENS,
  DANGEROUS_GIT_SUBCOMMANDS,
} from "./gateway/triggers.js";
export type {
  GatewayStatus,
  ReviewRequest,
  GatewayDecision,
  ReviewHandler,
} from "./gateway/gateway.js";
export { ReviewGateway, assertValidTransition } from "./gateway/gateway.js";
export type { DiffResult, DiffLine, DiffLineType } from "./gateway/diff.js";
export { generateDiff, parseDiffLines } from "./gateway/diff.js";

export { BaseProvider } from "./providers/base.js";
export { ClaudeProvider } from "./providers/claude.js";
export { GeminiProvider } from "./providers/gemini.js";
export { OllamaProvider } from "./providers/ollama.js";
export { CocoroCLMProvider } from "./providers/cocoro_clm.js";
export { ModelRouter } from "./router/index.js";

// Codex Mode — Skill system (Phase 4)
export type { Skill } from "./skill/types.js";
export { buildSkillPrompt, injectSkills, BUILTIN_SKILLS } from "./skill/types.js";

// Codex Mode — Automation system (Phase 4)
export type {
  Automation,
  AutomationStatus,
  AutomationTaskTemplate,
  AutomationTrigger,
  CronTrigger,
  FileWatchTrigger,
  GitHookTrigger,
} from "./automation/types.js";
export { renderAutomationPrompt } from "./automation/types.js";

// Codex Mode — Model Telemetry (Phase 4)
export type { HealthCheckResult, HealthCheckable, ProviderTelemetry } from "./providers/health.js";
export { isHealthCheckable } from "./providers/health.js";
