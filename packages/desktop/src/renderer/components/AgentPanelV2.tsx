/**
 * AgentPanelV2 — Codex Mode Phase 5
 *
 * Replaces AgentPanel (which was based on AgentState).
 * Reads directly from taskStore; updates via task:update IPC events.
 *
 * Features:
 * - Live task status with icon/color
 * - Step-level progress display with log streaming
 * - Pause / Resume / Cancel / Retry control buttons
 * - Auto-scroll to latest log entry
 */
import { useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.js';
import { useTaskStore } from '../stores/taskStore.js';
import type { Task } from '@waza/core';

// ─── Types ────────────────────────────────────────────────────────────────

type TaskStatus = Task['status'];

// ─── Status display helpers ───────────────────────────────────────────────

function useStatusDisplay(tokens: ReturnType<typeof useTheme>['tokens']) {
  const ICON: Partial<Record<TaskStatus, string>> = {
    pending:   '○',
    running:   '◎',
    paused:    '⏸',
    done:      '✓',
    error:     '✗',
    cancelled: '■',
  };
  const COLOR: Partial<Record<TaskStatus, string>> = {
    pending:   tokens.color.text.tertiary,
    running:   tokens.color.accent.blue,
    paused:    tokens.color.accent.amber,
    done:      tokens.color.accent.green,
    error:     tokens.color.accent.red,
    cancelled: tokens.color.text.tertiary,
  };
  return { ICON, COLOR };
}

// ─── Sub-components ───────────────────────────────────────────────────────

function ControlBar({
  task,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: {
  task: Task;
  onPause:  () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry:  () => void;
}): JSX.Element {
  const { tokens } = useTheme();

  const btn = (id: string, label: string, onClick: () => void, danger = false): JSX.Element => (
    <button
      id={id}
      onClick={onClick}
      style={{
        padding: `3px 10px`,
        borderRadius: tokens.radius.sm,
        border: `1px solid ${danger ? tokens.color.accent.red + '55' : tokens.color.bg.border}`,
        background: 'transparent',
        color: danger ? tokens.color.accent.red : tokens.color.text.secondary,
        fontSize: tokens.font.size.xs,
        cursor: 'pointer',
        fontFamily: tokens.font.sans,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      display: 'flex',
      gap: tokens.space.xs,
      padding: `${tokens.space.xs}px ${tokens.space.md}px`,
      borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
      flexShrink: 0,
    }}>
      {task.status === 'running' && btn('task-pause-btn', '⏸ Pause', onPause)}
      {task.status === 'paused' && btn('task-resume-btn', '▶ Resume', onResume)}
      {(task.status === 'running' || task.status === 'paused') &&
        btn('task-cancel-btn', '■ Cancel', onCancel, true)}
      {(task.status === 'done' || task.status === 'error' || task.status === 'cancelled') &&
        btn('task-retry-btn', '↺ Retry', onRetry)}
    </div>
  );
}

// ─── AgentPanelV2 ─────────────────────────────────────────────────────────

export function AgentPanelV2(): JSX.Element {
  const { tokens } = useTheme();
  const { tasks, activeTaskId, pauseTask, resumeTask, cancelTask, retryTask } = useTaskStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { ICON, COLOR } = useStatusDisplay(tokens);

  const task = activeTaskId ? tasks[activeTaskId] : null;

  // Auto-scroll on changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.steps.length, task?.status]);

  // Subscribe to task:update IPC events
  useEffect(() => {
    const api = (window as unknown as { wazaAPI?: { task?: { onUpdate?: (cb: (p: unknown) => void) => () => void } } }).wazaAPI;
    if (!api?.task?.onUpdate) return;
    return api.task.onUpdate((_patch: unknown) => {
      // Patches are handled by taskStore's applyPatch (future)
      // For now, the store is updated via useTaskStore actions
    });
  }, []);

  const handlePause  = useCallback(() => { if (activeTaskId) pauseTask(activeTaskId); },  [activeTaskId, pauseTask]);
  const handleResume = useCallback(() => { if (activeTaskId) resumeTask(activeTaskId); }, [activeTaskId, resumeTask]);
  const handleCancel = useCallback(() => { if (activeTaskId) cancelTask(activeTaskId); }, [activeTaskId, cancelTask]);
  const handleRetry  = useCallback(() => { if (activeTaskId) retryTask(activeTaskId); },  [activeTaskId, retryTask]);

  // ── Empty state ──────────────────────────────────────────────────────────

  if (!task) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: tokens.space.md,
        color: tokens.color.text.tertiary,
        fontSize: tokens.font.size.sm,
        padding: tokens.space.xl,
      }}>
        <span style={{ fontSize: 20, opacity: 0.4 }}>◎</span>
        <span>No active task</span>
        <span style={{ fontSize: tokens.font.size.xs, textAlign: 'center', lineHeight: 1.5 }}>
          Submit a prompt below to start an agent task.
        </span>
      </div>
    );
  }

  const statusColor = COLOR[task.status] ?? tokens.color.text.tertiary;
  const statusIcon  = ICON[task.status] ?? '○';

  // ── Task view ─────────────────────────────────────────────────────────────

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Task header */}
      <div style={{
        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
        borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.space.sm,
      }}>
        <span style={{ color: statusColor, fontSize: 11 }}>{statusIcon}</span>
        <span style={{
          flex: 1,
          fontSize: tokens.font.size.xs,
          color: tokens.color.text.secondary,
          fontWeight: tokens.font.weight.medium,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {task.userInput.length > 50 ? task.userInput.slice(0, 50) + '…' : task.userInput}
        </span>
        <span style={{
          fontSize: 10,
          color: statusColor,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          {task.status}
        </span>
      </div>

      {/* Control bar — only visible when task is active */}
      {['running', 'paused', 'done', 'error', 'cancelled'].includes(task.status) && (
        <ControlBar
          task={task}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
          onRetry={handleRetry}
        />
      )}

      {/* Steps scroll area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: tokens.space.md,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.space.md,
      }}>

        {/* User prompt bubble */}
        <div style={{
          background: tokens.color.bg.active,
          borderRadius: tokens.radius.md,
          padding: `${tokens.space.sm}px ${tokens.space.md}px`,
          fontSize: tokens.font.size.sm,
          color: tokens.color.text.primary,
          lineHeight: 1.6,
        }}>
          {task.userInput}
        </div>

        {/* Steps */}
        {task.steps.map(step => (
          <div key={step.id} style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.xs }}>
            {/* Step header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.space.xs,
              fontSize: tokens.font.size.xs,
              color: step.status === 'running'
                ? tokens.color.accent.blue
                : step.status === 'done'
                  ? tokens.color.text.tertiary
                  : tokens.color.accent.red,
            }}>
              <span>{step.status === 'running' ? '▶' : step.status === 'done' ? '✓' : '✗'}</span>
              <span style={{ fontFamily: tokens.font.mono }}>{step.id.slice(0, 8)}</span>
              {step.status === 'running' && (
                <div style={{ display: 'flex', gap: 3, paddingLeft: 4 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      display: 'inline-block',
                      width: 4, height: 4, borderRadius: '50%',
                      background: tokens.color.accent.blue,
                      animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            {step.actions.map((action, ai) => (
              <div key={ai} style={{
                fontSize: tokens.font.size.xs,
                color: tokens.color.text.tertiary,
                fontFamily: tokens.font.mono,
                background: tokens.color.bg.surface,
                borderRadius: tokens.radius.sm,
                padding: `3px ${tokens.space.sm}px`,
                display: 'flex',
                alignItems: 'center',
                gap: tokens.space.xs,
              }}>
                <span style={{ color: tokens.color.accent.amber }}>▸</span>
                <span style={{ fontWeight: 600 }}>{action.type}</span>
                {action.path && <span style={{ color: tokens.color.text.tertiary }}>· {action.path}</span>}
              </div>
            ))}

            {/* Logs */}
            {step.logs.slice(-5).map((log, li) => (
              <div key={li} style={{
                fontSize: 11,
                color: log.level === 'error'
                  ? tokens.color.accent.red
                  : tokens.color.text.tertiary,
                fontFamily: tokens.font.mono,
                paddingLeft: tokens.space.md,
                lineHeight: 1.4,
              }}>
                <span style={{ opacity: 0.5 }}>[{log.source}]</span>{' '}
                {log.message}
              </div>
            ))}
          </div>
        ))}

        {/* Final output */}
        {task.status === 'done' && task.steps.length > 0 && (
          <div style={{
            background: tokens.color.accent.green + '10',
            border: `1px solid ${tokens.color.accent.green}33`,
            borderRadius: tokens.radius.md,
            padding: `${tokens.space.sm}px ${tokens.space.md}px`,
            fontSize: tokens.font.size.sm,
            color: tokens.color.text.primary,
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: tokens.font.size.xs, color: tokens.color.accent.green, marginBottom: 4 }}>
              ✓ Task completed
            </div>
            {task.steps[task.steps.length - 1]?.logs.slice(-1).map((l, i) => (
              <span key={i}>{l.message}</span>
            ))}
          </div>
        )}

        {/* Error */}
        {task.status === 'error' && (
          <div style={{
            background: tokens.color.accent.red + '10',
            border: `1px solid ${tokens.color.accent.red}33`,
            borderRadius: tokens.radius.md,
            padding: `${tokens.space.sm}px ${tokens.space.md}px`,
            fontSize: tokens.font.size.sm,
            color: tokens.color.accent.red,
          }}>
            ✗ Task failed
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
