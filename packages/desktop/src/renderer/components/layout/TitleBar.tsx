import { useTheme } from '../../context/ThemeContext.js';
import { UpdaterBadge } from '../UpdaterBadge.js';

interface TitleBarProps {
  threadName: string | null;
}

export function TitleBar({ threadName }: TitleBarProps): JSX.Element {
  const { tokens, theme, toggleTheme } = useTheme();

  return (
    <div
      className="drag-region"
      style={{
        height: tokens.layout.titleBar,
        background: tokens.color.bg.sidebar,
        borderBottom: `1px solid ${tokens.color.bg.border}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 80,     // macOSトラフィックライト分のスペース
        userSelect: 'none',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* スレッド名 */}
      <span style={{
        flex: 1,
        fontSize: tokens.font.size.sm,
        fontWeight: tokens.font.weight.medium,
        color: tokens.color.text.secondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        paddingLeft: tokens.space.sm,
      }}>
        {threadName ?? 'New Thread'}
      </span>

      {/* 右端: テーマトグル + UpdaterBadge */}
      <div
        className="no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space.sm,
          paddingRight: tokens.space.md,
        }}
      >
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
          style={{
            width: 26,
            height: 26,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.color.bg.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.color.text.tertiary,
            fontSize: 13,
            background: 'transparent',
            cursor: 'pointer',
            transition: `background ${tokens.transition.fast}, color ${tokens.transition.fast}`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.active;
            (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.secondary;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.tertiary;
          }}
        >
          {theme === 'light' ? '○' : '●'}
        </button>
        <UpdaterBadge />
      </div>
    </div>
  );
}
