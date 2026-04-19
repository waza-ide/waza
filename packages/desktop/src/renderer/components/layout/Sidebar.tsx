import { tokens } from '../../styles/tokens.js';
import { FileTree } from '../FileTree.js';
import { AgentHistory } from '../AgentHistory.js';
import type { ActivityTab } from './ActivityBar.js';

interface SidebarProps {
  activeTab: ActivityTab;
  rootDir: string | null;
  onSelectFile: (path: string) => Promise<void>;
  onOpenFolder: () => Promise<void>;
  selectedPath?: string | null;
}

const SECTION_LABEL: Record<ActivityTab, string> = {
  files: 'Explorer',
  agent: 'Agent History',
};

export function Sidebar({
  activeTab,
  rootDir,
  onSelectFile,
  onOpenFolder,
  selectedPath = null,
}: SidebarProps): JSX.Element {
  return (
    <div style={{
      width: tokens.layout.sidebar,
      flexShrink: 0,
      background: tokens.color.bg.surface,
      borderRight: `1px solid ${tokens.color.bg.border}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* セクションヘッダー */}
      <div style={{
        height: 32,
        padding: `0 ${tokens.space.md}px`,
        display: 'flex',
        alignItems: 'center',
        borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: tokens.font.size.xs,
          fontWeight: tokens.font.weight.semibold,
          color: tokens.color.text.tertiary,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {SECTION_LABEL[activeTab]}
        </span>
      </div>

      {/* コンテンツ（タブで切り替え） */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'files' ? (
          <FileTree
            rootDir={rootDir}
            onSelectFile={onSelectFile}
            onOpenFolder={onOpenFolder}
            selectedPath={selectedPath}
          />
        ) : (
          <AgentHistory />
        )}
      </div>
    </div>
  );
}
