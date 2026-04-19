import { useTheme } from '../context/ThemeContext.js';

interface WelcomeScreenProps {
  projectName: string | null;
  onOpenFolder: () => Promise<void>;
}

// Simple folder SVG icon
function FolderIcon(): JSX.Element {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: 0.55 }}
    >
      <path d="M1 4a1 1 0 0 1 1-1h4l2 2h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4z" />
    </svg>
  );
}

export function WelcomeScreen({ projectName, onOpenFolder }: WelcomeScreenProps): JSX.Element {
  const { tokens } = useTheme();

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.space.lg,
      background: tokens.color.bg.base,
      animation: 'fadeIn 200ms ease',
    }}>
      {/* Waza logo mark */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: tokens.radius.lg,
        border: `1.5px solid ${tokens.color.bg.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tokens.color.bg.sidebar,
      }}>
        {/* W monogram */}
        <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke={tokens.color.text.tertiary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1,2 5,16 11,6 17,16 21,2" />
        </svg>
      </div>

      <span style={{
        fontSize: tokens.font.size.xl,
        fontWeight: tokens.font.weight.semibold,
        color: tokens.color.text.primary,
        letterSpacing: '-0.02em',
      }}>
        Let&apos;s build
      </span>

      {/* Folder selector button */}
      <button
        id="open-folder-btn"
        onClick={() => { void onOpenFolder(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space.sm,
          padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
          border: `1px solid ${tokens.color.bg.border}`,
          borderRadius: tokens.radius.full,
          fontSize: tokens.font.size.sm,
          color: tokens.color.text.secondary,
          background: tokens.color.bg.sidebar,
          cursor: 'pointer',
          transition: `border-color ${tokens.transition.fast}, background ${tokens.transition.fast}`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.sidebar;
        }}
      >
        <FolderIcon />
        <span>{projectName ?? 'Open folder'}</span>
        {projectName && (
          <span style={{ opacity: 0.35, fontSize: 10 }}>▾</span>
        )}
      </button>
    </div>
  );
}
