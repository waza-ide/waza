import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext.js';

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

/** Checks cocoro-llm-server availability every 30s */
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

  const cocoroColor =
    cocoroStatus === 'online'   ? '#22c55e' :
    cocoroStatus === 'offline'  ? tokens.color.text.tertiary :
    tokens.color.text.tertiary;

  return (
    <div style={{
      height: tokens.layout.statusBar,
      background: tokens.color.bg.sidebar,
      borderTop: `1px solid ${tokens.color.bg.border}`,
      display: 'flex',
      alignItems: 'center',
      paddingLeft: tokens.space.lg,
      paddingRight: tokens.space.lg,
      justifyContent: 'space-between',
      flexShrink: 0,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    }}>
      {/* Left: Local / Worktree / Cloud tabs */}
      <div style={{ display: 'flex', gap: tokens.space.lg }}>
        {MODES.map(m => (
          <span
            key={m}
            style={{
              fontSize: tokens.font.size.xs,
              color: m === mode
                ? tokens.color.text.primary
                : tokens.color.text.tertiary,
              fontWeight: m === mode
                ? tokens.font.weight.medium
                : tokens.font.weight.normal,
              cursor: 'default',
            }}
          >
            {MODE_LABELS[m]}
          </span>
        ))}
      </div>

      {/* Right: cocoro-llm status + branch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space.lg }}>
        {/* cocoro-llm-server indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space.xs,
          fontSize: tokens.font.size.xs,
          color: cocoroColor,
          transition: 'color 0.3s ease',
        }}
          title={
            cocoroStatus === 'online'
              ? `cocoro-llm-server online (${COCORO_CLM_URL})`
              : cocoroStatus === 'offline'
                ? `cocoro-llm-server offline (${COCORO_CLM_URL})`
                : 'Checking cocoro-llm-server...'
          }
        >
          <span style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: cocoroColor,
            boxShadow: cocoroStatus === 'online' ? `0 0 4px ${cocoroColor}` : 'none',
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }} />
          <span style={{ opacity: cocoroStatus === 'online' ? 1 : 0.5 }}>
            {cocoroStatus === 'online' ? 'cocoro' : cocoroStatus === 'checking' ? '...' : 'cocoro'}
          </span>
        </div>

        {/* Branch */}
        {branch ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.space.xs,
            fontSize: tokens.font.size.xs,
            color: tokens.color.text.tertiary,
          }}>
            <span style={{ opacity: 0.5 }}>⎇</span>
            <span>{branch}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
