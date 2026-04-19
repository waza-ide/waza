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
        userSelect: 'none',
        flexShrink: 0,
        zIndex: 10,
        position: 'relative',
      }}
    >
      {/* macOS-style traffic lights (Linux: custom rendered) */}
      <div
        className="no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 14,
          paddingRight: 8,
          flexShrink: 0,
        }}
      >
        {/* Close — red */}
        <button
          id="traffic-close"
          title="Close"
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#ff5f57',
            border: '0.5px solid rgba(0,0,0,0.12)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'filter 80ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.85)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
        />
        {/* Minimize — yellow */}
        <button
          id="traffic-minimize"
          title="Minimize"
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#febc2e',
            border: '0.5px solid rgba(0,0,0,0.12)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'filter 80ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.85)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
        />
        {/* Maximize — green */}
        <button
          id="traffic-maximize"
          title="Maximize"
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#28c840',
            border: '0.5px solid rgba(0,0,0,0.12)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'filter 80ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.85)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
        />
      </div>

      {/* Thread name (center-ish) */}
      {threadName && (
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
          {threadName}
        </span>
      )}
      {!threadName && <div style={{ flex: 1 }} />}

      {/* Right: theme toggle + UpdaterBadge */}
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
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          style={{
            width: 26,
            height: 26,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.color.bg.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.color.text.tertiary,
            fontSize: 12,
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
