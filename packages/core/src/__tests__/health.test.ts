/**
 * health.test.ts — HealthCheckable interface and telemetry tests (Phase 4)
 */
import { describe, it, expect, vi } from 'vitest';
import { isHealthCheckable } from '../providers/health.js';
import type { HealthCheckable, HealthCheckResult } from '../providers/health.js';

// ── isHealthCheckable ─────────────────────────────────────────────────────

describe('isHealthCheckable', () => {
  it('returns true for object with healthCheck function', () => {
    const obj: HealthCheckable = {
      healthCheck: async (): Promise<HealthCheckResult> => ({ ok: true, latencyMs: 10 }),
    };
    expect(isHealthCheckable(obj)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isHealthCheckable(null)).toBe(false);
  });

  it('returns false for plain object without healthCheck', () => {
    expect(isHealthCheckable({ model: 'gpt-4' })).toBe(false);
  });

  it('returns false for object with healthCheck as non-function', () => {
    expect(isHealthCheckable({ healthCheck: 'yes' })).toBe(false);
  });

  it('returns false for primitive', () => {
    expect(isHealthCheckable(42)).toBe(false);
    expect(isHealthCheckable('string')).toBe(false);
  });

  it('returns true for class instance with healthCheck', () => {
    class FakeProvider {
      async healthCheck(): Promise<HealthCheckResult> { return { ok: true, latencyMs: 5 }; }
    }
    expect(isHealthCheckable(new FakeProvider())).toBe(true);
  });
});

// ── HealthCheckResult shape ────────────────────────────────────────────────

describe('HealthCheckResult', () => {
  it('ok=true result passes type check', () => {
    const r: HealthCheckResult = { ok: true, latencyMs: 42 };
    expect(r.ok).toBe(true);
  });

  it('ok=false result with optional detail', () => {
    const r: HealthCheckResult = { ok: false, latencyMs: 5000, detail: 'timeout' };
    expect(r.ok).toBe(false);
    expect(r.detail).toBe('timeout');
  });
});

// ── Mock provider health check ────────────────────────────────────────────

describe('Mock provider healthCheck()', () => {
  it('returns ok=true with measured latency', async () => {
    const mock: HealthCheckable = {
      healthCheck: vi.fn().mockResolvedValue({ ok: true, latencyMs: 30 }),
    };
    const result = await mock.healthCheck();
    expect(result.ok).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns ok=false when provider is unreachable', async () => {
    const mock: HealthCheckable = {
      healthCheck: vi.fn().mockResolvedValue({ ok: false, latencyMs: 3000 }),
    };
    const result = await mock.healthCheck();
    expect(result.ok).toBe(false);
  });

  it('isHealthCheckable works with the mock', () => {
    const mock: HealthCheckable = {
      healthCheck: async () => ({ ok: true, latencyMs: 0 }),
    };
    expect(isHealthCheckable(mock)).toBe(true);
  });
});
