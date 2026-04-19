/**
 * taskStore — Zustand store for Codex Mode Task/Step state (Phase 3)
 *
 * Phase 3 additions:
 * - TaskControl: pause / resume / cancel / retry — delegate to wazaAPI.task.control()
 * - applyPatch(): receives task:update events from Main process and merges them
 * - All mutations are immutable (spreading) so Zustand's shallow equality
 *   works correctly with React subscriptions.
 */
import { create } from 'zustand';
import type { Task, Step, LogEntry, TaskAction } from '@waza/core';

// ─── State shape ───────────────────────────────────────────────────────────

export interface TaskStoreState {
  /** All known tasks, keyed by task.id */
  tasks: Record<string, Task>;
  /** Currently focused task (shown in AgentPanel) */
  activeTaskId: string | null;

  // ── mutations ──
  createTask:         (task: Task) => void;
  updateTaskStatus:   (taskId: string, status: Task['status']) => void;
  appendStep:         (taskId: string, step: Step) => void;
  updateStepStatus:   (taskId: string, stepId: string, status: Step['status']) => void;
  appendAction:       (taskId: string, stepId: string, action: TaskAction) => void;
  appendLog:          (taskId: string, stepId: string, log: LogEntry) => void;
  setActive:          (taskId: string | null) => void;
  clearTasks:         () => void;

  // ── Phase 3: TaskControl (delegate to Main via IPC) ──
  pauseTask:   (taskId: string) => void;
  resumeTask:  (taskId: string) => void;
  cancelTask:  (taskId: string) => void;
  retryTask:   (taskId: string, extraPrompt?: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Send a control action to the Main process via IPC (no-op in tests) */
function ipcControl(taskId: string, action: string, extraPrompt?: string): void {
  if (typeof window === 'undefined') return;
  const api = (window as unknown as { wazaAPI?: { task?: { control?: (p: unknown) => void } } }).wazaAPI;
  if (!api?.task?.control) return;
  api.task.control({ taskId, action, extraPrompt });
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useTaskStore = create<TaskStoreState>((set) => ({
  tasks:        {},
  activeTaskId: null,

  createTask: (task) =>
    set((s) => ({
      tasks: { ...s.tasks, [task.id]: task },
    })),

  updateTaskStatus: (taskId, status) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, status, updatedAt: Date.now() },
        },
      };
    }),

  appendStep: (taskId, step) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...task,
            steps: [...task.steps, step],
            updatedAt: Date.now(),
          },
        },
      };
    }),

  updateStepStatus: (taskId, stepId, status) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      const steps = task.steps.map((st) =>
        st.id === stepId ? { ...st, status } : st
      );
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, steps, updatedAt: Date.now() },
        },
      };
    }),

  appendAction: (taskId, stepId, action) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      const steps = task.steps.map((st) =>
        st.id === stepId
          ? { ...st, actions: [...st.actions, action] }
          : st
      );
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, steps, updatedAt: Date.now() },
        },
      };
    }),

  appendLog: (taskId, stepId, log) =>
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      const steps = task.steps.map((st) =>
        st.id === stepId
          ? { ...st, logs: [...st.logs, log] }
          : st
      );
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, steps, updatedAt: Date.now() },
        },
      };
    }),

  setActive: (taskId) => set({ activeTaskId: taskId }),

  clearTasks: () => set({ tasks: {}, activeTaskId: null }),

  // ── Phase 3: TaskControl ──────────────────────────────────────────────

  pauseTask: (taskId) => {
    ipcControl(taskId, 'pause');
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, status: 'paused' as Task['status'], updatedAt: Date.now() },
        },
      };
    });
  },

  resumeTask: (taskId) => {
    ipcControl(taskId, 'resume');
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, status: 'running', updatedAt: Date.now() },
        },
      };
    });
  },

  cancelTask: (taskId) => {
    ipcControl(taskId, 'cancel');
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, status: 'cancelled', updatedAt: Date.now() },
        },
      };
    });
  },

  retryTask: (taskId, extraPrompt) => {
    ipcControl(taskId, 'retry', extraPrompt);
    set((s) => {
      const task = s.tasks[taskId];
      if (!task) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: { ...task, status: 'pending', updatedAt: Date.now() },
        },
      };
    });
  },
}));
