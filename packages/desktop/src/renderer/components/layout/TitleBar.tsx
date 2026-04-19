import { tokens } from '../../styles/tokens.js';
import { UpdaterBadge } from '../UpdaterBadge.js';

interface TitleBarProps {
  projectName: string | null;
}

export function TitleBar({ projectName }: TitleBarProps): JSX.Element {
  return (
    <div
      className="drag-region"
      style={{
        height: tokens.layout.titleBar,
        background: tokens.color.bg.base,
        borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: tokens.layout.activityBar,
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* アプリ名 or プロジェクト名 */}
      <div
        className="no-drag"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: tokens.space.lg,
          gap: tokens.space.sm,
        }}
      >
        <span style={{
          fontSize: tokens.font.size.sm,
          fontWeight: tokens.font.weight.medium,
          color: tokens.color.text.secondary,
          letterSpacing: '0.01em',
        }}>
          {projectName ? projectName : (
            <span style={{ color: tokens.color.text.tertiary }}>技 Waza</span>
          )}
        </span>
      </div>

      {/* 右端: UpdaterBadge */}
      <div className="no-drag" style={{ paddingRight: tokens.space.lg }}>
        <UpdaterBadge />
      </div>
    </div>
  );
}
