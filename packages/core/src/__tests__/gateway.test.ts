/**
 * gateway.test.ts — ReviewGateway state machine tests
 *
 * Verifies:
 * - Safe actions pass through without calling the review handler
 * - Dangerous actions invoke the review handler and honour its decision
 * - assertValidTransition() rejects illegal state jumps
 * - checkBatch() delegates correctly
 */
import { describe, it, expect, vi } from 'vitest';
import { ReviewGateway, assertValidTransition } from '../gateway/gateway.js';
import type { GatewayDecision, ReviewRequest } from '../gateway/gateway.js';
import type { TaskAction } from '../task/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function approve(): Promise<GatewayDecision> {
  return Promise.resolve({ approved: true });
}

function reject(reason = 'user rejected'): () => Promise<GatewayDecision> {
  return () => Promise.resolve({ approved: false, rejectionReason: reason });
}

const safeAction: TaskAction  = { type: 'read_file', path: 'src/index.ts' };
const writeAction: TaskAction = { type: 'write_file', path: 'out.ts', content: 'hello' };
const deleteAction: TaskAction = { type: 'delete_file', path: 'old.ts' };
const shellSafe: TaskAction   = { type: 'run_shell', command: 'echo hello' };
const shellDanger: TaskAction = { type: 'run_shell', command: 'rm -rf dist/' };
const gitSafe: TaskAction     = { type: 'git_cmd', args: ['log', '--oneline'] };
const gitDanger: TaskAction   = { type: 'git_cmd', args: ['push', 'origin', 'main'] };

// ─── check() — single action ─────────────────────────────────────────────

describe('ReviewGateway.check() — safe actions', () => {
  it('read_file passes without calling handler', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.check(safeAction);
    expect(decision.approved).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it('safe shell passes without calling handler', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.check(shellSafe);
    expect(decision.approved).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it('safe git passes without calling handler', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.check(gitSafe);
    expect(decision.approved).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('ReviewGateway.check() — dangerous actions require review', () => {
  it('write_file triggers review handler', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.check(writeAction, '--- a\n+++ b\n@@ -0,0 +1 @@\n+hello');
    expect(decision.approved).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('delete_file triggers review handler', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.check(deleteAction);
    expect(decision.approved).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dangerous shell triggers review handler', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.check(shellDanger);
    expect(decision.approved).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dangerous git triggers review handler', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.check(gitDanger);
    expect(decision.approved).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('ReviewGateway.check() — rejection', () => {
  it('returns approved=false when user rejects', async () => {
    const gw = new ReviewGateway(reject('too dangerous'));
    const decision = await gw.check(writeAction);
    expect(decision.approved).toBe(false);
    expect(decision.rejectionReason).toBe('too dangerous');
  });

  it('status becomes aborted after rejection', async () => {
    const gw = new ReviewGateway(reject());
    await gw.check(writeAction);
    expect(gw.getStatus()).toBe('aborted');
  });

  it('status becomes approved after approval', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    await gw.check(writeAction);
    expect(gw.getStatus()).toBe('approved');
  });
});

describe('ReviewGateway.check() — handler receives correct request', () => {
  it('passes action to handler', async () => {
    let captured: ReviewRequest | null = null;
    const handler = (req: ReviewRequest) => {
      captured = req;
      return approve();
    };
    const gw = new ReviewGateway(handler);
    await gw.check(writeAction, 'diff-content');
    expect(captured).not.toBeNull();
    expect(captured!.action).toEqual(writeAction);
    expect(captured!.diff).toBe('diff-content');
    expect(captured!.reason).toContain('out.ts');
  });
});

describe('ReviewGateway.check() — handler exception → safe rejection', () => {
  it('treats handler throw as rejection', async () => {
    const handler = () => Promise.reject(new Error('modal closed'));
    const gw = new ReviewGateway(handler);
    const decision = await gw.check(writeAction);
    expect(decision.approved).toBe(false);
    expect(decision.rejectionReason).toContain('modal closed');
  });
});

describe('ReviewGateway.reset()', () => {
  it('resets status to idle', async () => {
    const gw = new ReviewGateway(reject());
    await gw.check(writeAction);
    expect(gw.getStatus()).toBe('aborted');
    gw.reset();
    expect(gw.getStatus()).toBe('idle');
  });
});

// ─── checkBatch() ─────────────────────────────────────────────────────────

describe('ReviewGateway.checkBatch()', () => {
  it('all-safe batch passes without handler', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.checkBatch([safeAction, shellSafe]);
    expect(decision.approved).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it('batch with write triggers handler once', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.checkBatch([safeAction, writeAction]);
    expect(decision.approved).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('batch with two writes triggers handler once', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    await gw.checkBatch([writeAction, writeAction]);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('batch rejection returns approved=false', async () => {
    const gw = new ReviewGateway(reject('batch rejected'));
    const decision = await gw.checkBatch([writeAction, writeAction]);
    expect(decision.approved).toBe(false);
    expect(decision.rejectionReason).toBe('batch rejected');
  });

  it('empty batch always passes', async () => {
    const handler = vi.fn(approve);
    const gw = new ReviewGateway(handler);
    const decision = await gw.checkBatch([]);
    expect(decision.approved).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });
});

// ─── assertValidTransition ────────────────────────────────────────────────

describe('assertValidTransition()', () => {
  it('pending → running is valid', () => {
    expect(() => assertValidTransition('pending', 'running')).not.toThrow();
  });
  it('running → proposing is valid', () => {
    expect(() => assertValidTransition('running', 'proposing')).not.toThrow();
  });
  it('proposing → awaiting_review is valid', () => {
    expect(() => assertValidTransition('proposing', 'awaiting_review')).not.toThrow();
  });
  it('awaiting_review → running is valid (approved)', () => {
    expect(() => assertValidTransition('awaiting_review', 'running')).not.toThrow();
  });
  it('awaiting_review → aborted is valid (rejected)', () => {
    expect(() => assertValidTransition('awaiting_review', 'aborted')).not.toThrow();
  });
  it('running → done is valid', () => {
    expect(() => assertValidTransition('running', 'done')).not.toThrow();
  });
  it('running → error is valid', () => {
    expect(() => assertValidTransition('running', 'error')).not.toThrow();
  });
  it('done → running is INVALID', () => {
    expect(() => assertValidTransition('done', 'running')).toThrow();
  });
  it('aborted → running is INVALID', () => {
    expect(() => assertValidTransition('aborted', 'running')).toThrow();
  });
  it('pending → done shortcut is INVALID', () => {
    expect(() => assertValidTransition('pending', 'done')).toThrow();
  });
  it('awaiting_review → done shortcut is INVALID', () => {
    expect(() => assertValidTransition('awaiting_review', 'done')).toThrow();
  });
  it('unknown status throws', () => {
    expect(() => assertValidTransition('ghost', 'running')).toThrow(/Unknown step status/);
  });
});
