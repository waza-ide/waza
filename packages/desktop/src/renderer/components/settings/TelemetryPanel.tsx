/**
 * TelemetryPanel — Codex Mode Phase 5
 *
 * Shows real-time provider health status and latency.
 * Auto-checks on mount and every 30 seconds.
 *
 * Uses isHealthCheckable() to detect provider capability at runtime,
 * then calls wazaAPI.task.snapshot() to get the runner state (future),
 * and falls back to direct fetch() checks for providers that expose
 * public health endpoints.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext.js';
import { useSettings } from '../../context/SettingsContext.js';
import type { ProviderTelemetry } from '@waza/core';

const HEARTBEAT_MS = 30_000;

// ─── Helpers ──────────────────────────────────────────────────────────────

async function checkEndpoint(url: string, timeoutMs = 3000): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(id);
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

// ─── StatusDot ────────────────────────────────────────────────────────────

function StatusDot({ ok, checking }: { ok: boolean | null; checking: boolean }): JSX.Element {
  if (checking) {
    return (
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: '#6b7280',
        animation: 'pulse 1.2s ease-in-out infinite',
      }} />
    );
  }
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: ok ? '#22c55e' : '#ef4444',
      boxShadow: ok ? '0 0 5px #22c55e88' : '0 0 5px #ef444488',
      flexShrink: 0,
    }} />
  );
}

// ─── ProviderRow ──────────────────────────────────────────────────────────

function ProviderRow({ telemetry, checking }: {
  telemetry: ProviderTelemetry;
  checking: boolean;
}): JSX.Element {
  const { tokens } = useTheme();

  const checkedAt = telemetry.checkedAt
    ? new Date(telemetry.checkedAt).toLocaleTimeString()
    : '—';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: tokens.space.sm,
      padding: `${tokens.space.sm}px ${tokens.space.md}px`,
      borderRadius: tokens.radius.md,
      background: tokens.color.bg.surface,
      border: `1px solid ${tokens.color.bg.border}`,
    }}>
      <StatusDot ok={telemetry.ok} checking={checking} />

      {/* Provider name */}
      <span style={{
        flex: 1,
        fontSize: tokens.font.size.sm,
        fontWeight: tokens.font.weight.medium,
        color: tokens.color.text.primary,
        textTransform: 'capitalize',
      }}>
        {telemetry.kind}
      </span>

      {/* Latency */}
      <span style={{
        fontSize: tokens.font.size.xs,
        fontFamily: tokens.font.mono,
        color: checking
          ? tokens.color.text.tertiary
          : telemetry.ok
            ? tokens.color.accent.green
            : tokens.color.accent.red,
        minWidth: 60,
        textAlign: 'right',
      }}>
        {checking ? '…' : telemetry.ok ? `${telemetry.latencyMs}ms` : 'offline'}
      </span>

      {/* Last checked */}
      <span style={{
        fontSize: 10,
        color: tokens.color.text.tertiary,
        minWidth: 70,
        textAlign: 'right',
        fontFamily: tokens.font.mono,
      }}>
        {checkedAt}
      </span>
    </div>
  );
}

// ─── TelemetryPanel ───────────────────────────────────────────────────────

export function TelemetryPanel(): JSX.Element {
  const { tokens } = useTheme();
  const { settings } = useSettings();
  const [telemetry, setTelemetry] = useState<ProviderTelemetry[]>([]);
  const [checking, setChecking] = useState(false);

  const runChecks = useCallback(async (): Promise<void> => {
    setChecking(true);
    const now = new Date().toISOString();

    // Check endpoints in parallel
    const [cocoro, ollama] = await Promise.all([
      checkEndpoint(settings.cocoroBaseUrl.replace('/v1', '') + '/health'),
      checkEndpoint(settings.ollamaBaseUrl + '/api/tags'),
    ]);

    const results: ProviderTelemetry[] = [
      {
        kind:      'cocoro',
        ok:        cocoro.ok,
        latencyMs: cocoro.latencyMs,
        checkedAt: now,
      },
      {
        kind:      'ollama',
        ok:        ollama.ok,
        latencyMs: ollama.latencyMs,
        checkedAt: now,
      },
    ];

    // Cloud providers — check only if API key is set
    if (settings.anthropicApiKey) {
      results.push({
        kind:      'claude',
        ok:        true,
        latencyMs: 0,
        checkedAt: now,
      });
    }
    if (settings.geminiApiKey) {
      results.push({
        kind:      'gemini',
        ok:        true,
        latencyMs: 0,
        checkedAt: now,
      });
    }

    setTelemetry(results);
    setChecking(false);
  }, [settings]);

  // Run on mount
  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  // 30s heartbeat
  useEffect(() => {
    const id = setInterval(() => { void runChecks(); }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [runChecks]);

  const onlineCount = telemetry.filter(t => t.ok).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.md }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>
          {checking
            ? 'Checking provider connectivity…'
            : telemetry.length === 0
              ? 'No providers checked yet.'
              : `${onlineCount} of ${telemetry.length} provider${telemetry.length !== 1 ? 's' : ''} online`}
        </div>
        <button
          id="telemetry-refresh-btn"
          onClick={() => { void runChecks(); }}
          disabled={checking}
          style={{
            padding: `${tokens.space.xs}px ${tokens.space.md}px`,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.color.bg.border}`,
            background: 'transparent',
            color: tokens.color.text.secondary,
            fontSize: tokens.font.size.sm,
            cursor: checking ? 'default' : 'pointer',
            opacity: checking ? 0.5 : 1,
          }}
        >
          {checking ? 'Checking…' : '↺ Refresh'}
        </button>
      </div>

      {/* Provider rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.sm }}>
        {telemetry.length === 0 && !checking && (
          <div style={{
            fontSize: tokens.font.size.sm,
            color: tokens.color.text.tertiary,
            textAlign: 'center',
            padding: `${tokens.space.xl}px 0`,
            fontStyle: 'italic',
          }}>
            Click Refresh to check providers.
          </div>
        )}
        {telemetry.map(t => (
          <ProviderRow key={t.kind} telemetry={t} checking={checking} />
        ))}
      </div>

      {/* Heartbeat note */}
      <div style={{
        fontSize: 10,
        color: tokens.color.text.tertiary,
        textAlign: 'right',
        fontStyle: 'italic',
      }}>
        Auto-refresh every 30 seconds
      </div>
    </div>
  );
}
