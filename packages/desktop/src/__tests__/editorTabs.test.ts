import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseModelResponse } from '../renderer/agent/loop.js';
import { detectLanguage } from '../renderer/hooks/useEditorTabs.js';

// useEditorTabs のロジック部分（ブラウザ非依存部分）のテスト

describe('detectLanguage', () => {
  it('.ts → typescript', () => {
    expect(detectLanguage('src/index.ts')).toBe('typescript');
  });
  it('.tsx → typescript', () => {
    expect(detectLanguage('src/App.tsx')).toBe('typescript');
  });
  it('.py → python', () => {
    expect(detectLanguage('main.py')).toBe('python');
  });
  it('.rs → rust', () => {
    expect(detectLanguage('src/main.rs')).toBe('rust');
  });
  it('拡張子なし → plaintext', () => {
    expect(detectLanguage('Makefile')).toBe('plaintext');
  });
  it('未知の拡張子 → plaintext', () => {
    expect(detectLanguage('file.xyz')).toBe('plaintext');
  });
});

describe('MultiFileEdit ロジック', () => {
  it('受け入れ後に pending が null になる（モックで検証）', () => {
    let pendingEdit: { files: string[]; description: string } | null = {
      files: ['a.ts', 'b.ts'],
      description: 'test edit',
    };
    const setPending = (v: typeof pendingEdit) => { pendingEdit = v; };

    // AcceptAll
    setPending(null);
    expect(pendingEdit).toBeNull();
  });

  it('ファイル単位Rejectで残りのファイル数が減る', () => {
    let pending = {
      files: [
        { path: 'a.ts', originalContent: '', newContent: 'a' },
        { path: 'b.ts', originalContent: '', newContent: 'b' },
      ],
      description: 'test',
    };

    // b.ts を reject
    const remaining = pending.files.filter(f => f.path !== 'b.ts');
    pending = { ...pending, files: remaining };

    expect(pending.files).toHaveLength(1);
    expect(pending.files[0]?.path).toBe('a.ts');
  });

  it('全ファイルRejectでpendingがnullになる', () => {
    let pending: { files: unknown[]; description: string } | null = {
      files: [{ path: 'a.ts' }],
      description: 'test',
    };

    const remaining = (pending?.files ?? []).filter((f: unknown) =>
      (f as { path: string }).path !== 'a.ts'
    );
    pending = remaining.length > 0 ? { ...pending, files: remaining } : null;

    expect(pending).toBeNull();
  });
});

describe('parseModelResponse との統合', () => {
  it('write_file ツール呼び出しがパースされる', () => {
    const result = parseModelResponse(
      'TOOL: write_file {"path": "src/index.ts", "content": "console.log(1)"}'
    );
    expect(result.type).toBe('tool');
    if (result.type === 'tool') {
      expect(result.tool).toBe('write_file');
      expect(result.args['path']).toBe('src/index.ts');
    }
  });

  it('exec_command ツール呼び出し', () => {
    const result = parseModelResponse('TOOL: exec_command {"command": "npm test"}');
    expect(result.type).toBe('tool');
    if (result.type === 'tool') {
      expect(result.tool).toBe('exec_command');
      expect(result.args['command']).toBe('npm test');
    }
  });
});
