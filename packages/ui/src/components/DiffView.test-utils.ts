/**
 * DiffView コンポーネントのロジック関数をテスト用にエクスポートするモジュール
 */
import { type Change } from 'diff';

export type DiffLine = {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
};

/**
 * diff Changeを DiffLine[] に変換する（テスト用エクスポート）
 */
export function changesToDiffLines(changes: Change[]): DiffLine[] {
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

const CONTEXT_LINES = 3;

/**
 * 変更行の前後CONTEXT_LINES行のみ表示する折りたたみロジック（テスト用エクスポート）
 */
export function computeVisibleLines(
  lines: DiffLine[]
): (DiffLine | { type: 'fold'; count: number })[] {
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
