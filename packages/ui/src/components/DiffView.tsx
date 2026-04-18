import React, { useEffect, useCallback, useMemo } from 'react';
import { diffLines, type Change } from 'diff';

export type DiffLine = {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
};

type DiffViewProps = {
  filePath: string;
  lines: DiffLine[];
};

/**
 * 変更前後の内容をdiffLinesで計算して表示するコンポーネント
 * CONTEXT_LINES行の前後のみ表示し、それ以外は折りたたむ
 */
type DiffViewWithContentProps = {
  filePath: string;
  originalContent: string;
  newContent: string;
  onAccept?: () => void;
  onReject?: () => void;
};

const CONTEXT_LINES = 3;

const lineStyles: Record<DiffLine['type'], React.CSSProperties> = {
  added: {
    background: 'var(--vscode-diffEditor-insertedLineBackground, rgba(0, 200, 100, 0.15))',
    color: 'var(--vscode-terminal-ansiGreen, #3fb950)',
  },
  removed: {
    background: 'var(--vscode-diffEditor-removedLineBackground, rgba(200, 50, 50, 0.15))',
    color: 'var(--vscode-editorError-foreground, #f85149)',
  },
  unchanged: {
    color: 'var(--vscode-foreground, #c9d1d9)',
  },
};

const linePrefix: Record<DiffLine['type'], string> = {
  added: '+',
  removed: '-',
  unchanged: ' ',
};

/**
 * 変更のある行インデックスのセットを作成し、
 * 各行が表示すべきかどうかを判定する
 */
function computeVisibleLines(lines: DiffLine[]): (DiffLine | { type: 'fold'; count: number })[] {
  if (lines.length === 0) return [];

  const changedIndices = new Set<number>();
  lines.forEach((line, i) => {
    if (line.type !== 'unchanged') {
      changedIndices.add(i);
    }
  });

  if (changedIndices.size === 0) return [];

  const visible = new Set<number>();
  changedIndices.forEach((idx) => {
    for (let d = -CONTEXT_LINES; d <= CONTEXT_LINES; d++) {
      const target = idx + d;
      if (target >= 0 && target < lines.length) {
        visible.add(target);
      }
    }
  });

  const result: (DiffLine | { type: 'fold'; count: number })[] = [];
  let i = 0;
  while (i < lines.length) {
    if (visible.has(i)) {
      result.push(lines[i]!);
      i++;
    } else {
      let count = 0;
      while (i < lines.length && !visible.has(i)) {
        count++;
        i++;
      }
      result.push({ type: 'fold', count });
    }
  }
  return result;
}

/**
 * diff Changeを DiffLine[] に変換する
 */
function changesToDiffLines(changes: Change[]): DiffLine[] {
  const lines: DiffLine[] = [];
  let beforeLine = 1;
  let afterLine = 1;

  for (const change of changes) {
    const changeLines = change.value.replace(/\n$/, '').split('\n');
    if (change.removed) {
      for (const content of changeLines) {
        lines.push({ type: 'removed', content, lineNumber: beforeLine++ });
      }
    } else if (change.added) {
      for (const content of changeLines) {
        lines.push({ type: 'added', content, lineNumber: afterLine++ });
      }
    } else {
      for (const content of changeLines) {
        lines.push({ type: 'unchanged', content, lineNumber: beforeLine++ });
        afterLine++;
      }
    }
  }
  return lines;
}

/**
 * originalContent / newContent から差分を計算して表示するコンポーネント
 * キーボードショートカット: y=Accept, n=Reject
 */
export function DiffViewWithContent({
  filePath,
  originalContent,
  newContent,
  onAccept,
  onReject,
}: DiffViewWithContentProps): React.ReactElement | null {
  const changes = useMemo(() => diffLines(originalContent, newContent), [originalContent, newContent]);
  const allLines = useMemo(() => changesToDiffLines(changes), [changes]);
  const visibleLines = useMemo(() => computeVisibleLines(allLines), [allLines]);

  const handleAccept = useCallback(() => onAccept?.(), [onAccept]);
  const handleReject = useCallback(() => onReject?.(), [onReject]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'y') handleAccept();
      if (e.key === 'n') handleReject();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleAccept, handleReject]);

  // 差分なし
  if (visibleLines.length === 0) return null;

  return (
    <div style={{
      fontFamily: 'var(--vscode-editor-font-family, monospace)',
      fontSize: 'var(--vscode-editor-font-size, 13px)',
      border: '1px solid var(--vscode-panel-border, #30363d)',
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      {/* ファイル名ヘッダー */}
      <div style={{
        padding: '6px 12px',
        background: 'var(--vscode-editorGroupHeader-tabsBackground, #161b22)',
        borderBottom: '1px solid var(--vscode-panel-border, #30363d)',
        fontSize: '0.8em',
        opacity: 0.85,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>{filePath}</span>
        {(onAccept || onReject) && (
          <span style={{ fontSize: '0.9em', opacity: 0.6 }}>[y] Accept  [n] Reject</span>
        )}
      </div>

      {/* diff行表示 */}
      <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
        {visibleLines.map((item, idx) => {
          if ('count' in item) {
            return (
              <div key={`fold-${idx}`} style={{
                padding: '2px 8px',
                color: 'var(--vscode-foreground, #c9d1d9)',
                opacity: 0.4,
                fontSize: '0.9em',
                background: 'var(--vscode-editor-background, #0d1117)',
                userSelect: 'none',
              }}>
                ... {item.count} lines ...
              </div>
            );
          }
          return (
            <div
              key={`${item.lineNumber}-${item.type}`}
              style={{
                ...lineStyles[item.type],
                display: 'flex',
                padding: '1px 8px',
                whiteSpace: 'pre',
              }}
            >
              <span style={{ minWidth: '32px', opacity: 0.5, userSelect: 'none' }}>
                {item.lineNumber}
              </span>
              <span style={{ minWidth: '16px', opacity: 0.7 }}>
                {linePrefix[item.type]}
              </span>
              <span>{item.content}</span>
            </div>
          );
        })}
      </div>

      {/* Accept/Rejectボタン */}
      {(onAccept || onReject) && (
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--vscode-panel-border, #30363d)',
          display: 'flex',
          gap: 8,
          background: 'var(--vscode-editorGroupHeader-tabsBackground, #161b22)',
        }}>
          {onAccept && (
            <button
              onClick={handleAccept}
              style={{
                padding: '4px 12px',
                background: '#238636',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ✓ Accept (y)
            </button>
          )}
          {onReject && (
            <button
              onClick={handleReject}
              style={{
                padding: '4px 12px',
                background: '#21262d',
                border: '1px solid #30363d',
                borderRadius: 4,
                color: '#c9d1d9',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ✗ Reject (n)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * DiffLine[] を受け取る既存API互換コンポーネント
 */
export function DiffView({ filePath, lines }: DiffViewProps): React.ReactElement {
  return (
    <div style={{
      fontFamily: 'var(--vscode-editor-font-family, monospace)',
      fontSize: '0.85rem',
      border: '1px solid var(--vscode-panel-border)',
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '6px 12px',
        background: 'var(--vscode-editorGroupHeader-tabsBackground)',
        borderBottom: '1px solid var(--vscode-panel-border)',
        fontSize: '0.8rem',
        opacity: 0.8,
      }}>
        {filePath}
      </div>
      <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
        {lines.map((line) => (
          <div
            key={`${line.lineNumber}-${line.type}`}
            style={{
              ...lineStyles[line.type],
              display: 'flex',
              padding: '1px 8px',
              whiteSpace: 'pre',
            }}
          >
            <span style={{ minWidth: '32px', opacity: 0.5, userSelect: 'none' }}>
              {line.lineNumber}
            </span>
            <span style={{ minWidth: '16px', opacity: 0.7 }}>
              {linePrefix[line.type]}
            </span>
            <span>{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
