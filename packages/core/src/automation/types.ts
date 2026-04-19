/**
 * Automation types — Codex Mode Phase 4
 *
 * Automations are scheduled or event-driven Tasks.
 * Triggers: cron | file-watch | git-hook
 *
 * When an Automation fires, it creates a Task from its template and
 * enqueues it with priority 0 (Background).
 */

// ─── Trigger variants ─────────────────────────────────────────────────────

export interface CronTrigger {
  type: 'cron';
  /** Standard cron expression (five-field syntax) */
  expression: string;
  /** IANA timezone, e.g. "Asia/Tokyo" */
  timezone?: string;
}

export interface FileWatchTrigger {
  type: 'file-watch';
  /** Glob patterns to watch */
  patterns: string[];
  /** debounce in ms before firing */
  debounceMs: number;
  /** Which file events should trigger the automation */
  events: ('change' | 'add' | 'unlink' | 'all')[];
}

export interface GitHookTrigger {
  type: 'git-hook';
  /** Git hook name */
  hook: 'post-commit' | 'pre-push' | 'post-merge';
}

export type AutomationTrigger =
  | CronTrigger
  | FileWatchTrigger
  | GitHookTrigger;

// ─── Automation entity ─────────────────────────────────────────────────────

export type AutomationStatus = 'active' | 'paused' | 'error';

export interface AutomationTaskTemplate {
  /** Prompt template. Use {{event}} / {{files}} as placeholders */
  prompt:  string;
  modelId: string;
  skills:  string[];
}

export interface Automation {
  id:        string;
  name:      string;
  enabled:   boolean;
  status:    AutomationStatus;
  trigger:   AutomationTrigger;
  task:      AutomationTaskTemplate;
  /** ISO string of last fire time */
  lastFiredAt?: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Prompt template renderer ─────────────────────────────────────────────

/**
 * Replace {{placeholders}} in an automation prompt template with event data.
 */
export function renderAutomationPrompt(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}
