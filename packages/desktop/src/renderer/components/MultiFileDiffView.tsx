import { diffLines } from 'diff';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext.js';
import type { MultiFileEdit } from '../types/editor.js';

interface MultiFileDiffViewProps {
  edit: MultiFileEdit | null;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptFile: (path: string) => void;
  onRejectFile: (path: string) => void;
}

export function MultiFileDiffView({
  edit,
  onAcceptAll,
  onRejectAll,
  onAcceptFile,
  onRejectFile,
}: MultiFileDiffViewProps): JSX.Element | null {
  const { tokens } = useTheme();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(edit?.files.map(f => f.path) ?? [])
  );

  if (!edit || edit.files.length === 0) return null;

  function toggleExpanded(path: string): void {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }

  const acceptStyle = {
    fontSize: 11,
    padding: '2px 8px',
    background: tokens.color.accent.green,
    border: 'none',
    borderRadius: tokens.radius.sm,
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
  } as const;

  const rejectStyle = {
    fontSize: 11,
    padding: '2px 8px',
    background: tokens.color.bg.active,
    border: `1px solid ${tokens.color.bg.border}`,
    borderRadius: tokens.radius.sm,
    color: tokens.color.text.secondary,
    cursor: 'pointer',
    flexShrink: 0,
  } as const;

  return (
    <div style={{
      background: tokens.color.bg.surface,
      border: `1px solid ${tokens.color.bg.border}`,
      borderRadius: tokens.radius.md,
      overflow: 'hidden',
      margin: tokens.space.sm,
      flexShrink: 0,
    }}>
      {/* ヘッダー */}
      <div style={{
        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
        borderBottom: `1px solid ${tokens.color.bg.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.space.sm,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary, flex: 1, minWidth: 0 }}>
          {edit.description}
          <span style={{ marginLeft: 8, color: tokens.color.accent.blue }}>
            {edit.files.length}ファイル
          </span>
        </span>
        <button id="accept-all-btn" onClick={onAcceptAll} style={acceptStyle}>すべて承認</button>
        <button id="reject-all-btn" onClick={onRejectAll} style={rejectStyle}>すべて却下</button>
      </div>

      {/* ファイルごとのdiff */}
      {edit.files.map(file => {
        const changes = diffLines(file.originalContent, file.newContent);
        const isExpanded = expanded.has(file.path);
        const addCount = changes.filter(c => c.added).reduce((n, c) => n + (c.count ?? 0), 0);
        const removeCount = changes.filter(c => c.removed).reduce((n, c) => n + (c.count ?? 0), 0);
        const filename = file.path.split('/').pop() ?? file.path;

        return (
          <div key={file.path} style={{ borderBottom: `1px solid ${tokens.color.bg.borderSub}` }}>
            <div
              onClick={() => toggleExpanded(file.path)}
              style={{
                padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                display: 'flex',
                alignItems: 'center',
                gap: tokens.space.sm,
                cursor: 'pointer',
                fontSize: tokens.font.size.sm,
                background: tokens.color.bg.surface,
              }}
            >
              <span style={{ color: tokens.color.text.tertiary, fontSize: 10 }}>
                {isExpanded ? '▾' : '▸'}
              </span>
              <span style={{
                color: tokens.color.text.primary,
                flex: 1,
                fontFamily: tokens.font.mono,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: tokens.font.size.xs,
              }}>
                {filename}
              </span>
              <span style={{ color: tokens.color.diff.addedText, flexShrink: 0, fontSize: tokens.font.size.xs }}>
                +{addCount}
              </span>
              <span style={{ color: tokens.color.diff.removedText, flexShrink: 0, fontSize: tokens.font.size.xs }}>
                −{removeCount}
              </span>
              <button
                id={`accept-file-${filename}`}
                onClick={e => { e.stopPropagation(); onAcceptFile(file.path); }}
                style={acceptStyle}
              >
                承認
              </button>
              <button
                id={`reject-file-${filename}`}
                onClick={e => { e.stopPropagation(); onRejectFile(file.path); }}
                style={rejectStyle}
              >
                却下
              </button>
            </div>

            {isExpanded && (
              <div style={{
                fontFamily: tokens.font.mono,
                fontSize: 12,
                maxHeight: 250,
                overflowY: 'auto',
                borderTop: `1px solid ${tokens.color.bg.borderSub}`,
              }}>
                {changes.map((change, i) => {
                  const lines = change.value.split('\n');
                  const displayLines = lines[lines.length - 1] === ''
                    ? lines.slice(0, -1) : lines;
                  return displayLines.map((line, j) => (
                    <div
                      key={`${i}-${j}`}
                      style={{
                        background: change.added
                          ? tokens.color.diff.added
                          : change.removed
                            ? tokens.color.diff.removed
                            : 'transparent',
                        color: change.added
                          ? tokens.color.diff.addedText
                          : change.removed
                            ? tokens.color.diff.removedText
                            : tokens.color.text.tertiary,
                        padding: '0 16px',
                        whiteSpace: 'pre',
                        lineHeight: '18px',
                      }}
                    >
                      {change.added ? '+' : change.removed ? '−' : ' '}{line}
                    </div>
                  ));
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
