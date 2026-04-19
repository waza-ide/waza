/**
 * Task IPC channels — Codex Mode Phase 3
 *
 * Registers the task:* IPC handlers in the Electron Main process.
 * Call setupTaskIpc(win) from main/index.ts after creating the window.
 *
 * Channels:
 *   task:create   (handle)  — enqueue a new task
 *   task:control  (handle)  — pause / resume / cancel / retry
 *   task:snapshot (handle)  — read-only queue snapshot
 *   task:execute  (handle)  — immediately execute (bypasses queue, for tests)
 *   task:update   (send)    — pushed from Main → Renderer (no handler needed)
 */
import { ipcMain, BrowserWindow } from 'electron';
import { taskRunner } from '../scheduler/runner.js';
import type { CreateTaskPayload, ControlPayload } from '../scheduler/runner.js';

export function setupTaskIpc(win: BrowserWindow): void {
  // Attach window so runner can push updates
  taskRunner.attach(win);

  // ── task:create ───────────────────────────────────────────────────────
  ipcMain.handle('task:create', async (_event, payload: CreateTaskPayload) => {
    taskRunner.enqueue(payload);
    // Start execution immediately (Phase 3 simple model — no separate drain loop)
    void taskRunner.execute(payload);
    return { ok: true, taskId: payload.taskId };
  });

  // ── task:control ──────────────────────────────────────────────────────
  ipcMain.handle('task:control', async (_event, payload: ControlPayload) => {
    taskRunner.control(payload);
    return { ok: true };
  });

  // ── task:snapshot ─────────────────────────────────────────────────────
  ipcMain.handle('task:snapshot', async () => {
    return taskRunner.snapshot();
  });
}
