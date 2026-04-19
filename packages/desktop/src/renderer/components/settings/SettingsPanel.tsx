/**
 * SettingsPanel — "Waza — Settings" modal dialog
 * Opened by clicking the cocoro indicator in the StatusBar.
 * Renders via createPortal at document.body (above all other layers).
 */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext.js';
import { useSettings } from '../../context/SettingsContext.js';
import type { WazaSettings, AppTheme, DefaultModel } from '../../context/SettingsContext.js';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Small primitives
// ─────────────────────────────────────────────

function Row({ label, hint, children }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  const { tokens } = useTheme();
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      paddingBottom: tokens.space.md,
    }}>
      <label style={{
        fontSize: tokens.font.size.sm,
        fontWeight: tokens.font.weight.medium,
        color: tokens.color.text.primary,
      }}>
        {label}
      </label>
      {hint && (
        <span style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.tertiary }}>
          {hint}
        </span>
      )}
      {children}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = 'text', monospace = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  monospace?: boolean;
}): JSX.Element {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '7px 10px',
        borderRadius: tokens.radius.md,
        border: `1px solid ${focused ? tokens.color.accent.blue + '88' : tokens.color.bg.border}`,
        background: tokens.color.bg.base,
        color: tokens.color.text.primary,
        fontSize: tokens.font.size.sm,
        fontFamily: monospace ? tokens.font.mono : tokens.font.sans,
        outline: 'none',
        boxShadow: focused ? `0 0 0 3px ${tokens.color.accent.blue}18` : 'none',
        transition: 'border-color 80ms, box-shadow 80ms',
        boxSizing: 'border-box',
      }}
    />
  );
}

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}): JSX.Element {
  const { tokens } = useTheme();
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '7px 10px',
        borderRadius: tokens.radius.md,
        border: `1px solid ${tokens.color.bg.border}`,
        background: tokens.color.bg.base,
        color: tokens.color.text.primary,
        fontSize: tokens.font.size.sm,
        fontFamily: tokens.font.sans,
        outline: 'none',
        cursor: 'pointer',
        boxSizing: 'border-box',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none' stroke='%23999' strokeWidth='1.5'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: 28,
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ value, onChange, label }: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}): JSX.Element {
  const { tokens } = useTheme();
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: tokens.space.sm,
      cursor: 'pointer',
    }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: tokens.radius.full,
          background: value ? tokens.color.accent.blue : tokens.color.bg.border,
          position: 'relative',
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'background 150ms ease',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 2,
          left: value ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transition: 'left 150ms ease',
        }} />
      </div>
      <span style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>
        {label}
      </span>
    </label>
  );
}

function NumberInput({ value, onChange, min, max }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}): JSX.Element {
  const { tokens } = useTheme();
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={e => {
        const n = parseInt(e.target.value, 10);
        if (!isNaN(n)) onChange(n);
      }}
      style={{
        width: 80,
        padding: '7px 10px',
        borderRadius: tokens.radius.md,
        border: `1px solid ${tokens.color.bg.border}`,
        background: tokens.color.bg.base,
        color: tokens.color.text.primary,
        fontSize: tokens.font.size.sm,
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: tokens.font.mono,
      }}
    />
  );
}

// ─────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────

type Section = 'appearance' | 'models' | 'agent' | 'editor' | 'about';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance',    icon: '◑' },
  { id: 'models',     label: 'Models & APIs', icon: '◎' },
  { id: 'agent',      label: 'Agent',         icon: '▶' },
  { id: 'editor',     label: 'Editor',        icon: '≡' },
  { id: 'about',      label: 'About',         icon: 'ℹ' },
];

// ─────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────

export function SettingsPanel({ open, onClose }: SettingsPanelProps): JSX.Element | null {
  const { tokens, theme, toggleTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useSettings();
  const [section, setSection] = useState<Section>('appearance');
  const [draft, setDraft] = useState<WazaSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  // Sync draft when panel opens
  useEffect(() => {
    if (open) setDraft({ ...settings });
  }, [open, settings]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const set = useCallback(<K extends keyof WazaSettings>(key: K, val: WazaSettings[K]): void => {
    setDraft(prev => ({ ...prev, [key]: val }));
  }, []);

  function handleSave(): void {
    updateSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset(): void {
    if (confirm('Reset all settings to defaults?')) {
      resetSettings();
      setDraft({ ...settings });
    }
  }

  if (!open) return null;

  // ── Sidebar nav style ──
  const navItemStyle = (active: boolean): React.CSSProperties => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: `7px ${tokens.space.md}px`,
    borderRadius: tokens.radius.md,
    fontSize: tokens.font.size.sm,
    fontWeight: active ? tokens.font.weight.medium : tokens.font.weight.normal,
    color: active ? tokens.color.text.primary : tokens.color.text.secondary,
    background: active ? tokens.color.bg.active : 'transparent',
    cursor: 'pointer',
    border: 'none',
    textAlign: 'left',
    transition: `background ${tokens.transition.fast}`,
  });

  const sectionTitle = (title: string): JSX.Element => (
    <div style={{
      fontSize: tokens.font.size.xs,
      fontWeight: tokens.font.weight.semibold,
      color: tokens.color.text.tertiary,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      marginBottom: tokens.space.md,
      paddingBottom: tokens.space.xs,
      borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
    }}>
      {title}
    </div>
  );

  // ── Section content ──
  function renderContent(): JSX.Element {
    switch (section) {

      case 'appearance':
        return (
          <div>
            {sectionTitle('Appearance')}
            <Row label="Theme" hint="Controls the color scheme of the application">
              <Select
                value={draft.theme}
                onChange={v => {
                  set('theme', v as AppTheme);
                  // Apply immediately as preview
                  if (v === 'dark' && theme === 'light') toggleTheme();
                  if (v === 'light' && theme === 'dark') toggleTheme();
                }}
                options={[
                  { value: 'system', label: 'System (follow OS)' },
                  { value: 'light',  label: 'Light' },
                  { value: 'dark',   label: 'Dark' },
                ]}
              />
            </Row>
          </div>
        );

      case 'models':
        return (
          <div>
            {sectionTitle('Models & APIs')}

            {/* cocoro-llm-server */}
            <div style={{
              padding: tokens.space.md,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.bg.border}`,
              background: tokens.color.bg.surface,
              marginBottom: tokens.space.lg,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.space.sm,
                marginBottom: tokens.space.md,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#22c55e', flexShrink: 0,
                  boxShadow: '0 0 5px #22c55e',
                }} />
                <span style={{
                  fontSize: tokens.font.size.sm,
                  fontWeight: tokens.font.weight.semibold,
                  color: tokens.color.text.primary,
                }}>
                  cocoro-llm-server
                </span>
                <span style={{
                  fontSize: tokens.font.size.xs,
                  color: tokens.color.text.tertiary,
                  marginLeft: 'auto',
                }}>
                  Qwen 2.5 72B AWQ · RTX PRO 6000
                </span>
              </div>
              <Row label="Base URL">
                <Input
                  value={draft.cocoroBaseUrl}
                  onChange={v => set('cocoroBaseUrl', v)}
                  placeholder="http://192.168.50.112:8000/v1"
                  monospace
                />
              </Row>
              <Row label="API Key">
                <Input
                  value={draft.cocoroApiKey}
                  onChange={v => set('cocoroApiKey', v)}
                  placeholder="mdl-llm-2026"
                  type="password"
                  monospace
                />
              </Row>
              <Row label="Model alias">
                <Input
                  value={draft.cocoroModel}
                  onChange={v => set('cocoroModel', v)}
                  placeholder="gpt-4o"
                  monospace
                />
              </Row>
            </div>

            {/* Ollama */}
            <div style={{
              padding: tokens.space.md,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.bg.border}`,
              background: tokens.color.bg.surface,
              marginBottom: tokens.space.lg,
            }}>
              <div style={{
                fontSize: tokens.font.size.sm,
                fontWeight: tokens.font.weight.semibold,
                color: tokens.color.text.primary,
                marginBottom: tokens.space.md,
                display: 'flex',
                alignItems: 'center',
                gap: tokens.space.sm,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#a78bfa', flexShrink: 0,
                }} />
                Ollama (Local)
              </div>
              <Row label="Base URL">
                <Input
                  value={draft.ollamaBaseUrl}
                  onChange={v => set('ollamaBaseUrl', v)}
                  placeholder="http://localhost:11434"
                  monospace
                />
              </Row>
              <Row label="Default model">
                <Input
                  value={draft.ollamaModel}
                  onChange={v => set('ollamaModel', v)}
                  placeholder="llama3.2"
                  monospace
                />
              </Row>
            </div>

            {/* Anthropic */}
            <div style={{
              padding: tokens.space.md,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.bg.border}`,
              background: tokens.color.bg.surface,
              marginBottom: tokens.space.lg,
            }}>
              <div style={{
                fontSize: tokens.font.size.sm,
                fontWeight: tokens.font.weight.semibold,
                color: tokens.color.text.primary,
                marginBottom: tokens.space.md,
                display: 'flex',
                alignItems: 'center',
                gap: tokens.space.sm,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#f97316', flexShrink: 0,
                }} />
                Claude (Anthropic)
              </div>
              <Row label="API Key" hint="Get yours at console.anthropic.com">
                <Input
                  value={draft.anthropicApiKey}
                  onChange={v => set('anthropicApiKey', v)}
                  placeholder="sk-ant-..."
                  type="password"
                  monospace
                />
              </Row>
            </div>

            {/* Google Gemini */}
            <div style={{
              padding: tokens.space.md,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.bg.border}`,
              background: tokens.color.bg.surface,
            }}>
              <div style={{
                fontSize: tokens.font.size.sm,
                fontWeight: tokens.font.weight.semibold,
                color: tokens.color.text.primary,
                marginBottom: tokens.space.md,
                display: 'flex',
                alignItems: 'center',
                gap: tokens.space.sm,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#3b82f6', flexShrink: 0,
                }} />
                Gemini (Google)
              </div>
              <Row label="API Key" hint="Get yours at aistudio.google.com">
                <Input
                  value={draft.geminiApiKey}
                  onChange={v => set('geminiApiKey', v)}
                  placeholder="AIza..."
                  type="password"
                  monospace
                />
              </Row>
            </div>
          </div>
        );

      case 'agent':
        return (
          <div>
            {sectionTitle('Agent')}
            <Row
              label="Default model"
              hint="Which model Waza uses when set to 'auto'"
            >
              <Select
                value={draft.defaultModel}
                onChange={v => set('defaultModel', v as DefaultModel)}
                options={[
                  { value: 'auto',              label: 'auto — local-first' },
                  { value: 'cocoro',            label: 'cocoro-OS (Qwen 2.5 72B)' },
                  { value: 'ollama/llama3.2',   label: 'Llama 3.2 (Ollama)' },
                  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet' },
                  { value: 'claude-opus-4-6',   label: 'Claude Opus' },
                  { value: 'gemini-2.0-flash',  label: 'Gemini 2.0 Flash' },
                ]}
              />
            </Row>
            <Row
              label="Max steps"
              hint="Maximum number of tool-call steps per agent run (1–50)"
            >
              <NumberInput
                value={draft.maxSteps}
                onChange={v => set('maxSteps', Math.min(50, Math.max(1, v)))}
                min={1}
                max={50}
              />
            </Row>
          </div>
        );

      case 'editor':
        return (
          <div>
            {sectionTitle('Editor')}
            <Row label="Font size" hint="Monaco editor font size in pixels">
              <NumberInput
                value={draft.editorFontSize}
                onChange={v => set('editorFontSize', Math.min(32, Math.max(8, v)))}
                min={8}
                max={32}
              />
            </Row>
            <Row label="Font family" hint="Monospace font for the editor">
              <Input
                value={draft.editorFontFamily}
                onChange={v => set('editorFontFamily', v)}
                placeholder='"JetBrains Mono", "Fira Code", monospace'
                monospace
              />
            </Row>
            <Row label="Word wrap">
              <Toggle
                value={draft.wordWrap}
                onChange={v => set('wordWrap', v)}
                label="Wrap long lines"
              />
            </Row>
          </div>
        );

      case 'about':
        return (
          <div>
            {sectionTitle('About Waza')}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.space.md,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.space.md,
                padding: tokens.space.lg,
                borderRadius: tokens.radius.lg,
                border: `1px solid ${tokens.color.bg.border}`,
                background: tokens.color.bg.surface,
              }}>
                {/* W logo */}
                <div style={{
                  width: 40, height: 40,
                  borderRadius: tokens.radius.lg,
                  border: `1px solid ${tokens.color.bg.border}`,
                  background: tokens.color.bg.sidebar,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="18" height="14" viewBox="0 0 22 18" fill="none" stroke={tokens.color.text.tertiary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1,2 5,16 11,6 17,16 21,2" />
                  </svg>
                </div>
                <div>
                  <div style={{
                    fontSize: tokens.font.size.md,
                    fontWeight: tokens.font.weight.semibold,
                    color: tokens.color.text.primary,
                  }}>
                    Waza AI IDE
                  </div>
                  <div style={{
                    fontSize: tokens.font.size.xs,
                    color: tokens.color.text.tertiary,
                    marginTop: 2,
                  }}>
                    Version 0.5.2 · mdl-systems
                  </div>
                </div>
              </div>

              {[
                { label: 'cocoro-llm-server',  value: draft.cocoroBaseUrl },
                { label: 'Default model',       value: draft.defaultModel },
                { label: 'Theme',               value: draft.theme },
              ].map(r => (
                <div key={r.label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: tokens.font.size.sm,
                  color: tokens.color.text.secondary,
                  padding: `${tokens.space.xs}px 0`,
                  borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
                }}>
                  <span>{r.label}</span>
                  <span style={{
                    color: tokens.color.text.tertiary,
                    fontFamily: tokens.font.mono,
                    fontSize: tokens.font.size.xs,
                    maxWidth: 240,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{r.value}</span>
                </div>
              ))}

              {/* Reset */}
              <button
                onClick={handleReset}
                style={{
                  marginTop: tokens.space.sm,
                  padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                  borderRadius: tokens.radius.md,
                  border: `1px solid ${tokens.color.accent.red}44`,
                  background: 'transparent',
                  color: tokens.color.accent.red,
                  fontSize: tokens.font.size.sm,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: `background ${tokens.transition.fast}`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = tokens.color.accent.red + '10';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                Reset all settings to defaults
              </button>
            </div>
          </div>
        );

      default:
        return <div />;
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
          zIndex: 9000,
          animation: 'fadeIn 120ms ease',
        }}
      />

      {/* Dialog */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9001,
        width: 720,
        maxWidth: 'calc(100vw - 48px)',
        height: 520,
        maxHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        background: tokens.color.bg.base,
        border: `1px solid ${tokens.color.bg.border}`,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)',
        overflow: 'hidden',
        animation: 'fadeIn 120ms ease',
      }}>
        {/* Header */}
        <div style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${tokens.space.lg}px`,
          borderBottom: `1px solid ${tokens.color.bg.border}`,
          flexShrink: 0,
          background: tokens.color.bg.sidebar,
        }}>
          <span style={{
            fontSize: tokens.font.size.base,
            fontWeight: tokens.font.weight.semibold,
            color: tokens.color.text.primary,
          }}>
            Waza — Settings
          </span>
          <button
            onClick={onClose}
            style={{
              color: tokens.color.text.tertiary,
              fontSize: 18,
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: tokens.radius.sm,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.primary;
              (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.active;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.tertiary;
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left nav */}
          <div style={{
            width: 168,
            flexShrink: 0,
            borderRight: `1px solid ${tokens.color.bg.border}`,
            background: tokens.color.bg.sidebar,
            padding: tokens.space.sm,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                style={navItemStyle(section === s.id)}
                onMouseEnter={e => {
                  if (section !== s.id)
                    (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    section === s.id ? tokens.color.bg.active : 'transparent';
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.65, width: 16, textAlign: 'center' }}>
                  {s.icon}
                </span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: tokens.space.xl,
          }}>
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          height: 48,
          borderTop: `1px solid ${tokens.color.bg.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: tokens.space.sm,
          padding: `0 ${tokens.space.lg}px`,
          flexShrink: 0,
          background: tokens.color.bg.sidebar,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: `6px ${tokens.space.lg}px`,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.bg.border}`,
              background: 'transparent',
              color: tokens.color.text.secondary,
              fontSize: tokens.font.size.sm,
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: `6px ${tokens.space.lg}px`,
              borderRadius: tokens.radius.md,
              border: 'none',
              background: saved ? tokens.color.accent.green : tokens.color.text.accent,
              color: tokens.color.text.inverse,
              fontSize: tokens.font.size.sm,
              fontWeight: tokens.font.weight.medium,
              cursor: 'pointer',
              transition: 'background 150ms ease',
              minWidth: 80,
            }}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
