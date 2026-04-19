import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext.js';

export const AVAILABLE_MODELS = [
  { id: 'auto',              label: 'auto',          desc: 'Local-first auto select',     dot: null },
  { id: 'cocoro',            label: 'Qwen 2.5-72B',  desc: 'MetaDataLab - Local',        dot: '#22c55e' },
  { id: 'ollama/llama3.2',   label: 'Ollama',        desc: 'Local CPU/GPU',               dot: '#a78bfa' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet', desc: 'Anthropic · Cloud',           dot: '#f97316' },
  { id: 'claude-opus-4-6',   label: 'Claude Opus',   desc: 'Anthropic · Cloud',           dot: '#f97316' },
  { id: 'gemini-2.0-flash',  label: 'Gemini 2.0',    desc: 'Google · Cloud',              dot: '#3b82f6' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

interface ComposerProps {
  currentFile: string | null;
  running: boolean;
  onSubmit: (input: string, modelId: ModelId) => void;
  onStop: () => void;
}

// ──────────────────────────────────────────
// Portal-based dropdown (renders at body level, never clipped)
// ──────────────────────────────────────────
interface DropdownPortalProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function DropdownPortal({ anchorRef, open, onClose, children }: DropdownPortalProps): JSX.Element | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    function updateRect(): void {
      if (anchorRef.current) {
        setRect(anchorRef.current.getBoundingClientRect());
      }
    }
    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent): void {
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, onClose, anchorRef]);

  if (!open || !rect) return null;

  const DROPDOWN_WIDTH = 240;
  const DROPDOWN_APPROX_HEIGHT = AVAILABLE_MODELS.length * 50 + 8;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUpward = spaceAbove > DROPDOWN_APPROX_HEIGHT || spaceAbove > spaceBelow;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(8, Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 8)),
    width: DROPDOWN_WIDTH,
    zIndex: 9999,
    ...(openUpward
      ? { bottom: window.innerHeight - rect.top + 4 }
      : { top: rect.bottom + 4 }),
  };

  return createPortal(
    <div style={style} onMouseDown={e => e.stopPropagation()}>
      {children}
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────
// Main Composer — model selector at bottom, + button left of model
// ──────────────────────────────────────────
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
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === modelId) ?? AVAILABLE_MODELS[0];

  const handleSubmit = useCallback((): void => {
    if (!input.trim() || running) return;
    onSubmit(input.trim(), modelId);
    setInput('');
    textareaRef.current?.focus();
  }, [input, running, onSubmit, modelId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const closeDropdown = useCallback(() => setShowModelPicker(false), []);
  const toggleDropdown = useCallback(() => setShowModelPicker(p => !p), []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  return (
    <div style={{
      padding: `${tokens.space.sm}px ${tokens.space.xl}px ${tokens.space.md}px`,
      background: tokens.color.bg.base,
      flexShrink: 0,
    }}>
      {/* Context file chip */}
      {currentFile && (
        <div style={{
          marginBottom: tokens.space.xs,
          display: 'flex',
          gap: tokens.space.xs,
          alignItems: 'center',
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: tokens.radius.full,
            border: `1px solid ${tokens.color.bg.border}`,
            fontSize: tokens.font.size.xs,
            color: tokens.color.text.secondary,
            fontFamily: tokens.font.mono,
            background: tokens.color.bg.sidebar,
          }}>
            <span style={{ opacity: 0.5 }}>@</span>
            {currentFile.split('/').pop()}
          </span>
        </div>
      )}

      {/* Main input box */}
      <div style={{
        border: `1px solid ${tokens.color.bg.border}`,
        borderRadius: tokens.radius.xl,
        background: tokens.color.bg.sidebar,
        transition: `border-color ${tokens.transition.fast}, box-shadow ${tokens.transition.fast}`,
      }}
        onFocusCapture={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = tokens.color.accent.blue + '55';
          el.style.boxShadow = `0 0 0 3px ${tokens.color.accent.blue}12`;
        }}
        onBlurCapture={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = tokens.color.bg.border;
          el.style.boxShadow = 'none';
        }}
      >
        {/* Textarea — at the top */}
        <div style={{
          padding: `${tokens.space.sm}px ${tokens.space.md}px 0`,
        }}>
          <textarea
            id="waza-input"
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={running ? 'Running...' : 'Ask Waza…'}
            disabled={running}
            rows={1}
            style={{
              width: '100%',
              minHeight: 28,
              maxHeight: 200,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              color: running ? tokens.color.text.tertiary : tokens.color.text.primary,
              fontSize: tokens.font.size.base,
              fontFamily: tokens.font.sans,
              lineHeight: 1.6,
              cursor: running ? 'not-allowed' : 'text',
            }}
          />
        </div>

        {/* BOTTOM ROW: + button, model selector, send/stop */}
        <div style={{
          padding: `${tokens.space.xs}px ${tokens.space.md}px ${tokens.space.sm}px`,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space.xs,
        }}>
          {/* Attach button — left of model selector */}
          <button
            id="composer-attach-btn"
            title="Attach file (coming soon)"
            disabled
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: tokens.radius.full,
              border: `1px solid ${tokens.color.bg.border}`,
              color: tokens.color.text.tertiary,
              fontSize: 14,
              opacity: 0.4,
              background: 'transparent',
              cursor: 'not-allowed',
            }}
          >
            +
          </button>

          {/* Model pill button */}
          <button
            id="model-select-btn"
            ref={modelBtnRef}
            onClick={toggleDropdown}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: tokens.radius.full,
              border: `1px solid ${tokens.color.bg.border}`,
              fontSize: tokens.font.size.xs,
              fontWeight: tokens.font.weight.medium,
              color: tokens.color.text.secondary,
              background: showModelPicker ? tokens.color.bg.active : tokens.color.bg.base,
              cursor: 'pointer',
              transition: `background ${tokens.transition.fast}`,
              userSelect: 'none',
            }}
            onMouseEnter={e => {
              if (!showModelPicker)
                (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
            }}
            onMouseLeave={e => {
              if (!showModelPicker)
                (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.base;
            }}
          >
            {/* Color dot for non-auto models */}
            {selectedModel.dot && (
              <span style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: selectedModel.dot,
                flexShrink: 0,
              }} />
            )}
            <span>{selectedModel.label}</span>
            <span style={{ opacity: 0.4, fontSize: 8, marginLeft: 1 }}>▾</span>
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Send / Stop button — right side */}
          {running ? (
            <button
              id="stop-agent-btn"
              onClick={onStop}
              title="Stop"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 12px',
                borderRadius: tokens.radius.full,
                border: `1px solid ${tokens.color.bg.border}`,
                fontSize: tokens.font.size.xs,
                color: tokens.color.text.secondary,
                background: tokens.color.bg.active,
                cursor: 'pointer',
                transition: `background ${tokens.transition.fast}`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = tokens.color.accent.red + '18';
                (e.currentTarget as HTMLButtonElement).style.color = tokens.color.accent.red;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.active;
                (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.secondary;
              }}
            >
              <span style={{ fontSize: 10 }}>■</span>
              Stop
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
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: input.trim()
                  ? tokens.color.text.accent
                  : tokens.color.bg.active,
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

      {/* Hint text */}
      <div style={{
        marginTop: tokens.space.xs,
        fontSize: tokens.font.size.xs,
        color: tokens.color.text.tertiary,
        textAlign: 'center',
        opacity: 0.6,
      }}>
        Enter to send · Shift+Enter for new line
      </div>

      {/* Portal dropdown — never clipped by parent overflow:hidden */}
      <DropdownPortal
        anchorRef={modelBtnRef}
        open={showModelPicker}
        onClose={closeDropdown}
      >
        <div style={{
          background: tokens.color.bg.elevated,
          border: `1px solid ${tokens.color.bg.border}`,
          borderRadius: tokens.radius.lg,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          animation: 'fadeIn 80ms ease',
        }}>
          <div style={{
            padding: `${tokens.space.xs}px ${tokens.space.md}px`,
            borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
            fontSize: tokens.font.size.xs,
            color: tokens.color.text.tertiary,
            fontWeight: tokens.font.weight.medium,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            Model
          </div>
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
                alignItems: 'center',
                gap: tokens.space.sm,
                background: model.id === modelId ? tokens.color.bg.active : 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                transition: `background ${tokens.transition.fast}`,
              }}
              onMouseEnter={e => {
                if (model.id !== modelId)
                  (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  model.id === modelId ? tokens.color.bg.active : 'transparent';
              }}
            >
              {/* Color dot */}
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                background: model.dot ?? tokens.color.text.tertiary,
                opacity: model.dot ? 1 : 0.3,
              }} />
              <span style={{ flex: 1 }}>
                <span style={{
                  display: 'block',
                  fontSize: tokens.font.size.sm,
                  color: tokens.color.text.primary,
                  fontWeight: model.id === modelId
                    ? tokens.font.weight.medium
                    : tokens.font.weight.normal,
                }}>
                  {model.label}
                </span>
                <span style={{
                  display: 'block',
                  fontSize: tokens.font.size.xs,
                  color: tokens.color.text.tertiary,
                  marginTop: 1,
                }}>
                  {model.desc}
                </span>
              </span>
              {model.id === modelId && (
                <span style={{ fontSize: 10, color: tokens.color.text.tertiary, flexShrink: 0 }}>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </DropdownPortal>
    </div>
  );
}
