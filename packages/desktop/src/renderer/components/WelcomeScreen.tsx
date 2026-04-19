import { useTheme } from '../context/ThemeContext.js';

interface WelcomeScreenProps {
  projectName: string | null;
  onOpenFolder: () => Promise<void>;
}

// SVG folder icon — monochrome
function FolderIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 4a1 1 0 0 1 1-1h4l2 2h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4z" />
    </svg>
  );
}

// Subtle gradient dots decoration (Codex-style background grid)

export function WelcomeScreen({ projectName, onOpenFolder }: WelcomeScreenProps): JSX.Element {
  const { tokens, theme } = useTheme();

  const gridColor = theme === 'light'
    ? 'rgba(0,0,0,0.04)'
    : 'rgba(255,255,255,0.03)';

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: tokens.color.bg.base,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle grid background (Codex-style) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(${gridColor} 1px, transparent 1px),
          linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: tokens.space.lg,
        position: 'relative',
        zIndex: 1,
        maxWidth: 360,
        padding: tokens.space.xl,
        textAlign: 'center',
      }}>
        {/* Logo mark */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: tokens.radius.xl,
          border: `1px solid ${tokens.color.bg.border}`,
          background: tokens.color.bg.sidebar,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {/* W monogram */}
          <svg width="20" height="16" viewBox="0 0 22 18" fill="none" stroke={tokens.color.text.tertiary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,2 5,16 11,6 17,16 21,2" />
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h1 style={{
            fontSize: tokens.font.size.xxl,
            fontWeight: tokens.font.weight.semibold,
            color: tokens.color.text.primary,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            margin: 0,
          }}>
            Let&apos;s build
          </h1>
          <p style={{
            marginTop: tokens.space.sm,
            fontSize: tokens.font.size.base,
            color: tokens.color.text.tertiary,
            lineHeight: 1.5,
          }}>
            Open a folder to start editing, or use the composer below to ask Waza anything.
          </p>
        </div>

        {/* Open folder CTA */}
        <button
          id="open-folder-btn"
          onClick={() => { void onOpenFolder(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: tokens.space.sm,
            padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
            borderRadius: tokens.radius.full,
            border: `1px solid ${tokens.color.bg.border}`,
            fontSize: tokens.font.size.sm,
            fontWeight: tokens.font.weight.medium,
            color: tokens.color.text.secondary,
            background: tokens.color.bg.sidebar,
            cursor: 'pointer',
            transition: `
              background ${tokens.transition.fast},
              border-color ${tokens.transition.fast},
              box-shadow ${tokens.transition.fast}
            `,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = tokens.color.bg.hover;
            el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = tokens.color.bg.sidebar;
            el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
          }}
        >
          <FolderIcon />
          <span>{projectName ?? 'Open folder'}</span>
        </button>

        {/* Quick hints (Codex-style suggestion chips) */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: tokens.space.sm,
          justifyContent: 'center',
          marginTop: tokens.space.xs,
        }}>
          {[
            'Generate a README',
            'Write unit tests',
            'Explain this code',
            'Fix a bug',
          ].map(hint => (
            <span
              key={hint}
              style={{
                padding: '4px 12px',
                borderRadius: tokens.radius.full,
                border: `1px solid ${tokens.color.bg.border}`,
                fontSize: tokens.font.size.xs,
                color: tokens.color.text.tertiary,
                background: tokens.color.bg.base,
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              {hint}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
