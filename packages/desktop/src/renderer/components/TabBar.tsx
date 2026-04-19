import { useTheme } from '../context/ThemeContext.js';
import type { EditorTab } from '../types/editor.js';

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onClose }: TabBarProps): JSX.Element {
  const { tokens } = useTheme();

  if (tabs.length === 0) {
    return (
      <div style={{
        height: tokens.layout.tabBar,
        borderBottom: `1px solid ${tokens.color.bg.border}`,
        background: tokens.color.bg.sidebar,
        flexShrink: 0,
      }} />
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: tokens.layout.tabBar,
      borderBottom: `1px solid ${tokens.color.bg.border}`,
      overflowX: 'auto',
      overflowY: 'hidden',
      background: tokens.color.bg.sidebar,
      flexShrink: 0,
      scrollbarWidth: 'none',
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            id={`tab-${tab.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
            onClick={() => onSelect(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '0 10px 0 12px',
              minWidth: 100,
              maxWidth: 180,
              height: '100%',
              cursor: 'pointer',
              fontSize: tokens.font.size.sm,
              color: isActive ? tokens.color.text.primary : tokens.color.text.secondary,
              background: isActive ? tokens.color.bg.base : 'transparent',
              borderRight: `1px solid ${tokens.color.bg.border}`,
              borderTop: isActive
                ? `1.5px solid ${tokens.color.accent.blue}`
                : '1.5px solid transparent',
              userSelect: 'none',
              flexShrink: 0,
              transition: `background ${tokens.transition.fast}, color ${tokens.transition.fast}`,
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              if (!isActive)
                (e.currentTarget as HTMLDivElement).style.background = tokens.color.bg.hover;
            }}
            onMouseLeave={e => {
              if (!isActive)
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            {/* 未保存ドット */}
            {tab.isDirty && (
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: tokens.color.accent.amber,
                flexShrink: 0,
              }} />
            )}
            {/* ファイル名 */}
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {tab.filename}
            </span>
            {/* 閉じるボタン */}
            <span
              id={`close-tab-${tab.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
              onClick={e => { e.stopPropagation(); onClose(tab.id); }}
              style={{
                opacity: 0,
                fontSize: 14,
                lineHeight: 1,
                padding: '1px 3px',
                borderRadius: tokens.radius.sm,
                flexShrink: 0,
                color: tokens.color.text.secondary,
                transition: `opacity ${tokens.transition.fast}`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.opacity = '1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.opacity = '0'; }}
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}
