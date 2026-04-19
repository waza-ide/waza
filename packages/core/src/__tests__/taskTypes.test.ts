import { describe, it, expect } from 'vitest';
import {
  isTask,
  isStep,
  isReadFileAction,
  isWriteFileAction,
  isRunShellAction,
} from '../../src/task/types.js';
import type { Task, Step, TaskAction } from '../../src/task/types.js';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id:        'task-1',
  type:      'thread',
  title:     'Test task',
  userInput: 'Test task input',
  status:    'pending',
  skills:    [],
  steps:     [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const makeStep = (overrides: Partial<Step> = {}): Step => ({
  id:      'step-1',
  taskId:  'task-1',
  status:  'pending',
  actions: [],
  logs:    [],
  ...overrides,
});

describe('isTask', () => {
  it('returns true for a valid Task', () => {
    expect(isTask(makeTask())).toBe(true);
  });

  it('returns false for null', () => {
    expect(isTask(null)).toBe(false);
  });

  it('returns false if id is missing', () => {
    const t = makeTask();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (t as any).id;
    expect(isTask(t)).toBe(false);
  });

  it('returns false if steps is not an array', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isTask({ ...makeTask(), steps: 'nope' as any })).toBe(false);
  });

  it('accepts all TaskType values', () => {
    for (const type of ['thread', 'automation', 'skill'] as const) {
      expect(isTask(makeTask({ type }))).toBe(true);
    }
  });
});

describe('isStep', () => {
  it('returns true for a valid Step', () => {
    expect(isStep(makeStep())).toBe(true);
  });

  it('returns false for plain object missing taskId', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = { id: 'x', status: 'pending', actions: [], logs: [] } as any;
    expect(isStep(s)).toBe(false);
  });
});

describe('TaskAction type guards', () => {
  const read: TaskAction   = { type: 'read_file',   path: 'a.ts' };
  const write: TaskAction  = { type: 'write_file',  path: 'b.ts', content: 'x' };
  const del: TaskAction    = { type: 'delete_file', path: 'c.ts' };
  const shell: TaskAction  = { type: 'run_shell',   command: 'ls' };
  const git: TaskAction    = { type: 'git_cmd',     args: ['commit'] };

  it('isReadFileAction correctly narrows', () => {
    expect(isReadFileAction(read)).toBe(true);
    expect(isReadFileAction(write)).toBe(false);
    expect(isReadFileAction(shell)).toBe(false);
  });

  it('isWriteFileAction correctly narrows', () => {
    expect(isWriteFileAction(write)).toBe(true);
    expect(isWriteFileAction(read)).toBe(false);
    expect(isWriteFileAction(del)).toBe(false);
  });

  it('isRunShellAction correctly narrows', () => {
    expect(isRunShellAction(shell)).toBe(true);
    expect(isRunShellAction(git)).toBe(false);
    expect(isRunShellAction(read)).toBe(false);
  });

  it('discriminated union covers all 5 action types', () => {
    const actions: TaskAction[] = [read, write, del, shell, git];
    const types = actions.map(a => a.type);
    expect(types).toEqual([
      'read_file', 'write_file', 'delete_file', 'run_shell', 'git_cmd',
    ]);
  });
});
