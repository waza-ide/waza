import { describe, it, expect } from 'vitest';
import { changesToDiffLines, computeVisibleLines } from '../components/DiffView.test-utils.js';

// NOTE: React DOM レンダリングテストは jsdom 環境が必要なため
// ここではロジック関数を直接テストする

describe('DiffView — myers diff logic', () => {
  it('追加行のみのdiffが正しくparsedされる', () => {
    const changes = [
      { value: 'line1\n', added: false, removed: false },
      { value: 'newline\n', added: true, removed: false },
    ];
    const lines = changesToDiffLines(changes as any);
    const added = lines.filter(l => l.type === 'added');
    expect(added.length).toBe(1);
    expect(added[0]?.content).toBe('newline');
  });

  it('削除行のみのdiffが正しくparsedされる', () => {
    const changes = [
      { value: 'oldline\n', added: false, removed: true },
      { value: 'line2\n', added: false, removed: false },
    ];
    const lines = changesToDiffLines(changes as any);
    const removed = lines.filter(l => l.type === 'removed');
    expect(removed.length).toBe(1);
    expect(removed[0]?.content).toBe('oldline');
  });

  it('diff=空の場合、computeVisibleLinesは空配列を返す', () => {
    const result = computeVisibleLines([]);
    expect(result).toEqual([]);
  });

  it('変更なし行のみのdiffは折りたたまれる（visibleLines空）', () => {
    const lines = [
      { type: 'unchanged' as const, content: 'a', lineNumber: 1 },
      { type: 'unchanged' as const, content: 'b', lineNumber: 2 },
    ];
    const result = computeVisibleLines(lines);
    expect(result).toEqual([]);
  });

  it('変更行の前後CONTEXT_LINES行が表示される', () => {
    const lines = [
      ...Array.from({ length: 10 }, (_, i) => ({
        type: 'unchanged' as const, content: `line${i}`, lineNumber: i + 1,
      })),
      { type: 'added' as const, content: 'changed', lineNumber: 11 },
      ...Array.from({ length: 10 }, (_, i) => ({
        type: 'unchanged' as const, content: `line${i + 11}`, lineNumber: i + 12,
      })),
    ];
    const result = computeVisibleLines(lines);
    // foldエントリが含まれる
    const hasFold = result.some(r => 'count' in r);
    expect(hasFold).toBe(true);
    // 変更行が表示される
    const hasChanged = result.some(r => !('count' in r) && r.type === 'added');
    expect(hasChanged).toBe(true);
  });
});
