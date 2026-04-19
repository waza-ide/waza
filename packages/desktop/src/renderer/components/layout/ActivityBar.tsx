import { tokens } from '../../styles/tokens.js';

export type ActivityTab = 'files' | 'agent';

interface ActivityItem {
  id: ActivityTab | 'search' | 'git' | 'settings';
  label: string;
  icon: JSX.Element;
  enabled: boolean;
  position: 'top' | 'bottom';
}

interface ActivityBarProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
}

export function ActivityBar({ activeTab, onTabChange }: ActivityBarProps): JSX.Element {
  const items: ActivityItem[] = [
    {
      id: 'files',
      label: 'ファイル (Explorer)',
      enabled: true,
      position: 'top',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
      ),
    },
    {
      id: 'agent',
      label: 'エージェント履歴',
      enabled: true,
      position: 'top',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      ),
    },
    {
      id: 'search',
      label: 'ファイル検索（未実装）',
      enabled: false,
      position: 'top',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      ),
    },
    {
      id: 'git',
      label: 'Git（未実装）',
      enabled: false,
      position: 'top',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
          <path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"/>
        </svg>
      ),
    },
    {
      id: 'settings',
      label: '設定（未実装）',
      enabled: false,
      position: 'bottom',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
    },
  ];

  const topItems = items.filter(i => i.position === 'top');
  const bottomItems = items.filter(i => i.position === 'bottom');

  function renderItem(item: ActivityItem): JSX.Element {
    const isActive = item.enabled && activeTab === item.id;
    return (
      <button
        key={item.id}
        id={`activity-${item.id}`}
        title={item.label}
        disabled={!item.enabled}
        onClick={() => {
          if (item.enabled) onTabChange(item.id as ActivityTab);
        }}
        style={{
          width: tokens.layout.activityBar,
          height: tokens.layout.activityBar,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isActive
            ? tokens.color.text.accent
            : item.enabled
              ? tokens.color.text.secondary
              : tokens.color.text.tertiary,
          borderLeft: isActive
            ? `2px solid ${tokens.color.accent.blue}`
            : '2px solid transparent',
          background: 'transparent',
          transition: `color ${tokens.transition.fast}, background ${tokens.transition.fast}`,
          cursor: item.enabled ? 'pointer' : 'default',
          opacity: item.enabled ? 1 : 0.4,
        }}
        onMouseEnter={e => {
          if (item.enabled && !isActive) {
            (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.elevated;
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        {item.icon}
      </button>
    );
  }

  return (
    <div style={{
      width: tokens.layout.activityBar,
      flexShrink: 0,
      background: tokens.color.bg.base,
      borderRight: `1px solid ${tokens.color.bg.borderSub}`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <div>{topItems.map(item => renderItem(item))}</div>
      <div>{bottomItems.map(item => renderItem(item))}</div>
    </div>
  );
}
