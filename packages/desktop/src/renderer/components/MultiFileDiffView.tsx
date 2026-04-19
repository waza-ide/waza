import { diffLines } from 'diff';
import { useState } from 'react';
import type { MultiFileEdit } from '../types/editor.js';

interface MultiFileDiffViewProps {
  edit: MultiFileEdit | null;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptFile: (path: string) => void;
  onRejectFile: (path: string) => void;
}

const acceptBtnStyle = {
  fontSize: 11,
  padding: '2px 8px',
  background: '#238636',
  border: 'none',
  borderRadius: 4,
  color: '#fff',
  cursor: 'pointer',
  flexShrink: 0,
} as const;

const rejectBtnStyle = {
  fontSize: 11,
  padding: '2px 8px',
  background: '#21262d',
  border: '1px solid #30363d',
  borderRadius: 4,
  color: '#c9d1d9',
  cursor: 'pointer',
  flexShrink: 0,
} as const;

export function MultiFileDiffView({
  edit,
  onAcceptAll,
  onRejectAll,
  onAcceptFile,
  onRejectFile,
}: MultiFileDiffViewProps): JSX.Element | null {
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

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: 6,
      overflow: 'hidden',
      margin: 8,
      flexShrink: 0,
    }}>
      {/* ヘッダー */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #21262d',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#8b949e', flex: 1, minWidth: 0 }}>
          {edit.description}
          <span style={{ marginLeft: 6, color: '#58a6ff' }}>
            {edit.files.length}ファイル
          </span>
        </span>
        <button id="accept-all-btn" onClick={onAcceptAll} style={acceptBtnStyle}>
          すべて承認
        </button>
        <button id="reject-all-btn" onClick={onRejectAll} style={rejectBtnStyle}>
          すべて却下
        </button>
      </div>

      {/* ファイルごとのdiff */}
      {edit.files.map(file => {
        const changes = diffLines(file.originalContent, file.newContent);
        const isExpanded = expanded.has(file.path);
        const addCount = changes
          .filter(c => c.added)
          .reduce((n, c) => n + (c.count ?? 0), 0);
        const removeCount = changes
          .filter(c => c.removed)
          .reduce((n, c) => n + (c.count ?? 0), 0);
        const filename = file.path.split('/').pop() ?? file.path;

        return (
          <div key={file.path} style={{ borderBottom: '1px solid #21262d' }}>
            {/* ファイルヘッダー */}
            <div
              onClick={() => toggleExpanded(file.path)}
              style={{
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 12,
                background: '#0d1117',
              }}
            >
              <span style={{ color: '#8b949e', fontSize: 10 }}>
                {isExpanded ? '▾' : '▸'}
              </span>
              <span style={{
                color: '#c9d1d9',
                flex: 1,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {filename}
              </span>
              <span style={{ color: '#3fb950', flexShrink: 0 }}>+{addCount}</span>
              <span style={{ color: '#f85149', flexShrink: 0 }}>−{removeCount}</span>
              <button
                id={`accept-file-${filename}`}
                onClick={e => { e.stopPropagation(); onAcceptFile(file.path); }}
                style={acceptBtnStyle}
              >
                承認
              </button>
              <button
                id={`reject-file-${filename}`}
                onClick={e => { e.stopPropagation(); onRejectFile(file.path); }}
                style={rejectBtnStyle}
              >
                却下
              </button>
            </div>

            {/* diff本体 */}
            {isExpanded && (
              <div style={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: 12,
                maxHeight: 250,
                overflowY: 'auto',
                borderTop: '1px solid #161b22',
              }}>
                {changes.map((change, i) => {
                  const lines = change.value.split('\n');
                  // diffLinesの末尾の空文字（改行後）を除く
                  const displayLines = lines[lines.length - 1] === ''
                    ? lines.slice(0, -1)
                    : lines;
                  return displayLines.map((line, j) => (
                    <div
                      key={`${i}-${j}`}
                      style={{
                        background: change.added
                          ? 'rgba(63,185,80,0.12)'
                          : change.removed
                            ? 'rgba(248,81,73,0.12)'
                            : 'transparent',
                        color: change.added
                          ? '#3fb950'
                          : change.removed
                            ? '#f85149'
                            : '#484f58',
                        padding: '0 16px',
                        whiteSpace: 'pre',
                        lineHeight: '18px',
                      }}
                    >
                      {change.added ? '+' : change.removed ? '−' : ' '}
                      {line}
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
