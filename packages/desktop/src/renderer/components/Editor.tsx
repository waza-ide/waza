import MonacoEditor from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
import { detectLanguage } from '../hooks/useEditorTabs.js';

interface OpenFile {
  path: string;
  content: string;
}

interface EditorProps {
  file: OpenFile | null;
  onSave: () => Promise<void>;
  onChange?: (content: string) => void;
}

export function Editor({ file, onSave, onChange }: EditorProps): JSX.Element {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Ctrl+S / Cmd+S で保存
  useEffect(() => {
    async function handleKeyDown(e: KeyboardEvent): Promise<void> {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!file) return;
        setSaving(true);
        setSaved(false);
        try {
          await onSaveRef.current();
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } finally {
          setSaving(false);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file]);

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
      {/* 保存状態インジケーター */}
      {(saving || saved) && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 16,
          fontSize: 11,
          color: saved ? '#3fb950' : '#8b949e',
          zIndex: 10,
          background: '#0d1117',
          padding: '2px 6px',
          borderRadius: 4,
        }}>
          {saving ? '保存中...' : '✓ 保存完了'}
        </div>
      )}

      {/* Monaco Editor */}
      <MonacoEditor
        height="100%"
        theme="vs-dark"
        language={detectLanguage(file.path)}
        value={file.content}
        onMount={editor => { editorRef.current = editor; }}
        onChange={value => onChange?.(value ?? '')}
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
  );
}
