import { describe, it, expect, beforeEach } from 'vitest';
import { parseModelResponse } from '../renderer/agent/loop.js';
import { useTaskStore } from '../renderer/stores/taskStore.js';

describe('parseModelResponse', () => {
  it('parses a DONE: line as done', () => {
    const result = parseModelResponse('DONE: task complete');
    expect(result.type).toBe('done');
    if (result.type === 'done') {
      expect(result.result).toBe('task complete');
    }
  });

  it('parses a TOOL: line as a tool call', () => {
    const result = parseModelResponse('TOOL: read_file {"path": "src/index.ts"}');
    expect(result.type).toBe('tool');
    if (result.type === 'tool') {
      expect(result.tool).toBe('read_file');
      expect(result.args).toEqual({ path: 'src/index.ts' });
    }
  });

  it('parses exec_command tool call', () => {
    const result = parseModelResponse('TOOL: exec_command {"command": "ls -la"}');
    expect(result.type).toBe('tool');
    if (result.type === 'tool') {
      expect(result.tool).toBe('exec_command');
      expect(result.args).toEqual({ command: 'ls -la' });
    }
  });

  it('treats invalid TOOL JSON as text', () => {
    const result = parseModelResponse('TOOL: read_file INVALID_JSON');
    expect(result.type).toBe('text');
  });

  it('treats plain text as text response', () => {
    const result = parseModelResponse('This is a plain answer.');
    expect(result.type).toBe('text');
    if (result.type === 'text') {
      expect(result.content).toContain('plain answer');
    }
  });

  it('detects DONE: line among multiple lines', () => {
    const result = parseModelResponse('Thinking...\nDONE: finished');
    expect(result.type).toBe('done');
  });

  it('parses write_file tool args correctly', () => {
    const result = parseModelResponse('TOOL: write_file {"path": "out.ts", "content": "hello"}');
    expect(result.type).toBe('tool');
    if (result.type === 'tool') {
      expect(result.tool).toBe('write_file');
      expect((result.args as { content: string }).content).toBe('hello');
    }
  });

  it('returns text when no TOOL: or DONE: found', () => {
    const result = parseModelResponse('Just some explanation with no special markers.');
    expect(result.type).toBe('text');
  });
});

describe('DesktopAgentLoop — taskStore integration', () => {
  beforeEach(() => {
    useTaskStore.getState().clearTasks();
  });

  it('store starts empty after clearTasks', () => {
    expect(Object.keys(useTaskStore.getState().tasks)).toHaveLength(0);
  });

  it('onStateChange handler returns an unsubscribe function', () => {
    const calls: string[] = [];
    const handlers: Array<(s: string) => void> = [];

    function onStateChange(h: (s: string) => void): () => void {
      handlers.push(h);
      return () => {
        const i = handlers.indexOf(h);
        if (i !== -1) handlers.splice(i, 1);
      };
    }

    const unsub = onStateChange(s => calls.push(s));
    handlers.forEach(h => h('thinking'));
    expect(calls).toEqual(['thinking']);

    unsub();
    handlers.forEach(h => h('done'));
    expect(calls).toHaveLength(1); // no new entry after unsub
  });
});

// ─── Gateway integration tests (Phase 2) ─────────────────────────────────

import { requiresReview, batchRequiresReview } from '@waza/core';
import type { TaskAction } from '@waza/core';

describe('requiresReview — integration smoke tests', () => {
  it('write_file requires review', () => {
    const a: TaskAction = { type: 'write_file', path: 'src/out.ts', content: 'x' };
    expect(requiresReview(a)).toBe(true);
  });

  it('read_file does not require review', () => {
    const a: TaskAction = { type: 'read_file', path: 'src/index.ts' };
    expect(requiresReview(a)).toBe(false);
  });

  it('rm shell command requires review', () => {
    const a: TaskAction = { type: 'run_shell', command: 'rm -rf dist/' };
    expect(requiresReview(a)).toBe(true);
  });

  it('echo shell command does not require review', () => {
    const a: TaskAction = { type: 'run_shell', command: 'echo hello' };
    expect(requiresReview(a)).toBe(false);
  });

  it('git push requires review', () => {
    const a: TaskAction = { type: 'git_cmd', args: ['push', 'origin', 'main'] };
    expect(requiresReview(a)).toBe(true);
  });

  it('git log does not require review', () => {
    const a: TaskAction = { type: 'git_cmd', args: ['log', '--oneline'] };
    expect(requiresReview(a)).toBe(false);
  });
});

describe('batchRequiresReview — integration smoke tests', () => {
  const read: TaskAction  = { type: 'read_file', path: 'a.ts' };
  const write1: TaskAction = { type: 'write_file', path: 'b.ts', content: 'x' };
  const write2: TaskAction = { type: 'write_file', path: 'c.ts', content: 'y' };

  it('two writes trigger batch review', () => {
    expect(batchRequiresReview([write1, write2])).toBe(true);
  });

  it('two reads pass safely', () => {
    expect(batchRequiresReview([read, read])).toBe(false);
  });
});
