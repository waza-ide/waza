/**
 * DesktopAgentLoop — runs the agentic loop for the desktop app.
 *
 * Key fix: run(userInput, modelId) now properly routes to the selected
 * provider instead of always falling back to auto/claude.
 */
import { CocoroCLMProvider, OllamaProvider, ModelRouter } from '@waza/core';
import type { AgentState } from './types.js';

export type { AgentState };
export type StateChangeHandler = (state: AgentState) => void;

// Composer model IDs — must match Composer.tsx AVAILABLE_MODELS
export type ModelId =
  | 'auto'
  | 'cocoro'
  | 'ollama/llama3.2'
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-6'
  | 'gemini-2.0-flash';

// ── Settings snapshot passed in at call time ──────────────────────────
export interface LoopSettings {
  cocoroBaseUrl: string;
  cocoroApiKey: string;
  cocoroModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  maxSteps: number;
}

const DEFAULT_SETTINGS: LoopSettings = {
  cocoroBaseUrl:   'http://192.168.50.112:8000/v1',
  cocoroApiKey:    'mdl-llm-2026',
  cocoroModel:     'gpt-4o',
  ollamaBaseUrl:   'http://localhost:11434',
  ollamaModel:     'llama3.2',
  anthropicApiKey: '',
  geminiApiKey:    '',
  maxSteps:        10,
};

// ── System prompt ─────────────────────────────────────────────────────
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

// ── Main class ────────────────────────────────────────────────────────
export class DesktopAgentLoop {
  private running = false;
  private abortController: AbortController | undefined;
  private stateHandlers: StateChangeHandler[] = [];
  private currentWorkDir: string;

  constructor(
    private router: ModelRouter,
    workDir: string
  ) {
    this.currentWorkDir = workDir;
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

  /**
   * Run the agent loop.
   * @param userInput - the user's message
   * @param modelId   - which model to use (from Composer selection)
   * @param settings  - current app settings (API keys, URLs etc)
   */
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

    try {
      // ── Resolve provider based on selected model ──────────────────
      const provider = await this.resolveProvider(modelId, settings);

      const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: userInput },
      ];

      for (let step = 0; step < maxSteps; step++) {
        if (signal.aborted) { this.emit({ status: 'stopped' }); return; }

        this.emit({
          status: 'thinking',
          step,
          message: `Step ${step + 1} / ${maxSteps} — thinking…`,
        });

        const response = await provider.complete({
          messages,
          model: provider.model,
          maxTokens: 4096,
        });

        if (signal.aborted) { this.emit({ status: 'stopped' }); return; }

        const parsed = parseModelResponse(response.content);

        if (parsed.type === 'done') {
          this.emit({ status: 'done', result: parsed.result });
          return;
        }
        if (parsed.type === 'text') {
          this.emit({ status: 'done', result: parsed.content });
          return;
        }

        // Tool call
        this.emit({
          status: 'acting',
          step,
          action: `${parsed.tool}(${JSON.stringify(parsed.args)})`,
        });

        let toolOutput: string;
        try {
          toolOutput = await this.dispatchTool(parsed.tool, parsed.args, signal);
        } catch (toolError) {
          toolOutput = `Tool error: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
        }

        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: `[Tool result]\n${toolOutput}` });
      }

      this.emit({
        status: 'done',
        result: `Reached maximum steps (${maxSteps}).`,
      });
    } catch (error) {
      if (signal.aborted) { this.emit({ status: 'stopped' }); return; }
      this.emit({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
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

  // ── Private ─────────────────────────────────────────────────────────

  /**
   * Map a Composer ModelId → concrete provider instance.
   * Uses the settings values (URLs, API keys) from SettingsContext.
   */
  private async resolveProvider(modelId: ModelId, settings: LoopSettings) {
    switch (modelId) {
      case 'cocoro':
        return new CocoroCLMProvider({
          kind: 'cocoro',
          model: settings.cocoroModel,
          baseUrl: settings.cocoroBaseUrl,
          apiKey: settings.cocoroApiKey,
        });

      case 'ollama/llama3.2':
        return new OllamaProvider({
          kind: 'ollama',
          model: settings.ollamaModel,
          baseUrl: settings.ollamaBaseUrl,
        });

      case 'claude-sonnet-4-6':
      case 'claude-opus-4-6': {
        if (!settings.anthropicApiKey) {
          throw new Error(
            'Claude requires an API key. Go to Settings → Models & APIs → Claude and enter your Anthropic API key.'
          );
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
          throw new Error(
            'Gemini requires an API key. Go to Settings → Models & APIs → Gemini and enter your Google API key.'
          );
        }
        const { GeminiProvider } = await import('@waza/core');
        return new GeminiProvider({
          kind: 'gemini',
          model: 'gemini-2.0-flash',
          apiKey: settings.geminiApiKey,
        });
      }

      case 'auto':
      default:
        // Auto: cocoro-llm-server first, then ollama, then error (no silent Claude fallback)
        return this.resolveAuto(settings);
    }
  }

  /**
   * Auto-routing: prefers local/private models.
   * Falls back gracefully without exposing Claude to unauthenticated users.
   */
  private async resolveAuto(settings: LoopSettings) {
    // 1. Try cocoro-llm-server
    const cocoroHealthUrl = settings.cocoroBaseUrl.replace('/v1', '/health');
    const cocoroOk = await this.checkUrl(cocoroHealthUrl);
    if (cocoroOk) {
      return new CocoroCLMProvider({
        kind: 'cocoro',
        model: settings.cocoroModel,
        baseUrl: settings.cocoroBaseUrl,
        apiKey: settings.cocoroApiKey,
      });
    }

    // 2. Try local Ollama
    const ollamaOk = await this.checkUrl(`${settings.ollamaBaseUrl}/api/tags`);
    if (ollamaOk) {
      return new OllamaProvider({
        kind: 'ollama',
        model: settings.ollamaModel,
        baseUrl: settings.ollamaBaseUrl,
      });
    }

    // 3. Cloud Claude (only if API key is set)
    if (settings.anthropicApiKey) {
      const { ClaudeProvider } = await import('@waza/core');
      return new ClaudeProvider({
        kind: 'claude',
        model: 'claude-sonnet-4-5',
        apiKey: settings.anthropicApiKey,
      });
    }

    // 4. Nothing available — clear error message
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

  private buildSystemPrompt(): string {
    return `${SYSTEM_PROMPT}\n\nWorking directory: ${this.currentWorkDir}`;
  }

  private async dispatchTool(
    tool: string,
    args: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<string> {
    if (signal.aborted) return '';

    switch (tool) {
      case 'read_file': {
        const p = String(args['path'] ?? '');
        return window.wazaAPI.fs.readFile(p);
      }
      case 'write_file': {
        const p = String(args['path'] ?? '');
        const content = String(args['content'] ?? '');
        await window.wazaAPI.fs.writeFile(p, content);
        return 'File written.';
      }
      case 'exec_command': {
        const command = String(args['command'] ?? '');
        const result = await window.wazaAPI.agent.exec(command, this.currentWorkDir);
        return result.success ? result.output : `Command error: ${result.output}`;
      }
      default:
        return `Unknown tool: ${tool}`;
    }
  }
}
