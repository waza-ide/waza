import MonacoEditor from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
import { detectLanguage } from '../hooks/useEditorTabs.js';
import { useTheme } from '../context/ThemeContext.js';
import type { EditorTab } from '../types/editor.js';

interface EditorProps {
  tab: EditorTab | null;
  onChange: (id: string, content: string) => void;
  onSave: (id: string) => Promise<void>;
}

export function Editor({ tab, onChange, onSave }: EditorProps): JSX.Element {
  const { tokens, theme } = useTheme();
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  // Ctrl+S / Cmd+S で保存
  useEffect(() => {
    async function handleKeyDown(e: KeyboardEvent): Promise<void> {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const currentTab = tabRef.current;
        if (!currentTab) return;
        setSaving(true);
        setSaved(false);
        try {
          await onSaveRef.current(currentTab.id);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } finally {
          setSaving(false);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!tab) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tokens.color.text.tertiary,
        flexDirection: 'column',
        gap: tokens.space.md,
        background: tokens.color.bg.base,
      }}>
        <span style={{ fontSize: 48, opacity: 0.08 }}>技</span>
        <span style={{ fontSize: tokens.font.size.base }}>ファイルを選択してください</span>
        <span style={{ fontSize: tokens.font.size.sm, opacity: 0.5 }}>
          ← ツリーからファイルをクリック
        </span>
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
          fontSize: tokens.font.size.xs,
          color: saved ? tokens.color.accent.green : tokens.color.text.tertiary,
          zIndex: 10,
          background: tokens.color.bg.surface,
          padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
          borderRadius: tokens.radius.sm,
          border: `1px solid ${tokens.color.bg.border}`,
        }}>
          {saving ? '保存中...' : '✓ 保存完了'}
        </div>
      )}

      {/* Monaco Editor — テーマ切り替え対応 */}
      <MonacoEditor
        height="100%"
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        language={detectLanguage(tab.path)}
        value={tab.content}
        onMount={editor => { editorRef.current = editor; }}
        onChange={value => onChange(tab.id, value ?? '')}
        options={{
          fontSize: 14,
          fontFamily: tokens.font.mono,
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
          padding: { top: 8 },
        }}
      />
    </div>
  );
}
