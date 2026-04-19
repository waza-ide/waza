import { describe, it, expect } from 'vitest';

// FileTree のロジック部分（ブラウザ非依存）をテスト
// UI部分はE2Eに委ねる

const IGNORE = new Set(['.git', 'node_modules', 'dist', 'out', '.next', '__pycache__', '.DS_Store']);

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

function sortAndFilter(entries: DirEntry[]): DirEntry[] {
  return entries
    .filter(e => !IGNORE.has(e.name))
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

describe('FileTree ロジック', () => {
  it('node_modules / .git が非表示になる', () => {
    const entries: DirEntry[] = [
      { name: 'src', path: '/p/src', isDirectory: true },
      { name: 'node_modules', path: '/p/node_modules', isDirectory: true },
      { name: '.git', path: '/p/.git', isDirectory: true },
      { name: 'index.ts', path: '/p/index.ts', isDirectory: false },
    ];

    const result = sortAndFilter(entries);
    const names = result.map(e => e.name);

    expect(names).not.toContain('node_modules');
    expect(names).not.toContain('.git');
    expect(names).toContain('src');
    expect(names).toContain('index.ts');
  });

  it('dist / out / __pycache__ / .next が非表示になる', () => {
    const entries: DirEntry[] = [
      { name: 'dist', path: '/p/dist', isDirectory: true },
      { name: 'out', path: '/p/out', isDirectory: true },
      { name: '__pycache__', path: '/p/__pycache__', isDirectory: true },
      { name: '.next', path: '/p/.next', isDirectory: true },
      { name: 'src', path: '/p/src', isDirectory: true },
    ];

    const result = sortAndFilter(entries);
    const names = result.map(e => e.name);

    expect(names).toEqual(['src']);
  });

  it('ディレクトリがファイルより先にソートされる', () => {
    const entries: DirEntry[] = [
      { name: 'index.ts', path: '/p/index.ts', isDirectory: false },
      { name: 'src', path: '/p/src', isDirectory: true },
      { name: 'README.md', path: '/p/README.md', isDirectory: false },
      { name: 'lib', path: '/p/lib', isDirectory: true },
    ];

    const result = sortAndFilter(entries);

    // 最初の2つがディレクトリ
    expect(result[0]?.isDirectory).toBe(true);
    expect(result[1]?.isDirectory).toBe(true);
    // 残りがファイル
    expect(result[2]?.isDirectory).toBe(false);
    expect(result[3]?.isDirectory).toBe(false);
  });

  it('アルファベット順でソートされる（ディレクトリ内・ファイル内それぞれ）', () => {
    const entries: DirEntry[] = [
      { name: 'utils', path: '/p/utils', isDirectory: true },
      { name: 'api', path: '/p/api', isDirectory: true },
      { name: 'z.ts', path: '/p/z.ts', isDirectory: false },
      { name: 'a.ts', path: '/p/a.ts', isDirectory: false },
    ];

    const result = sortAndFilter(entries);
    const names = result.map(e => e.name);

    expect(names).toEqual(['api', 'utils', 'a.ts', 'z.ts']);
  });

  it('すべてのIGNOREパターンが除外される', () => {
    const ignoreNames = ['.git', 'node_modules', 'dist', 'out', '.next', '__pycache__', '.DS_Store'];
    const entries: DirEntry[] = ignoreNames.map(name => ({
      name, path: `/p/${name}`, isDirectory: true,
    }));

    const result = sortAndFilter(entries);
    expect(result).toHaveLength(0);
  });
});
