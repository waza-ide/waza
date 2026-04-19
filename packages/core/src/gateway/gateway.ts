/**
 * Review Gateway State Machine — Codex Mode Phase 2
 *
 * Enforces the Step status transition:
 *   running → proposing → awaiting_review → { execute | aborted }
 *
 * The gateway is the single chokepoint through which every potentially
 * destructive agent action must pass. It:
 *   1. Checks whether the action requires review (via triggers.ts)
 *   2. If yes: pauses execution, emits a review request, and waits for
 *              user approval or rejection (promise-based)
 *   3. If no:  passes through immediately
 *   4. On rejection: returns { approved: false } so the caller can
 *              trigger the Auto-Fix Loop
 *
 * Design: pure class with no React / Electron dependencies — injected I/O.
 */
import { requiresReview, batchRequiresReview, reviewReason } from './triggers.js';
import type { TaskAction } from '../task/types.js';

// ─── Public types ─────────────────────────────────────────────────────────

export type GatewayStatus =
  | 'idle'
  | 'proposing'
  | 'awaiting_review'
  | 'approved'
  | 'aborted';

export interface ReviewRequest {
  actionIndex: number;
  action: TaskAction;
  reason: string;
  /** Unified diff string (set by caller for write_file, empty otherwise) */
  diff: string;
}

export interface GatewayDecision {
  approved: boolean;
  /** Set when approved === false, for use by the Auto-Fix Loop */
  rejectionReason?: string;
}

/**
 * Callback type injected into the Gateway.
 * The ReviewModal calls `resolve` when user clicks Approve or Reject.
 */
export type ReviewHandler = (
  request: ReviewRequest
) => Promise<GatewayDecision>;

// ─── Gateway class ────────────────────────────────────────────────────────

export class ReviewGateway {
  private status: GatewayStatus = 'idle';
  private onReview: ReviewHandler;

  constructor(reviewHandler: ReviewHandler) {
    this.onReview = reviewHandler;
  }

  getStatus(): GatewayStatus {
    return this.status;
  }

  /**
   * Check a single action through the gateway.
   *
   * @param action    The action the agent wants to execute.
   * @param diff      Pre-generated unified diff (for write_file).
   * @returns         { approved: true }  → safe to execute
   *                  { approved: false } → rejected, trigger Auto-Fix
   */
  async check(action: TaskAction, diff = ''): Promise<GatewayDecision> {
    if (!requiresReview(action)) {
      return { approved: true };
    }

    this.status = 'proposing';

    const request: ReviewRequest = {
      actionIndex: 0,
      action,
      reason: reviewReason(action),
      diff,
    };

    this.status = 'awaiting_review';

    let decision: GatewayDecision;
    try {
      decision = await this.onReview(request);
    } catch (err) {
      // Handler threw — treat as rejection to be safe
      decision = {
        approved: false,
        rejectionReason: err instanceof Error ? err.message : String(err),
      };
    }

    this.status = decision.approved ? 'approved' : 'aborted';
    return decision;
  }

  /**
   * Check an entire batch of actions.
   *
   * If the batch collectively requires review, a single review request is
   * raised with the most impactful action (first write/delete wins).
   * This prevents review fatigue for large multi-file edits.
   */
  async checkBatch(
    actions: TaskAction[],
    diffs: string[] = []
  ): Promise<GatewayDecision> {
    if (!batchRequiresReview(actions)) {
      return { approved: true };
    }

    // Pick the first mutating action for the review request
    const primaryIdx = actions.findIndex(
      (a) => a.type === 'write_file' || a.type === 'delete_file' || requiresReview(a)
    );
    const primary = actions[primaryIdx] ?? actions[0];
    if (!primary) return { approved: true };

    this.status = 'proposing';

    const request: ReviewRequest = {
      actionIndex: primaryIdx >= 0 ? primaryIdx : 0,
      action: primary,
      reason: `Batch of ${actions.length} actions — ${reviewReason(primary)}`,
      diff: diffs[primaryIdx] ?? '',
    };

    this.status = 'awaiting_review';

    let decision: GatewayDecision;
    try {
      decision = await this.onReview(request);
    } catch (err) {
      decision = {
        approved: false,
        rejectionReason: err instanceof Error ? err.message : String(err),
      };
    }

    this.status = decision.approved ? 'approved' : 'aborted';
    return decision;
  }

  /** Reset for the next step */
  reset(): void {
    this.status = 'idle';
  }
}

// ─── Invalid transition guard ─────────────────────────────────────────────

/**
 * Valid Step status transitions enforced by the Gateway.
 * Called by the loop to validate state before advancing.
 */
const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  pending:          ['running'],
  running:          ['proposing', 'done', 'error'],
  proposing:        ['awaiting_review', 'running'],
  awaiting_review:  ['running', 'aborted'],
  done:             [],
  error:            [],
  aborted:          [],
};

export function assertValidTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) throw new Error(`Unknown step status: '${from}'`);
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid step transition: '${from}' → '${to}'. ` +
      `Allowed: [${allowed.join(', ')}]`
    );
  }
}
