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
