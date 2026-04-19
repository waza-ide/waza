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

export function StatusBar({ mode, branch }: StatusBarProps): JSX.Element {
  const { tokens } = useTheme();

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
    }}>
      {/* 左: Local / Worktree / Cloud タブ */}
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

      {/* 右: ブランチ表示 */}
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
  );
}
