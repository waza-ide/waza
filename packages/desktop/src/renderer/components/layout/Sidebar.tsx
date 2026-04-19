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

const NAV_ITEMS = [
  { id: 'new-thread',   icon: '✦', label: 'New thread',   enabled: true },
  { id: 'automations',  icon: '◈', label: 'Automations',  enabled: false },
  { id: 'skills',       icon: '⬡', label: 'Skills',       enabled: false },
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
      width: tokens.layout.sidebar,
      flexShrink: 0,
      background: tokens.color.bg.sidebar,
      borderRight: `1px solid ${tokens.color.bg.border}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ナビゲーション（上部固定） */}
      <div style={{
        padding: `${tokens.space.sm}px 0`,
        borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
        flexShrink: 0,
      }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            id={`sidebar-${item.id}`}
            disabled={!item.enabled}
            onClick={() => {
              if (item.enabled) navHandlers[item.id]?.();
            }}
            style={{
              width: '100%',
              padding: `6px ${tokens.space.lg}px`,
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
              opacity: item.enabled ? 1 : 0.5,
              transition: `background ${tokens.transition.fast}`,
            }}
            onMouseEnter={e => {
              if (item.enabled)
                (e.currentTarget as HTMLButtonElement).style.background =
                  tokens.color.bg.hover;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'transparent';
            }}
          >
            <span style={{ fontSize: 13, opacity: 0.65 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {threadGroups.length > 0 ? (
          /* スレッド一覧 */
          <div>
            <div style={{
              padding: `${tokens.space.sm}px ${tokens.space.lg}px ${tokens.space.xs}px`,
              fontSize: tokens.font.size.xs,
              fontWeight: tokens.font.weight.semibold,
              color: tokens.color.text.tertiary,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Threads
            </div>
            {threadGroups.map(group => (
              <div key={group.name}>
                <div style={{
                  padding: `${tokens.space.xs}px ${tokens.space.lg}px`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.space.xs,
                  fontSize: tokens.font.size.sm,
                  color: tokens.color.text.secondary,
                  fontWeight: tokens.font.weight.medium,
                }}>
                  <span style={{ fontSize: 9, opacity: 0.5 }}>▾</span>
                  <span>{group.name}</span>
                </div>
                {group.threads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => onSelectThread(thread.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: `5px ${tokens.space.md}px 5px 28px`,
                      margin: `1px ${tokens.space.sm}px`,
                      width: `calc(100% - ${tokens.space.lg}px)`,
                      background: activeThreadId === thread.id
                        ? tokens.color.bg.active
                        : 'transparent',
                      borderRadius: tokens.radius.sm,
                      fontSize: tokens.font.size.sm,
                      color: tokens.color.text.primary,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: `background ${tokens.transition.fast}`,
                    }}
                    onMouseEnter={e => {
                      if (activeThreadId !== thread.id)
                        (e.currentTarget as HTMLButtonElement).style.background =
                          tokens.color.bg.hover;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        activeThreadId === thread.id
                        ? tokens.color.bg.active
                        : 'transparent';
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
          /* スレッドなし → ファイルツリー */
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
