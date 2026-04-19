/**
 * ReviewModal — Codex Mode Phase 2
 *
 * Shown when the Review Gateway intercepts a destructive agent action.
 * Renders a unified diff with line-level color highlighting and provides
 * [Approve] / [Reject] actions.
 *
 * Keyboard shortcuts:
 *   Cmd/Ctrl + Enter  → Approve
 *   Escape            → Reject
 *
 * Rendered via createPortal to the document body (same strategy as the
 * existing dropdown portals in this repo) to escape z-index stacking.
 */
import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ReviewRequest, GatewayDecision } from '@waza/core';
import { parseDiffLines } from '@waza/core';

// ─── Props ────────────────────────────────────────────────────────────────

interface ReviewModalProps {
  request: ReviewRequest;
  onDecision: (decision: GatewayDecision) => void;
}

// ─── Diff viewer ──────────────────────────────────────────────────────────

function DiffViewer({ patch }: { patch: string }) {
  if (!patch) {
    return (
      <div style={styles.noDiff}>No file diff available for this action.</div>
    );
  }

  const lines = parseDiffLines(patch);

  return (
    <div style={styles.diffContainer}>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            ...styles.diffLine,
            ...(line.type === 'added'   ? styles.added   : {}),
            ...(line.type === 'removed' ? styles.removed : {}),
            ...(line.type === 'header'  ? styles.header  : {}),
          }}
        >
          <span style={styles.lineNum}>
            {line.lineNumber !== undefined ? String(line.lineNumber).padStart(4) : '    '}
          </span>
          <span style={styles.linePrefix}>
            {line.type === 'added'   ? '+' :
             line.type === 'removed' ? '-' :
             line.type === 'header'  ? '@' : ' '}
          </span>
          <span style={styles.lineContent}>{line.content}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Action badge ─────────────────────────────────────────────────────────

function ActionBadge({ type }: { type: string }) {
  const badgeColors: Record<string, string> = {
    write_file:  '#d97706',
    delete_file: '#dc2626',
    run_shell:   '#7c3aed',
    git_cmd:     '#0891b2',
  };
  const color = badgeColors[type] ?? '#6b7280';
  return (
    <span style={{ ...styles.badge, background: color }}>
      {type.replace('_', ' ')}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────

export function ReviewModal({ request, onDecision }: ReviewModalProps) {
  const approve = useCallback(() => {
    onDecision({ approved: true });
  }, [onDecision]);

  const reject = useCallback(() => {
    onDecision({ approved: false, rejectionReason: 'User rejected action' });
  }, [onDecision]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        approve();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        reject();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [approve, reject]);

  const modal = (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div style={styles.headerLeft}>
            <span style={styles.warningIcon}>⚠</span>
            <h2 id="review-modal-title" style={styles.title}>Agent Review Required</h2>
          </div>
          <ActionBadge type={request.action.type} />
        </div>

        {/* Reason */}
        <div style={styles.reason}>
          <span style={styles.reasonLabel}>Reason</span>
          <span style={styles.reasonText}>{request.reason}</span>
        </div>

        {/* Action details */}
        <div style={styles.actionDetails}>
          {'path' in request.action && (
            <div style={styles.detailRow}>
              <span style={styles.detailKey}>Path</span>
              <code style={styles.detailVal}>{(request.action as { path: string }).path}</code>
            </div>
          )}
          {'command' in request.action && (
            <div style={styles.detailRow}>
              <span style={styles.detailKey}>Command</span>
              <code style={styles.detailVal}>{(request.action as { command: string }).command}</code>
            </div>
          )}
          {'args' in request.action && (
            <div style={styles.detailRow}>
              <span style={styles.detailKey}>Args</span>
              <code style={styles.detailVal}>git {(request.action as { args: string[] }).args.join(' ')}</code>
            </div>
          )}
        </div>

        {/* Diff */}
        {request.diff && (
          <div style={styles.diffSection}>
            <div style={styles.diffLabel}>File Diff</div>
            <DiffViewer patch={request.diff} />
          </div>
        )}

        {/* Buttons */}
        <div style={styles.footer}>
          <div style={styles.shortcutHint}>
            <kbd style={styles.kbd}>Esc</kbd> Reject &nbsp;·&nbsp;
            <kbd style={styles.kbd}>⌘↵</kbd> Approve
          </div>
          <div style={styles.buttons}>
            <button
              id="review-modal-reject"
              style={styles.rejectBtn}
              onClick={reject}
              type="button"
            >
              Reject
            </button>
            <button
              id="review-modal-approve"
              style={styles.approveBtn}
              onClick={approve}
              type="button"
              autoFocus
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: 'var(--bg-secondary, #1e1e2e)',
    border: '1px solid var(--border, #313244)',
    borderRadius: '12px',
    width: 'min(780px, 90vw)',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border, #313244)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  warningIcon: {
    fontSize: '20px',
    color: '#f59e0b',
  },
  title: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary, #cdd6f4)',
    fontFamily: 'var(--font-ui, Inter, system-ui, sans-serif)',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#fff',
    padding: '3px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  reason: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '12px 20px',
    background: 'rgba(245,158,11,0.08)',
    borderBottom: '1px solid var(--border, #313244)',
    flexShrink: 0,
  },
  reasonLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    paddingTop: '1px',
    flexShrink: 0,
  },
  reasonText: {
    fontSize: '13px',
    color: 'var(--text-secondary, #a6adc8)',
    lineHeight: 1.5,
  },
  actionDetails: {
    padding: '12px 20px',
    borderBottom: '1px solid var(--border, #313244)',
    flexShrink: 0,
  },
  detailRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'baseline',
    marginBottom: '4px',
  },
  detailKey: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted, #6c7086)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    minWidth: '60px',
  },
  detailVal: {
    fontSize: '12px',
    color: 'var(--text-primary, #cdd6f4)',
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
    wordBreak: 'break-all',
  },
  diffSection: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  diffLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted, #6c7086)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    padding: '8px 20px 4px',
    flexShrink: 0,
  },
  diffContainer: {
    flex: 1,
    overflowY: 'auto',
    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
    fontSize: '12px',
    lineHeight: '1.5',
  },
  diffLine: {
    display: 'flex',
    padding: '0 16px',
    minHeight: '20px',
    whiteSpace: 'pre',
    color: 'var(--text-secondary, #a6adc8)',
  },
  added: {
    background: 'rgba(34,197,94,0.12)',
    color: '#86efac',
  },
  removed: {
    background: 'rgba(239,68,68,0.12)',
    color: '#fca5a5',
  },
  header: {
    background: 'rgba(99,102,241,0.1)',
    color: '#a5b4fc',
    fontSize: '11px',
  },
  lineNum: {
    color: 'var(--text-muted, #6c7086)',
    userSelect: 'none',
    marginRight: '12px',
    flexShrink: 0,
    fontSize: '11px',
  },
  linePrefix: {
    marginRight: '8px',
    flexShrink: 0,
    fontWeight: 700,
  },
  lineContent: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  noDiff: {
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-muted, #6c7086)',
    fontSize: '13px',
    fontStyle: 'italic',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid var(--border, #313244)',
    flexShrink: 0,
  },
  shortcutHint: {
    fontSize: '12px',
    color: 'var(--text-muted, #6c7086)',
  },
  kbd: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px',
    padding: '1px 5px',
    fontSize: '11px',
    fontFamily: 'var(--font-mono, monospace)',
  },
  buttons: {
    display: 'flex',
    gap: '8px',
  },
  rejectBtn: {
    padding: '7px 18px',
    borderRadius: '6px',
    border: '1px solid var(--border, #313244)',
    background: 'transparent',
    color: 'var(--text-secondary, #a6adc8)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  approveBtn: {
    padding: '7px 18px',
    borderRadius: '6px',
    border: 'none',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
    fontFamily: 'inherit',
  },
};
