import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '../renderer/stores/taskStore.js';
import type { Task, Step, LogEntry, TaskAction } from '@waza/core';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeTask(id = 'task-1'): Task {
  return {
    id,
    type: 'thread',
    title: 'Test task',
    userInput: 'Test task input',
    status: 'pending',
    skills: [],
    steps: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function makeStep(taskId = 'task-1', id = 'step-1'): Step {
  return {
    id,
    taskId,
    status: 'pending',
    actions: [],
    logs: [],
  };
}

function makeLog(id = 'log-1'): LogEntry {
  return {
    id,
    timestamp: Date.now(),
    level: 'info',
    source: 'system',
    message: 'test log',
  };
}

// ── Reset store between tests ─────────────────────────────────────────────

beforeEach(() => {
  useTaskStore.getState().clearTasks();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('createTask', () => {
  it('adds the task to the store', () => {
    const task = makeTask();
    useTaskStore.getState().createTask(task);
    const stored = useTaskStore.getState().tasks['task-1'];
    expect(stored).toBeDefined();
    expect(stored!.title).toBe('Test task');
  });

  it('supports multiple tasks keyed by id', () => {
    useTaskStore.getState().createTask(makeTask('t1'));
    useTaskStore.getState().createTask(makeTask('t2'));
    const state = useTaskStore.getState();
    expect(Object.keys(state.tasks)).toHaveLength(2);
    expect(state.tasks['t1']).toBeDefined();
    expect(state.tasks['t2']).toBeDefined();
  });
});

describe('updateTaskStatus', () => {
  it('changes the task status', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().updateTaskStatus('task-1', 'running');
    expect(useTaskStore.getState().tasks['task-1']!.status).toBe('running');
  });

  it('updates updatedAt', () => {
    const task = makeTask();
    const before = task.updatedAt;
    useTaskStore.getState().createTask(task);
    useTaskStore.getState().updateTaskStatus('task-1', 'done');
    expect(useTaskStore.getState().tasks['task-1']!.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('does nothing for unknown taskId', () => {
    const before = useTaskStore.getState().tasks;
    useTaskStore.getState().updateTaskStatus('ghost', 'done');
    expect(useTaskStore.getState().tasks).toBe(before); // same reference
  });
});

describe('appendStep', () => {
  it('adds a step to the task', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().appendStep('task-1', makeStep());
    const task = useTaskStore.getState().tasks['task-1']!;
    expect(task.steps).toHaveLength(1);
    expect(task.steps[0]!.id).toBe('step-1');
  });

  it('appends multiple steps in order', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().appendStep('task-1', makeStep('task-1', 's1'));
    useTaskStore.getState().appendStep('task-1', makeStep('task-1', 's2'));
    const steps = useTaskStore.getState().tasks['task-1']!.steps;
    expect(steps.map(s => s.id)).toEqual(['s1', 's2']);
  });
});

describe('updateStepStatus', () => {
  it('changes the step status', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().appendStep('task-1', makeStep());
    useTaskStore.getState().updateStepStatus('task-1', 'step-1', 'running');
    const step = useTaskStore.getState().tasks['task-1']!.steps[0]!;
    expect(step.status).toBe('running');
  });
});

describe('appendLog', () => {
  it('adds a log entry to the correct step', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().appendStep('task-1', makeStep());
    useTaskStore.getState().appendLog('task-1', 'step-1', makeLog());
    const logs = useTaskStore.getState().tasks['task-1']!.steps[0]!.logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]!.message).toBe('test log');
  });

  it('appends multiple logs preserving order', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().appendStep('task-1', makeStep());
    useTaskStore.getState().appendLog('task-1', 'step-1', makeLog('l1'));
    useTaskStore.getState().appendLog('task-1', 'step-1', { ...makeLog('l2'), message: 'second' });
    const logs = useTaskStore.getState().tasks['task-1']!.steps[0]!.logs;
    expect(logs.map(l => l.id)).toEqual(['l1', 'l2']);
  });
});

describe('setActive', () => {
  it('sets activeTaskId', () => {
    useTaskStore.getState().setActive('task-42');
    expect(useTaskStore.getState().activeTaskId).toBe('task-42');
  });

  it('can be set to null', () => {
    useTaskStore.getState().setActive('t1');
    useTaskStore.getState().setActive(null);
    expect(useTaskStore.getState().activeTaskId).toBeNull();
  });
});

describe('clearTasks', () => {
  it('resets to empty state', () => {
    useTaskStore.getState().createTask(makeTask('t1'));
    useTaskStore.getState().setActive('t1');
    useTaskStore.getState().clearTasks();
    expect(useTaskStore.getState().tasks).toEqual({});
    expect(useTaskStore.getState().activeTaskId).toBeNull();
  });
});

describe('appendAction', () => {
  it('adds an action to the correct step', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().appendStep('task-1', makeStep());
    const action: TaskAction = { type: 'read_file', path: 'src/index.ts' };
    useTaskStore.getState().appendAction('task-1', 'step-1', action);
    const actions = useTaskStore.getState().tasks['task-1']!.steps[0]!.actions;
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual(action);
  });

  it('preserves action order across multiple appends', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().appendStep('task-1', makeStep());
    const a1: TaskAction = { type: 'read_file', path: 'a.ts' };
    const a2: TaskAction = { type: 'write_file', path: 'b.ts', content: 'hello' };
    useTaskStore.getState().appendAction('task-1', 'step-1', a1);
    useTaskStore.getState().appendAction('task-1', 'step-1', a2);
    const actions = useTaskStore.getState().tasks['task-1']!.steps[0]!.actions;
    expect(actions.map((a) => a.type)).toEqual(['read_file', 'write_file']);
  });

  it('does nothing for unknown task/step combination', () => {
    useTaskStore.getState().createTask(makeTask());
    const action: TaskAction = { type: 'read_file', path: 'ghost.ts' };
    // step-ghost does not exist — should not throw
    useTaskStore.getState().appendAction('task-1', 'step-ghost', action);
    const task = useTaskStore.getState().tasks['task-1']!;
    expect(task.steps).toHaveLength(0);
  });
});

// ── Phase 3: TaskControl actions ──────────────────────────────────────────

describe('pauseTask', () => {
  it('sets task status to paused', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().updateTaskStatus('task-1', 'running');
    useTaskStore.getState().pauseTask('task-1');
    expect(useTaskStore.getState().tasks['task-1']!.status).toBe('paused');
  });

  it('does nothing for unknown taskId', () => {
    const before = useTaskStore.getState().tasks;
    useTaskStore.getState().pauseTask('ghost');
    expect(useTaskStore.getState().tasks).toBe(before);
  });
});

describe('resumeTask', () => {
  it('sets task status back to running', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().pauseTask('task-1');
    useTaskStore.getState().resumeTask('task-1');
    expect(useTaskStore.getState().tasks['task-1']!.status).toBe('running');
  });
});

describe('cancelTask', () => {
  it('sets task status to cancelled', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().updateTaskStatus('task-1', 'running');
    useTaskStore.getState().cancelTask('task-1');
    expect(useTaskStore.getState().tasks['task-1']!.status).toBe('cancelled');
  });
});

describe('retryTask', () => {
  it('sets task status back to pending', () => {
    useTaskStore.getState().createTask(makeTask());
    useTaskStore.getState().updateTaskStatus('task-1', 'error');
    useTaskStore.getState().retryTask('task-1');
    expect(useTaskStore.getState().tasks['task-1']!.status).toBe('pending');
  });

  it('does nothing for unknown taskId', () => {
    const before = useTaskStore.getState().tasks;
    useTaskStore.getState().retryTask('ghost');
    expect(useTaskStore.getState().tasks).toBe(before);
  });
});
