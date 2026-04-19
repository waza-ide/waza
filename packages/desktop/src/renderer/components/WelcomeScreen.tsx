import { useTheme } from '../context/ThemeContext.js';

interface WelcomeScreenProps {
  projectName: string | null;
  onOpenFolder: () => Promise<void>;
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
      {/* 技ロゴ */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: tokens.radius.xl,
        border: `1.5px solid ${tokens.color.bg.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        color: tokens.color.text.secondary,
        fontWeight: tokens.font.weight.medium,
        background: tokens.color.bg.sidebar,
      }}>
        技
      </div>

      <span style={{
        fontSize: tokens.font.size.xl,
        fontWeight: tokens.font.weight.semibold,
        color: tokens.color.text.primary,
        letterSpacing: '-0.02em',
      }}>
        Let&apos;s build
      </span>

      {/* フォルダ選択ボタン */}
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
          (e.currentTarget as HTMLButtonElement).style.borderColor = tokens.color.bg.border;
          (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = tokens.color.bg.border;
          (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.sidebar;
        }}
      >
        <span style={{ fontSize: 11, opacity: 0.5 }}>▣</span>
        <span>{projectName ?? 'フォルダを選択'}</span>
        {projectName && (
          <span style={{ opacity: 0.35, fontSize: 10 }}>▾</span>
        )}
      </button>
    </div>
  );
}
