/**
 * DesktopAgentLoop — Codex Mode Phase 2 refactor
 *
 * Changes from Phase 1:
 * - ReviewGateway injected via constructor (testable, no React dep in this file)
 * - write_file / delete_file / dangerous shell pass through Gateway before dispatch
 * - Rejection triggers Auto-Fix Loop: re-prompts LLM with rejection context
 * - generateDiff called before Gateway for write_file actions
 */
import { CocoroCLMProvider, OllamaProvider, ModelRouter, Logger, createCaptureSink, ReviewGateway, generateDiff, injectSkills, BUILTIN_SKILLS } from '@waza/core';
import type { Task, Step, LogEntry, TaskAction, ReviewHandler } from '@waza/core';
import { useTaskStore } from '../stores/taskStore.js';
import type { AgentState } from './types.js';

export type { AgentState };
export type StateChangeHandler = (state: AgentState) => void;

// Composer model IDs
export type ModelId =
  | 'auto'
  | 'cocoro'
  | 'ollama/llama3.2'
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-6'
  | 'gemini-2.0-flash';

export interface LoopSettings {
  cocoroBaseUrl:   string;
  cocoroApiKey:    string;
  cocoroModel:     string;
  ollamaBaseUrl:   string;
  ollamaModel:     string;
  anthropicApiKey: string;
  geminiApiKey:    string;
  maxSteps:        number;
  /** Enabled Skill IDs to inject into the system prompt */
  activeSkillIds?: string[];
}

const DEFAULT_SETTINGS: LoopSettings = {
  cocoroBaseUrl:   'http://192.168.50.112:8000/v1',
  cocoroApiKey:    'mdl-llm-2026',
  cocoroModel:     'qwen25-72b',
  ollamaBaseUrl:   'http://localhost:11434',
  ollamaModel:     'llama3.2',
  anthropicApiKey: '',
  geminiApiKey:    '',
  maxSteps:        10,
  activeSkillIds:  [],
};

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Waza, an AI coding assistant.
Analyze the user's request and use the available tools to complete the task.

Available tools:
- read_file:    Read a file      args: {"path": "filepath"}
- write_file:   Write a file     args: {"path": "filepath", "content": "text"}
- exec_command: Run a command    args: {"command": "shell command"}

When using a tool, output ONLY this format (no other text):
TOOL: <tool_name> <JSON args>

Example:
TOOL: read_file {"path": "src/index.ts"}

When the task is complete, output:
DONE: <result description>

If answering directly without tools, also end with DONE: <answer>.`;

// ── Parse LLM response ────────────────────────────────────────────────────
type ParsedResponse =
  | { type: 'done'; result: string }
  | { type: 'tool'; tool: string; args: Record<string, unknown> }
  | { type: 'text'; content: string };

export function parseModelResponse(content: string): ParsedResponse {
  const lines = content.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DONE:')) {
      return { type: 'done', result: trimmed.slice(5).trim() };
    }
    if (trimmed.startsWith('TOOL:')) {
      const rest = trimmed.slice(5).trim();
      const spaceIdx = rest.indexOf(' ');
      if (spaceIdx === -1) continue;
      const tool = rest.slice(0, spaceIdx).trim();
      const jsonStr = rest.slice(spaceIdx + 1).trim();
      try {
        const args = JSON.parse(jsonStr) as Record<string, unknown>;
        return { type: 'tool', tool, args };
      } catch {
        continue;
      }
    }
  }
  return { type: 'text', content };
}

// ─────────────────────────────────────────────────────────────────────────

export class DesktopAgentLoop {
  private running = false;
  private abortController: AbortController | undefined;
  private stateHandlers: StateChangeHandler[] = [];
  private currentWorkDir: string;
  private gateway: ReviewGateway;

  constructor(
    private router: ModelRouter,
    workDir: string,
    reviewHandler?: ReviewHandler
  ) {
    this.currentWorkDir = workDir;
    // Default handler: auto-approve (safe default; production sets a real UI handler)
    const defaultHandler: ReviewHandler = () =>
      Promise.resolve({ approved: true });
    this.gateway = new ReviewGateway(reviewHandler ?? defaultHandler);
  }

  /** Swap the review handler at runtime (called by App.tsx once ReviewModal is mounted) */
  setReviewHandler(handler: ReviewHandler): void {
    this.gateway = new ReviewGateway(handler);
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.push(handler);
    return () => {
      this.stateHandlers = this.stateHandlers.filter(h => h !== handler);
    };
  }

  private emit(state: AgentState): void {
    this.stateHandlers.forEach(h => h(state));
  }

  async run(
    userInput: string,
    modelId: ModelId = 'auto',
    settings: LoopSettings = DEFAULT_SETTINGS
  ): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const maxSteps = settings.maxSteps ?? 10;
    const store = useTaskStore.getState();

    // ── Create Task in store (Phase 1) ─────────────────────────────────
    const taskId = crypto.randomUUID();
    const task: Task = {
      id:        taskId,
      type:      'thread',
      title:     userInput.length > 60 ? userInput.slice(0, 60) + '…' : userInput,
      status:    'running',
      skills:    [],
      steps:     [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.createTask(task);
    store.setActive(taskId);

    // Pluggable logger — capture sink feeds into taskStore
    const { sink: captureSink, entries: capturedLogs } = createCaptureSink();
    const logger = new Logger([captureSink]);

    try {
      const provider = await this.resolveProvider(modelId, settings);

      logger.info('system', `Task started (model: ${modelId})`, { taskId, userInput });

      const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
        { role: 'system', content: this.buildSystemPrompt(settings.activeSkillIds ?? []) },
        { role: 'user', content: userInput },
      ];

      for (let stepNum = 0; stepNum < maxSteps; stepNum++) {
        if (signal.aborted) { this.emit({ status: 'stopped' }); break; }

        // ── Create Step ──────────────────────────────────────────────
        const stepId = crypto.randomUUID();
        const step: Step = {
          id:        stepId,
          taskId,
          status:    'running',
          actions:   [],
          logs:      [],
          startedAt: Date.now(),
        };
        store.appendStep(taskId, step);

        this.emit({
          status: 'thinking',
          step: stepNum,
          message: `Step ${stepNum + 1} / ${maxSteps} — thinking…`,
        });

        const llmLog = logger.info('llm', `LLM request (step ${stepNum + 1})`, { model: provider.model });
        store.appendLog(taskId, stepId, llmLog);

        const response = await provider.complete({
          messages,
          model: provider.model,
          maxTokens: 4096,
        });

        if (signal.aborted) { this.emit({ status: 'stopped' }); break; }

        const responseLog = logger.info('llm', 'LLM response received', {
          preview: response.content.slice(0, 100),
        });
        store.appendLog(taskId, stepId, responseLog);

        const parsed = parseModelResponse(response.content);

        if (parsed.type === 'done') {
          store.updateStepStatus(taskId, stepId, 'done');
          store.updateTaskStatus(taskId, 'done');
          this.emit({ status: 'done', result: parsed.result });
          return;
        }
        if (parsed.type === 'text') {
          store.updateStepStatus(taskId, stepId, 'done');
          store.updateTaskStatus(taskId, 'done');
          this.emit({ status: 'done', result: parsed.content });
          return;
        }

        // ── Tool call ────────────────────────────────────────────────
        this.emit({
          status: 'acting',
          step: stepNum,
          action: `${parsed.tool}(${JSON.stringify(parsed.args)})`,
        });

        // Map tool name to TaskAction and persist to store
        const action = this.parseToolAsTaskAction(parsed.tool, parsed.args);
        if (action) {
          store.appendAction(taskId, stepId, action);
          store.appendLog(taskId, stepId, logger.debug('fs', `Tool: ${action.type}`));
        }

        // ── Review Gateway (Phase 2) ──────────────────────────────────
        if (action) {
          // Pre-generate diff for write_file so ReviewModal can show it
          let diff = '';
          if (action.type === 'write_file') {
            try {
              const readFn = (p: string) => window.wazaAPI.fs.readFile(p);
              const diffResult = await generateDiff(action.path, action.content, readFn);
              diff = diffResult.patch;
            } catch {
              diff = ''; // diff generation failure is non-fatal
            }
          }

          store.updateStepStatus(taskId, stepId, 'proposing');
          this.gateway.reset();
          const decision = await this.gateway.check(action, diff);

          if (!decision.approved) {
            // ── Auto-Fix Loop: re-inject rejection context into conversation ──
            const rejectReason = decision.rejectionReason ?? 'User rejected the action.';
            store.updateStepStatus(taskId, stepId, 'aborted');
            const abortLog = logger.warn('system', `Action rejected: ${rejectReason}`);
            store.appendLog(taskId, stepId, abortLog);

            messages.push({ role: 'assistant', content: response.content });
            messages.push({
              role: 'user',
              content: `[Review rejected] The action "${action.type}" was rejected by the user.\nReason: ${rejectReason}\nPlease reconsider and propose an alternative approach that avoids this action.`,
            });
            continue; // next step = Auto-Fix attempt
          }

          store.updateStepStatus(taskId, stepId, 'running');
        }

        let toolOutput: string;
        try {
          toolOutput = await this.dispatchTool(parsed.tool, parsed.args, signal);
          const toolLog = logger.info(
            parsed.tool === 'exec_command' ? 'shell' : 'fs',
            `Tool result: ${toolOutput.slice(0, 80)}`,
          );
          store.appendLog(taskId, stepId, toolLog);
        } catch (toolError) {
          const msg = `Tool error: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
          const errLog = logger.error('fs', msg);
          store.appendLog(taskId, stepId, errLog);
          toolOutput = msg;
        }

        store.updateStepStatus(taskId, stepId, 'done');
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: `[Tool result]\n${toolOutput}` });
      }

      store.updateTaskStatus(taskId, 'done');
      this.emit({
        status: 'done',
        result: `Reached maximum steps (${maxSteps}).`,
      });
    } catch (error) {
      store.updateTaskStatus(taskId, 'error');
      if (signal.aborted) { this.emit({ status: 'stopped' }); return; }
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('system', msg);
      this.emit({ status: 'error', message: msg });
    } finally {
      this.running = false;
      void capturedLogs; // suppress unused warning — entries already in store
    }
  }

  stop(): void {
    this.abortController?.abort();
    this.running = false;
    this.emit({ status: 'stopped' });
  }

  setWorkDir(dir: string): void {
    this.currentWorkDir = dir;
  }

  isRunning(): boolean {
    return this.running;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private parseToolAsTaskAction(
    tool: string,
    args: Record<string, unknown>
  ): TaskAction | null {
    switch (tool) {
      case 'read_file':
        return { type: 'read_file', path: String(args['path'] ?? '') };
      case 'write_file':
        return { type: 'write_file', path: String(args['path'] ?? ''), content: String(args['content'] ?? '') };
      case 'exec_command':
        return { type: 'run_shell', command: String(args['command'] ?? '') };
      default:
        return null;
    }
  }

  private async resolveProvider(modelId: ModelId, settings: LoopSettings) {
    switch (modelId) {
      case 'cocoro':
        return new CocoroCLMProvider({
          kind: 'cocoro', model: settings.cocoroModel,
          baseUrl: settings.cocoroBaseUrl, apiKey: settings.cocoroApiKey,
        });
      case 'ollama/llama3.2':
        return new OllamaProvider({
          kind: 'ollama', model: settings.ollamaModel, baseUrl: settings.ollamaBaseUrl,
        });
      case 'claude-sonnet-4-6':
      case 'claude-opus-4-6': {
        if (!settings.anthropicApiKey) {
          throw new Error('Claude requires an API key. Go to Settings → Models & APIs → Claude.');
        }
        const { ClaudeProvider } = await import('@waza/core');
        return new ClaudeProvider({
          kind: 'claude',
          model: modelId === 'claude-opus-4-6' ? 'claude-opus-4-5' : 'claude-sonnet-4-5',
          apiKey: settings.anthropicApiKey,
        });
      }
      case 'gemini-2.0-flash': {
        if (!settings.geminiApiKey) {
          throw new Error('Gemini requires an API key. Go to Settings → Models & APIs → Gemini.');
        }
        const { GeminiProvider } = await import('@waza/core');
        return new GeminiProvider({
          kind: 'gemini', model: 'gemini-2.0-flash', apiKey: settings.geminiApiKey,
        });
      }
      default:
        return this.resolveAuto(settings);
    }
  }

  private async resolveAuto(settings: LoopSettings) {
    // Use /v1/models (OpenAI-compatible) instead of /health for compatibility with LocalProvider
    const modelsUrl = `${settings.cocoroBaseUrl}/models`;
    if (await this.checkUrl(modelsUrl)) {
      return new CocoroCLMProvider({
        kind: 'cocoro', model: settings.cocoroModel,
        baseUrl: settings.cocoroBaseUrl, apiKey: settings.cocoroApiKey,
      });
    }
    if (await this.checkUrl(`${settings.ollamaBaseUrl}/api/tags`)) {
      return new OllamaProvider({
        kind: 'ollama', model: settings.ollamaModel, baseUrl: settings.ollamaBaseUrl,
      });
    }
    if (settings.anthropicApiKey) {
      const { ClaudeProvider } = await import('@waza/core');
      return new ClaudeProvider({
        kind: 'claude', model: 'claude-sonnet-4-5', apiKey: settings.anthropicApiKey,
      });
    }
    throw new Error(
      'No LLM available. Check:\n' +
      `• cocoro-llm-server: ${settings.cocoroBaseUrl}\n` +
      `• Ollama: ${settings.ollamaBaseUrl}\n` +
      '• Or add an API key in Settings → Models & APIs'
    );
  }

  private async checkUrl(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private buildSystemPrompt(activeSkillIds: string[] = []): string {
    const base = `${SYSTEM_PROMPT}\n\nWorking directory: ${this.currentWorkDir}`;
    if (activeSkillIds.length === 0) return base;
    // Inject enabled skills as additional system prompt fragments
    return injectSkills(base, activeSkillIds, BUILTIN_SKILLS);
  }

  private async dispatchTool(
    tool: string,
    args: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<string> {
    if (signal.aborted) return '';
    switch (tool) {
      case 'read_file':
        return window.wazaAPI.fs.readFile(String(args['path'] ?? ''));
      case 'write_file':
        await window.wazaAPI.fs.writeFile(String(args['path'] ?? ''), String(args['content'] ?? ''));
        return 'File written.';
      case 'exec_command': {
        const result = await window.wazaAPI.agent.exec(String(args['command'] ?? ''), this.currentWorkDir);
        return result.success ? result.output : `Command error: ${result.output}`;
      }
      default:
        return `Unknown tool: ${tool}`;
    }
  }
}
