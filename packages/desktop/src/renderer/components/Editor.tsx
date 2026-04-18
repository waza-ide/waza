import MonacoEditor from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';

interface OpenFile {
  path: string;
  content: string;
}

interface EditorProps {
  file: OpenFile | null;
  onSave: (content: string) => Promise<void>;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust',
    md: 'markdown', json: 'json',
    yaml: 'yaml', yml: 'yaml',
    html: 'html', css: 'css',
    sh: 'shell', toml: 'toml',
    go: 'go', rb: 'ruby',
    java: 'java', cpp: 'cpp', c: 'c',
    cs: 'csharp', php: 'php', swift: 'swift',
    kt: 'kotlin', scala: 'scala',
  };
  return map[ext] ?? 'plaintext';
}

export function Editor({ file, onSave }: EditorProps): JSX.Element {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ctrl+S / Cmd+S で保存
  useEffect(() => {
    async function handleKeyDown(e: KeyboardEvent): Promise<void> {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!editorRef.current || !file) return;
        setSaving(true);
        setSaved(false);
        try {
          await onSave(editorRef.current.getValue());
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } finally {
          setSaving(false);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, file]);

  if (!file) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#484f58',
        flexDirection: 'column',
        gap: 12,
        background: '#0d1117',
      }}>
        <span style={{ fontSize: 48, opacity: 0.3 }}>技</span>
        <span style={{ fontSize: 14 }}>ファイルを選択してください</span>
        <span style={{ fontSize: 12, opacity: 0.5 }}>左のツリーからファイルをクリック</span>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* タブバー */}
      <div style={{
        padding: '0 16px',
        height: 35,
        borderBottom: '1px solid #21262d',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#161b22',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#c9d1d9', opacity: 0.8 }}>
          {file.path.split('/').pop()}
        </span>
        {saving && (
          <span style={{ fontSize: 11, color: '#8b949e' }}>保存中...</span>
        )}
        {saved && (
          <span style={{ fontSize: 11, color: '#3fb950' }}>✓ 保存完了</span>
        )}
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MonacoEditor
          height="100%"
          theme="vs-dark"
          language={detectLanguage(file.path)}
          value={file.content}
          onMount={editor => { editorRef.current = editor; }}
          options={{
            fontSize: 14,
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            fontLigatures: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}
