/**
 * agentPanelV2.test.ts — AgentPanelV2 taskStore integration tests (Phase 5)
 *
 * Tests the TaskControl state transitions as seen from the AgentPanelV2 perspective
 * (via the shared useTaskStore). We test the store's control actions directly,
 * since the component rendering requires happy-dom + React.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '../renderer/stores/taskStore.js';
import type { Task } from '@waza/core';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeTask(id = 'task-v2', status: Task['status'] = 'running'): Task {
  return {
    id,
    type: 'thread',
    title: 'Write a sorting algorithm',
    userInput: 'Write a sorting algorithm',
    status,
    skills: [],
    steps: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

beforeEach(() => {
  useTaskStore.getState().clearTasks();
});

// ── Task lifecycle ─────────────────────────────────────────────────────────

describe('AgentPanelV2 — task lifecycle via taskStore', () => {
  it('creates a task and sets it as active', () => {
    const task = makeTask('t1', 'pending');
    useTaskStore.getState().createTask(task);
    useTaskStore.getState().setActive('t1');
    expect(useTaskStore.getState().activeTaskId).toBe('t1');
    expect(useTaskStore.getState().tasks['t1']).toBeDefined();
  });

  it('running → paused on pauseTask', () => {
    const task = makeTask('t1', 'running');
    useTaskStore.getState().createTask(task);
    useTaskStore.getState().pauseTask('t1');
    expect(useTaskStore.getState().tasks['t1']?.status).toBe('paused');
  });

  it('paused → running on resumeTask', () => {
    const task = makeTask('t1', 'paused');
    useTaskStore.getState().createTask(task);
    useTaskStore.getState().resumeTask('t1');
    expect(useTaskStore.getState().tasks['t1']?.status).toBe('running');
  });

  it('running → cancelled on cancelTask', () => {
    const task = makeTask('t1', 'running');
    useTaskStore.getState().createTask(task);
    useTaskStore.getState().cancelTask('t1');
    expect(useTaskStore.getState().tasks['t1']?.status).toBe('cancelled');
  });

  it('error → pending on retryTask', () => {
    const task = makeTask('t1', 'error');
    useTaskStore.getState().createTask(task);
    useTaskStore.getState().retryTask('t1');
    expect(useTaskStore.getState().tasks['t1']?.status).toBe('pending');
  });

  it('updatedAt is bumped on status change', () => {
    const task = makeTask('t1', 'running');
    useTaskStore.getState().createTask(task);
    const before = useTaskStore.getState().tasks['t1']!.updatedAt;
    useTaskStore.getState().pauseTask('t1');
    expect(useTaskStore.getState().tasks['t1']!.updatedAt).toBeGreaterThanOrEqual(before);
  });
});

// ── Multiple tasks ─────────────────────────────────────────────────────────

describe('AgentPanelV2 — multiple tasks', () => {
  it('active task can be switched', () => {
    useTaskStore.getState().createTask(makeTask('t1', 'running'));
    useTaskStore.getState().createTask(makeTask('t2', 'pending'));
    useTaskStore.getState().setActive('t1');
    expect(useTaskStore.getState().activeTaskId).toBe('t1');
    useTaskStore.getState().setActive('t2');
    expect(useTaskStore.getState().activeTaskId).toBe('t2');
  });

  it('cancelling t1 does not affect t2', () => {
    useTaskStore.getState().createTask(makeTask('t1', 'running'));
    useTaskStore.getState().createTask(makeTask('t2', 'running'));
    useTaskStore.getState().cancelTask('t1');
    expect(useTaskStore.getState().tasks['t2']?.status).toBe('running');
  });

  it('clearTasks removes everything including activeTaskId', () => {
    useTaskStore.getState().createTask(makeTask('t1', 'running'));
    useTaskStore.getState().setActive('t1');
    useTaskStore.getState().clearTasks();
    expect(Object.keys(useTaskStore.getState().tasks)).toHaveLength(0);
    expect(useTaskStore.getState().activeTaskId).toBeNull();
  });
});

// ── Control actions on unknown taskId ─────────────────────────────────────

describe('AgentPanelV2 — control on unknown task', () => {
  it('pauseTask on unknown id is a no-op', () => {
    const before = useTaskStore.getState().tasks;
    useTaskStore.getState().pauseTask('ghost');
    expect(useTaskStore.getState().tasks).toBe(before);
  });

  it('retryTask on unknown id is a no-op', () => {
    const before = useTaskStore.getState().tasks;
    useTaskStore.getState().retryTask('ghost');
    expect(useTaskStore.getState().tasks).toBe(before);
  });
});
