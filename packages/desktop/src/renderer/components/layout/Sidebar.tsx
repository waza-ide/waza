import { useTheme } from '../../context/ThemeContext.js';
import { FileTree } from '../FileTree.js';

export interface Thread {
  id: string;
  name: string;
  elapsed: string;
}

export interface ThreadGroup {
  name: string;
  threads: Thread[];
}

interface SidebarProps {
  rootDir: string | null;
  onOpenFolder: () => Promise<void>;
  onSelectFile: (path: string) => Promise<void>;
  selectedPath?: string | null;
  threadGroups: ThreadGroup[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
}

// Simple SVG icons
function NewThreadIcon(): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

function AutomationIcon(): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L2 9l4 1 1 4 6-12z"/>
    </svg>
  );
}

function SkillsIcon(): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,1 10,6 15,6 11,9 13,14 8,11 3,14 5,9 1,6 6,6"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { id: 'new-thread',  Icon: NewThreadIcon,    label: 'New thread',  enabled: true },
  { id: 'automations', Icon: AutomationIcon,   label: 'Automations', enabled: false },
  { id: 'skills',      Icon: SkillsIcon,       label: 'Skills',      enabled: false },
] as const;

export function Sidebar({
  rootDir,
  onOpenFolder,
  onSelectFile,
  selectedPath = null,
  threadGroups,
  activeThreadId,
  onSelectThread,
  onNewThread,
}: SidebarProps): JSX.Element {
  const { tokens } = useTheme();

  const navHandlers: Record<string, () => void> = {
    'new-thread': onNewThread,
  };

  return (
    <div style={{
      flex: 1,
      background: tokens.color.bg.sidebar,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top nav — Codex style */}
      <div style={{
        padding: `${tokens.space.xs}px 0`,
        flexShrink: 0,
      }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            id={`sidebar-${item.id}`}
            disabled={!item.enabled}
            onClick={() => { if (item.enabled) navHandlers[item.id]?.(); }}
            style={{
              width: '100%',
              padding: `7px ${tokens.space.lg}px`,
              display: 'flex',
              alignItems: 'center',
              gap: tokens.space.sm,
              color: item.enabled
                ? tokens.color.text.secondary
                : tokens.color.text.tertiary,
              fontSize: tokens.font.size.base,
              textAlign: 'left',
              cursor: item.enabled ? 'pointer' : 'default',
              background: 'transparent',
              opacity: item.enabled ? 1 : 0.45,
              transition: `background ${tokens.transition.fast}, color ${tokens.transition.fast}`,
              borderRadius: 0,
            }}
            onMouseEnter={e => {
              if (item.enabled) {
                (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
                (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.primary;
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = item.enabled
                ? tokens.color.text.secondary
                : tokens.color.text.tertiary;
            }}
          >
            <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>
              <item.Icon />
            </span>
            <span style={{ fontWeight: tokens.font.weight.medium }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{
        height: 1,
        background: tokens.color.bg.borderSub,
        flexShrink: 0,
        margin: `0 ${tokens.space.md}px`,
      }} />

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: tokens.space.xs }}>
        {threadGroups.length > 0 ? (
          /* Thread list — Codex style */
          <div>
            {threadGroups.map(group => (
              <div key={group.name}>
                <div style={{
                  padding: `${tokens.space.sm}px ${tokens.space.lg}px ${tokens.space.xs}px`,
                  fontSize: tokens.font.size.xs,
                  fontWeight: tokens.font.weight.medium,
                  color: tokens.color.text.tertiary,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  {group.name}
                </div>
                {group.threads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => onSelectThread(thread.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: `6px 10px`,
                      margin: `1px ${tokens.space.sm}px`,
                      width: `calc(100% - ${tokens.space.md}px)`,
                      background: activeThreadId === thread.id
                        ? tokens.color.bg.active
                        : 'transparent',
                      borderRadius: tokens.radius.md,
                      fontSize: tokens.font.size.sm,
                      color: activeThreadId === thread.id
                        ? tokens.color.text.primary
                        : tokens.color.text.secondary,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: `background ${tokens.transition.fast}`,
                    }}
                    onMouseEnter={e => {
                      if (activeThreadId !== thread.id)
                        (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.hover;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        activeThreadId === thread.id ? tokens.color.bg.active : 'transparent';
                    }}
                  >
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {thread.name}
                    </span>
                    <span style={{
                      fontSize: tokens.font.size.xs,
                      color: tokens.color.text.tertiary,
                      flexShrink: 0,
                      marginLeft: tokens.space.sm,
                    }}>
                      {thread.elapsed}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* No threads → file tree */
          <FileTree
            rootDir={rootDir}
            onSelectFile={onSelectFile}
            onOpenFolder={onOpenFolder}
            selectedPath={selectedPath}
          />
        )}
      </div>
    </div>
  );
}
