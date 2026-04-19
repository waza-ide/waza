import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext.js';
import { SettingsPanel } from '../settings/SettingsPanel.js';

export type EnvMode = 'local' | 'worktree' | 'cloud';

interface StatusBarProps {
  mode: EnvMode;
  branch: string | null;
  projectPath: string | null;
}

const MODE_LABELS: Record<EnvMode, string> = {
  local:    'Local',
  worktree: 'Worktree',
  cloud:    'Cloud',
};

const MODES: EnvMode[] = ['local', 'worktree', 'cloud'];

const COCORO_CLM_URL = 'http://192.168.50.112:8000';

/** Polls cocoro-llm-server health every 30s */
function useCocoroStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    async function check(): Promise<void> {
      try {
        const res = await fetch(`${COCORO_CLM_URL}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        setStatus(res.ok ? 'online' : 'offline');
      } catch {
        setStatus('offline');
      }
    }
    void check();
    const id = setInterval(() => { void check(); }, 30_000);
    return () => clearInterval(id);
  }, []);

  return status;
}

export function StatusBar({ mode, branch }: StatusBarProps): JSX.Element {
  const { tokens } = useTheme();
  const cocoroStatus = useCocoroStatus();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  // ⌘, shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(prev => !prev);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const dotColor =
    cocoroStatus === 'online'  ? '#22c55e' :
    cocoroStatus === 'offline' ? tokens.color.text.tertiary :
    tokens.color.text.tertiary;

  return (
    <>
      <div style={{
        height: tokens.layout.statusBar,
        background: tokens.color.bg.sidebar,
        borderTop: `1px solid ${tokens.color.bg.border}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: tokens.space.lg,
        paddingRight: tokens.space.sm,
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
      }}>
        {/* Left: mode tabs */}
        <div style={{ display: 'flex', gap: tokens.space.lg }}>
          {MODES.map(m => (
            <span
              key={m}
              style={{
                fontSize: tokens.font.size.xs,
                color: m === mode ? tokens.color.text.primary : tokens.color.text.tertiary,
                fontWeight: m === mode ? tokens.font.weight.medium : tokens.font.weight.normal,
                cursor: 'default',
              }}
            >
              {MODE_LABELS[m]}
            </span>
          ))}
        </div>

        {/* Right: cocoro indicator + branch + settings button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space.sm }}>

          {/* Branch */}
          {branch && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: tokens.font.size.xs,
              color: tokens.color.text.tertiary,
            }}>
              <span style={{ opacity: 0.5 }}>⎇</span>
              <span>{branch}</span>
            </div>
          )}

          {/* cocoro indicator — click to open settings */}
          <button
            id="cocoro-status-btn"
            onClick={openSettings}
            title={
              `cocoro-llm-server: ${cocoroStatus}\nClick to open Settings (⌘,)`
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: tokens.radius.full,
              border: `1px solid ${
                cocoroStatus === 'online'
                  ? '#22c55e44'
                  : tokens.color.bg.border
              }`,
              background: 'transparent',
              color: dotColor,
              fontSize: tokens.font.size.xs,
              cursor: 'pointer',
              transition: `background ${tokens.transition.fast}, border-color ${tokens.transition.fast}`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            {/* Animated dot */}
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              boxShadow: cocoroStatus === 'online'
                ? `0 0 5px ${dotColor}`
                : 'none',
              transition: 'background 0.3s ease, box-shadow 0.3s ease',
              flexShrink: 0,
            }} />
            <span style={{ opacity: cocoroStatus === 'online' ? 1 : 0.55 }}>
              cocoro
            </span>
            {/* Settings gear hint */}
            <span style={{ opacity: 0.35, fontSize: 9, marginLeft: 1 }}>⚙</span>
          </button>
        </div>
      </div>

      {/* Settings modal */}
      <SettingsPanel open={settingsOpen} onClose={closeSettings} />
    </>
  );
}
