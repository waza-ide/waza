/**
 * Codex Mode — Task/Step data model (Phase 1)
 *
 * NOTE: AgentAction already exists in models/types.ts with a different shape.
 * The new discriminated union for task actions is exported as TaskAction
 * to avoid barrel conflicts (Option B per implementation plan).
 */

// ─── Task ──────────────────────────────────────────────────────────────────

export type TaskType   = 'thread' | 'automation' | 'skill';
export type TaskStatus = 'pending' | 'running' | 'paused' | 'done' | 'error' | 'cancelled';

export interface Task {
  id:        string;
  type:      TaskType;
  title:     string;
  /** Original user input text (displayed in AgentPanelV2) */
  userInput: string;
  status:    TaskStatus;
  /** Skill IDs to inject into the system prompt */
  skills:    string[];
  steps:     Step[];
  createdAt: number;
  updatedAt: number;
}

// ─── Step ──────────────────────────────────────────────────────────────────

export type StepStatus =
  | 'pending'
  | 'running'
  | 'proposing'
  | 'awaiting_review'
  | 'done'
  | 'error'
  | 'aborted';

export interface Step {
  id:          string;
  taskId:      string;
  status:      StepStatus;
  actions:     TaskAction[];
  logs:        LogEntry[];
  startedAt?:  number;
  finishedAt?: number;
}

// ─── TaskAction (discriminated union) ──────────────────────────────────────
// Named TaskAction (not AgentAction) to avoid conflict with models/types.ts

export type TaskAction =
  | { type: 'read_file';   path: string }
  | { type: 'write_file';  path: string; content: string }
  | { type: 'delete_file'; path: string }
  | { type: 'run_shell';   command: string }
  | { type: 'git_cmd';     args: string[] };

// ─── AgentPlan ─────────────────────────────────────────────────────────────

export interface AgentPlan {
  thoughts: string;
  actions:  TaskAction[];
}

// ─── Structured Log ────────────────────────────────────────────────────────

export type LogLevel  = 'info' | 'warn' | 'error' | 'debug';
export type LogSource = 'system' | 'llm' | 'fs' | 'shell' | 'git';

export interface LogEntry {
  id:        string;
  timestamp: number;
  level:     LogLevel;
  source:    LogSource;
  message:   string;
  metadata?: Record<string, unknown>;
}

// ─── Type guards ───────────────────────────────────────────────────────────

export function isTask(val: unknown): val is Task {
  return (
    typeof val === 'object' && val !== null &&
    typeof (val as Task).id === 'string' &&
    typeof (val as Task).type === 'string' &&
    Array.isArray((val as Task).steps)
  );
}

export function isStep(val: unknown): val is Step {
  return (
    typeof val === 'object' && val !== null &&
    typeof (val as Step).id === 'string' &&
    typeof (val as Step).taskId === 'string' &&
    Array.isArray((val as Step).actions)
  );
}

export function isReadFileAction(a: TaskAction): a is { type: 'read_file'; path: string } {
  return a.type === 'read_file';
}

export function isWriteFileAction(a: TaskAction): a is { type: 'write_file'; path: string; content: string } {
  return a.type === 'write_file';
}

export function isRunShellAction(a: TaskAction): a is { type: 'run_shell'; command: string } {
  return a.type === 'run_shell';
}
