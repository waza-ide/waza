import { useState, useRef, useCallback } from 'react';
import { tokens } from '../styles/tokens.js';

interface ComposerProps {
  currentFile: string | null;
  running: boolean;
  onSubmit: (input: string) => void;
  onStop: () => void;
  currentModel: string;
  onSelectModel: () => void;
}

export function Composer({
  currentFile,
  running,
  onSubmit,
  onStop,
  currentModel,
  onSelectModel,
}: ComposerProps): JSX.Element {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback((): void => {
    if (!input.trim() || running) return;
    onSubmit(input.trim());
    setInput('');
    textareaRef.current?.focus();
  }, [input, running, onSubmit]);

  return (
    <div style={{
      padding: tokens.space.md,
      background: tokens.color.bg.surface,
      borderTop: `1px solid ${tokens.color.bg.border}`,
      flexShrink: 0,
    }}>
      {/* コンテキストファイル表示 */}
      {currentFile && (
        <div style={{
          marginBottom: tokens.space.sm,
          fontSize: tokens.font.size.xs,
          color: tokens.color.text.tertiary,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space.xs,
        }}>
          <span style={{ opacity: 0.5 }}>@</span>
          <span style={{
            color: tokens.color.text.secondary,
            fontFamily: tokens.font.mono,
          }}>
            {currentFile.split('/').pop()}
          </span>
        </div>
      )}

      {/* 入力ボックス */}
      <div style={{
        background: tokens.color.bg.elevated,
        border: `1px solid ${tokens.color.bg.border}`,
        borderRadius: tokens.radius.lg,
        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
        transition: `border-color ${tokens.transition.fast}`,
      }}
        onFocusCapture={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = tokens.color.accent.blue + '66';
        }}
        onBlurCapture={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = tokens.color.bg.border;
        }}
      >
        <textarea
          id="waza-input"
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={running ? '実行中...' : 'Wazaに指示する... (Shift+Enterで改行)'}
          rows={2}
          disabled={running}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: running ? tokens.color.text.tertiary : tokens.color.text.primary,
            fontSize: tokens.font.size.base,
            fontFamily: tokens.font.sans,
            lineHeight: 1.6,
            cursor: running ? 'not-allowed' : 'text',
          }}
        />

        {/* フッター */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: tokens.space.xs,
          gap: tokens.space.sm,
        }}>
          {/* モデル選択 */}
          <button
            id="model-select-btn"
            onClick={onSelectModel}
            style={{
              fontSize: tokens.font.size.xs,
              color: tokens.color.text.tertiary,
              display: 'flex',
              alignItems: 'center',
              gap: tokens.space.xs,
              padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
              borderRadius: tokens.radius.sm,
              background: 'transparent',
              transition: `background ${tokens.transition.fast}, color ${tokens.transition.fast}`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.border;
              (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.secondary;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.tertiary;
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <circle cx="5" cy="5" r="1.5"/>
            </svg>
            <span>{currentModel}</span>
          </button>

          {/* 送信 / 停止 */}
          <div style={{ display: 'flex', gap: tokens.space.xs }}>
            {running ? (
              <button
                id="stop-agent-btn"
                onClick={onStop}
                style={{
                  padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                  background: tokens.color.bg.border,
                  borderRadius: tokens.radius.md,
                  fontSize: tokens.font.size.xs,
                  color: tokens.color.text.secondary,
                  transition: `background ${tokens.transition.fast}`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = tokens.color.accent.red + '33';
                  (e.currentTarget as HTMLButtonElement).style.color = tokens.color.accent.red;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.border;
                  (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.secondary;
                }}
              >
                ⏹ 停止
              </button>
            ) : (
              <>
                <span style={{
                  fontSize: tokens.font.size.xs,
                  color: tokens.color.text.tertiary,
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  ↵
                </span>
                <button
                  id="send-btn"
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  style={{
                    padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                    background: input.trim() ? tokens.color.accent.blue : tokens.color.bg.border,
                    borderRadius: tokens.radius.md,
                    fontSize: tokens.font.size.xs,
                    color: input.trim() ? '#fff' : tokens.color.text.tertiary,
                    transition: `background ${tokens.transition.fast}, color ${tokens.transition.fast}`,
                    cursor: input.trim() ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => {
                    if (input.trim()) {
                      (e.currentTarget as HTMLButtonElement).style.background = tokens.color.accent.blueHover;
                    }
                  }}
                  onMouseLeave={e => {
                    if (input.trim()) {
                      (e.currentTarget as HTMLButtonElement).style.background = tokens.color.accent.blue;
                    }
                  }}
                >
                  送信
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
