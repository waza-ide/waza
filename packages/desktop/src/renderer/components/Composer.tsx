import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.js';

export const AVAILABLE_MODELS = [
  { id: 'auto',              label: 'auto',             desc: 'Local-first auto select' },
  { id: 'cocoro',            label: 'cocoro-OS',        desc: 'Qwen 2.5 72B · Local GPU' },
  { id: 'ollama/llama3.2',   label: 'Llama 3.2',        desc: 'Ollama · Local' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet',    desc: 'Anthropic · Cloud' },
  { id: 'claude-opus-4-6',   label: 'Claude Opus',      desc: 'Anthropic · Cloud' },
  { id: 'gemini-2.0-flash',  label: 'Gemini 2.0 Flash', desc: 'Google · Cloud' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

interface ComposerProps {
  currentFile: string | null;
  running: boolean;
  onSubmit: (input: string, modelId: ModelId) => void;
  onStop: () => void;
}

export function Composer({
  currentFile,
  running,
  onSubmit,
  onStop,
}: ComposerProps): JSX.Element {
  const { tokens } = useTheme();
  const [input, setInput] = useState('');
  const [modelId, setModelId] = useState<ModelId>('auto');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === modelId) ?? AVAILABLE_MODELS[0];

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback((): void => {
    if (!input.trim() || running) return;
    onSubmit(input.trim(), modelId);
    setInput('');
    textareaRef.current?.focus();
  }, [input, running, onSubmit, modelId]);

  // Calculate dropdown position — always open ABOVE the button
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!showModelPicker || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dropdownH = AVAILABLE_MODELS.length * 52 + 8; // approx height
    setDropdownStyle({
      position: 'fixed',
      bottom: window.innerHeight - rect.top + 6,
      left: rect.left,
      width: Math.max(210, rect.width),
      zIndex: 1000,
    });
    void dropdownH; // suppress unused
  }, [showModelPicker]);

  return (
    <div style={{
      padding: `${tokens.space.md}px ${tokens.space.xl}px`,
      background: tokens.color.bg.base,
      flexShrink: 0,
    }}>
      {/* Context file indicator */}
      {currentFile && (
        <div style={{
          marginBottom: tokens.space.sm,
          fontSize: tokens.font.size.xs,
          color: tokens.color.text.tertiary,
        }}>
          <span style={{ color: tokens.color.text.secondary, fontFamily: tokens.font.mono }}>
            @ {currentFile.split('/').pop()}
          </span>
        </div>
      )}

      {/* Input box */}
      <div style={{
        border: `1px solid ${tokens.color.bg.border}`,
        borderRadius: tokens.radius.xl,
        background: tokens.color.bg.sidebar,
        overflow: 'hidden',
        transition: `border-color ${tokens.transition.fast}`,
      }}
        onFocusCapture={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor =
            tokens.color.accent.blue + '66';
        }}
        onBlurCapture={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor =
            tokens.color.bg.border;
        }}
      >
        {/* Textarea */}
        <div style={{ padding: `${tokens.space.md}px ${tokens.space.lg}px ${tokens.space.sm}px` }}>
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
            placeholder={running ? 'Running...' : 'Ask Waza...'}
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
        </div>

        {/* Footer row */}
        <div style={{
          padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1px solid ${tokens.color.bg.borderSub}`,
        }}>
          {/* Left: + button + model selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.space.sm,
          }}>
            {/* Attach button (future) */}
            <button
              id="composer-attach-btn"
              title="Attach file (coming soon)"
              disabled
              style={{
                width: 24,
                height: 24,
                borderRadius: tokens.radius.full,
                border: `1px solid ${tokens.color.bg.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.color.text.tertiary,
                fontSize: 15,
                opacity: 0.45,
              }}
            >
              +
            </button>

            {/* Model picker */}
            <div ref={pickerRef} style={{ position: 'relative' }}>
              <button
                id="model-select-btn"
                ref={btnRef}
                onClick={() => setShowModelPicker(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.space.xs,
                  padding: `3px ${tokens.space.sm}px`,
                  borderRadius: tokens.radius.full,
                  border: `1px solid ${tokens.color.bg.border}`,
                  fontSize: tokens.font.size.xs,
                  color: tokens.color.text.secondary,
                  background: showModelPicker ? tokens.color.bg.active : 'transparent',
                  cursor: 'pointer',
                  transition: `background ${tokens.transition.fast}`,
                }}
                onMouseEnter={e => {
                  if (!showModelPicker)
                    (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
                }}
                onMouseLeave={e => {
                  if (!showModelPicker)
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span>{selectedModel.label}</span>
                <span style={{ opacity: 0.45, fontSize: 8 }}>▾</span>
              </button>

              {/* Dropdown panel — position:fixed so it's never clipped */}
              {showModelPicker && (
                <div style={{
                  ...dropdownStyle,
                  background: tokens.color.bg.elevated,
                  border: `1px solid ${tokens.color.bg.border}`,
                  borderRadius: tokens.radius.lg,
                  overflow: 'hidden',
                  boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
                  minWidth: 220,
                  animation: 'fadeIn 80ms ease',
                }}>
                  {AVAILABLE_MODELS.map(model => (
                    <button
                      key={model.id}
                      id={`model-opt-${model.id.replace(/\//g, '-')}`}
                      onClick={() => {
                        setModelId(model.id);
                        setShowModelPicker(false);
                      }}
                      style={{
                        width: '100%',
                        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 1,
                        background: model.id === modelId
                          ? tokens.color.bg.active
                          : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: `background ${tokens.transition.fast}`,
                      }}
                      onMouseEnter={e => {
                        if (model.id !== modelId)
                          (e.currentTarget as HTMLButtonElement).style.background =
                            tokens.color.bg.hover;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          model.id === modelId ? tokens.color.bg.active : 'transparent';
                      }}
                    >
                      <span style={{
                        fontSize: tokens.font.size.sm,
                        color: tokens.color.text.primary,
                        fontWeight: model.id === modelId
                          ? tokens.font.weight.medium
                          : tokens.font.weight.normal,
                      }}>
                        {model.label}
                      </span>
                      <span style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.tertiary }}>
                        {model.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Stop / Send */}
          {running ? (
            <button
              id="stop-agent-btn"
              onClick={onStop}
              title="Stop"
              style={{
                width: 28,
                height: 28,
                borderRadius: tokens.radius.full,
                background: tokens.color.bg.active,
                border: `1px solid ${tokens.color.bg.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.color.text.secondary,
                fontSize: 11,
                cursor: 'pointer',
                transition: `background ${tokens.transition.fast}`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  tokens.color.accent.red + '22';
                (e.currentTarget as HTMLButtonElement).style.color =
                  tokens.color.accent.red;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  tokens.color.bg.active;
                (e.currentTarget as HTMLButtonElement).style.color =
                  tokens.color.text.secondary;
              }}
            >
              □
            </button>
          ) : (
            <button
              id="send-btn"
              onClick={handleSubmit}
              disabled={!input.trim()}
              title="Send (Enter)"
              style={{
                width: 28,
                height: 28,
                borderRadius: tokens.radius.full,
                background: input.trim()
                  ? tokens.color.text.accent
                  : tokens.color.bg.active,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: input.trim()
                  ? tokens.color.text.inverse
                  : tokens.color.text.tertiary,
                fontSize: 14,
                cursor: input.trim() ? 'pointer' : 'default',
                transition: `background ${tokens.transition.fast}`,
              }}
            >
              ↑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
