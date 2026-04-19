/**
 * HealthCheckable — Codex Mode Phase 4
 *
 * Optional interface for LLM Providers that support connectivity checks.
 * Implemented separately from BaseProvider so we don't touch the FROZEN base.ts.
 *
 * Usage:
 *   if (isHealthCheckable(provider)) {
 *     const result = await provider.healthCheck();
 *   }
 */

// ─── Interface ─────────────────────────────────────────────────────────────

export interface HealthCheckResult {
  ok:        boolean;
  latencyMs: number;
  /** Optional provider-specific detail (model list, version, etc.) */
  detail?:   string;
}

export interface HealthCheckable {
  healthCheck(): Promise<HealthCheckResult>;
}

// ─── Type guard ───────────────────────────────────────────────────────────

export function isHealthCheckable(obj: unknown): obj is HealthCheckable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'healthCheck' in obj &&
    typeof (obj as { healthCheck: unknown }).healthCheck === 'function'
  );
}

// ─── Telemetry record ─────────────────────────────────────────────────────

export interface ProviderTelemetry {
  /** Provider kind — matches ProviderKind from @waza/core models */
  kind:        string;
  ok:          boolean;
  latencyMs:   number;
  /** ISO string */
  checkedAt:   string;
  /** ISO string — when the provider was last used for a completion */
  lastUsedAt?: string;
}
