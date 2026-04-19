import type { EditorTab } from '../types/editor.js';

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onClose }: TabBarProps): JSX.Element {
  if (tabs.length === 0) {
    return <div style={{ height: 35, borderBottom: '1px solid #21262d', background: '#0d1117' }} />;
  }

  return (
    <div style={{
      display: 'flex',
      height: 35,
      borderBottom: '1px solid #21262d',
      overflowX: 'auto',
      overflowY: 'hidden',
      background: '#0d1117',
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
              fontSize: 12,
              color: isActive ? '#c9d1d9' : '#8b949e',
              background: isActive ? '#161b22' : 'transparent',
              borderRight: '1px solid #21262d',
              borderTop: isActive ? '1px solid #1f6feb' : '1px solid transparent',
              borderBottom: isActive ? '1px solid #161b22' : 'none',
              userSelect: 'none',
              flexShrink: 0,
              transition: 'background 0.1s, color 0.1s',
              boxSizing: 'border-box',
            }}
          >
            {/* 未保存ドット */}
            {tab.isDirty && (
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#f78166',
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
                borderRadius: 3,
                flexShrink: 0,
                color: '#8b949e',
                transition: 'opacity 0.1s',
              }}
              className="tab-close-btn"
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}
