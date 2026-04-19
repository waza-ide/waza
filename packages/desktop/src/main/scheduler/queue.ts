/**
 * TaskQueue — Codex Mode Phase 3
 *
 * Priority queue for agent tasks with starvation prevention.
 *
 * Spec requirements:
 * - Priority: 0 = Background, 1 = Normal, 2 = High
 * - MAX_WORKERS = 3 (concurrent running tasks limit)
 * - Starvation prevention: tasks waiting > 60s get priority bump (+1, max 2)
 * - Enqueue / dequeue are synchronous (no I/O)
 */

export type TaskPriority = 0 | 1 | 2;

export interface TaskQueueItem {
  taskId:     string;
  priority:   TaskPriority;
  retries:    number;
  maxRetries: number;
  enqueuedAt: number;
}

export const MAX_WORKERS = 3;
export const STARVATION_THRESHOLD_MS = 60_000;

export class TaskQueue {
  private items: TaskQueueItem[] = [];
  private running = new Set<string>();

  // ── Queries ──────────────────────────────────────────────────────────

  get size(): number { return this.items.length; }
  get runningCount(): number { return this.running.size; }
  get pendingItems(): readonly TaskQueueItem[] { return this.items; }
  get runningIds(): ReadonlySet<string> { return this.running; }

  isRunning(taskId: string): boolean { return this.running.has(taskId); }
  isFull(): boolean { return this.running.size >= MAX_WORKERS; }

  // ── Mutations ─────────────────────────────────────────────────────────

  enqueue(item: TaskQueueItem): void {
    // Replace if already queued (re-enqueue after retry)
    const existing = this.items.findIndex(i => i.taskId === item.taskId);
    if (existing !== -1) {
      this.items.splice(existing, 1);
    }
    this.items.push(item);
  }

  /**
   * Dequeue the highest-priority item that is not already running,
   * returning it so the caller can start execution.
   *
   * Before selecting, applies starvation boost: any item waiting longer
   * than STARVATION_THRESHOLD_MS has its priority bumped by 1 (max 2).
   *
   * Returns undefined when at capacity or queue is empty.
   */
  dequeue(now = Date.now()): TaskQueueItem | undefined {
    // Always apply starvation prevention, even when at capacity.
    // This ensures priority boosts accumulate while workers are full.
    for (const item of this.items) {
      if (now - item.enqueuedAt > STARVATION_THRESHOLD_MS && item.priority < 2) {
        item.priority = (item.priority + 1) as TaskPriority;
      }
    }

    if (this.running.size >= MAX_WORKERS) return undefined;
    if (this.items.length === 0) return undefined;

    // Sort descending by priority (stable — JS sort is stable since ES2019)
    this.items.sort((a, b) => b.priority - a.priority);

    const item = this.items.shift();
    if (!item) return undefined;

    this.running.add(item.taskId);
    return item;
  }

  /** Mark a task as completed / stopped (frees a worker slot) */
  complete(taskId: string): void {
    this.running.delete(taskId);
  }

  /** Remove a queued (not running) task */
  remove(taskId: string): boolean {
    const idx = this.items.findIndex(i => i.taskId === taskId);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** Force-remove from both queue and running set (used by cancel) */
  forceRemove(taskId: string): void {
    this.remove(taskId);
    this.running.delete(taskId);
  }

  /** Bump an existing item's priority (used by retry with high-priority) */
  setPriority(taskId: string, priority: TaskPriority): boolean {
    const item = this.items.find(i => i.taskId === taskId);
    if (!item) return false;
    item.priority = priority;
    return true;
  }

  /** Snapshot for inspection (e.g. task list UI) */
  snapshot(): { pending: TaskQueueItem[]; running: string[] } {
    return {
      pending: [...this.items],
      running: [...this.running],
    };
  }
}
