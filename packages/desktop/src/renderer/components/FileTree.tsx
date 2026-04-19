import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.js';

// 除外ディレクトリ
const IGNORE = new Set(['.git', 'node_modules', 'dist', 'out', '.next', '__pycache__', '.DS_Store']);

// 拡張子→色マップ（テーマ非依存の固有色）
const EXT_COLOR: Record<string, string> = {
  ts:   '#4fc1ff', tsx: '#4ec9b0',
  js:   '#f7df1e', jsx: '#f7df1e',
  py:   '#ffde57', rs:  '#f74c00',
  md:   '#8b949e', json:'#f9c74f',
  css:  '#c084fc', html:'#e34c26',
  sh:   '#89e051', toml:'#9c4221',
  yaml: '#cb171e', yml: '#cb171e',
};

function getFileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_COLOR[ext] ?? '#9ca3af';
}

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  depth: number;
  children: TreeNode[] | null;
  expanded: boolean;
}

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries]
    .filter(e => !IGNORE.has(e.name))
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function entriesToNodes(entries: DirEntry[], depth: number): TreeNode[] {
  return sortEntries(entries).map(e => ({
    name: e.name,
    path: e.path,
    isDirectory: e.isDirectory,
    depth,
    children: null,
    expanded: false,
  }));
}

interface FileTreeNodeProps {
  node: TreeNode;
  onToggle: (path: string) => void;
  onSelectFile: (path: string) => void;
  selectedPath: string | null;
}

function FileTreeNodeView({ node, onToggle, onSelectFile, selectedPath }: FileTreeNodeProps): JSX.Element {
  const { tokens, theme } = useTheme();
  const isSelected = !node.isDirectory && node.path === selectedPath;
  const indent = node.depth * 16 + 8;
  const fileColor = node.isDirectory ? tokens.color.accent.blue : getFileColor(node.name);

  const activeBg = theme === 'light' ? 'rgba(0,102,204,0.08)' : '#1f6feb33';
  const hoverBg  = theme === 'light' ? tokens.color.bg.hover : '#161b22';
  const activeBorder = theme === 'light' ? tokens.color.accent.blue : '#1f6feb';

  function handleClick(): void {
    if (node.isDirectory) onToggle(node.path);
    else onSelectFile(node.path);
  }

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          padding: '2px 8px 2px 0',
          paddingLeft: indent,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 13,
          lineHeight: '22px',
          color: isSelected ? tokens.color.text.primary : fileColor,
          background: isSelected ? activeBg : 'transparent',
          borderLeft: isSelected
            ? `2px solid ${activeBorder}`
            : '2px solid transparent',
          userSelect: 'none',
          transition: 'background 0.08s',
        }}
        onMouseEnter={e => {
          if (!isSelected)
            (e.currentTarget as HTMLDivElement).style.background = hoverBg;
        }}
        onMouseLeave={e => {
          if (!isSelected)
            (e.currentTarget as HTMLDivElement).style.background = 'transparent';
        }}
        title={node.path}
      >
        <span style={{ fontSize: 10, width: 10, flexShrink: 0, opacity: 0.6 }}>
          {node.isDirectory ? (node.expanded ? '▾' : '▸') : '·'}
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
      </div>
      {node.isDirectory && node.expanded && node.children && (
        <>
          {node.children.map(child => (
            <FileTreeNodeView
              key={child.path}
              node={child}
              onToggle={onToggle}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
            />
          ))}
          {node.children.length === 0 && (
            <div style={{
              paddingLeft: indent + 20,
              fontSize: 12,
              color: tokens.color.text.tertiary,
              lineHeight: '22px',
            }}>
              (空)
            </div>
          )}
        </>
      )}
    </>
  );
}

interface FileTreeProps {
  rootDir: string | null;
  onSelectFile: (path: string) => void;
  onOpenFolder: () => void;
  selectedPath?: string | null;
}

export function FileTree({
  rootDir,
  onSelectFile,
  onOpenFolder,
  selectedPath = null,
}: FileTreeProps): JSX.Element {
  const { tokens } = useTheme();
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rootDir) { setNodes([]); return; }
    setLoading(true);
    void window.wazaAPI.fs.readDir(rootDir)
      .then(entries => { setNodes(entriesToNodes(entries, 0)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [rootDir]);

  const updateNode = useCallback(
    (nodeList: TreeNode[], targetPath: string, updater: (n: TreeNode) => TreeNode): TreeNode[] =>
      nodeList.map(n => {
        if (n.path === targetPath) return updater(n);
        if (n.children) return { ...n, children: updateNode(n.children, targetPath, updater) };
        return n;
      }),
    []
  );

  const handleToggle = useCallback(async (path: string): Promise<void> => {
    const findNode = (nodeList: TreeNode[]): TreeNode | null => {
      for (const n of nodeList) {
        if (n.path === path) return n;
        if (n.children) { const found = findNode(n.children); if (found) return found; }
      }
      return null;
    };

    setNodes(prev => {
      const target = findNode(prev);
      if (!target) return prev;
      if (target.expanded) {
        return updateNode(prev, path, n => ({ ...n, expanded: false }));
      } else {
        if (target.children === null) {
          const next = updateNode(prev, path, n => ({ ...n, expanded: true, children: [] }));
          void window.wazaAPI.fs.readDir(path).then(entries => {
            setNodes(current => updateNode(current, path, n => ({
              ...n, children: entriesToNodes(entries, n.depth + 1),
            })));
          });
          return next;
        }
        return updateNode(prev, path, n => ({ ...n, expanded: true }));
      }
    });
  }, [updateNode]);

  const handleToggleSync = useCallback((path: string): void => {
    void handleToggle(path);
  }, [handleToggle]);

  if (!rootDir) {
    return (
      <div style={{ padding: tokens.space.lg }}>
        <div style={{
          marginBottom: tokens.space.md,
          color: tokens.color.text.secondary,
          fontWeight: tokens.font.weight.semibold,
          fontSize: tokens.font.size.md,
        }}>
          技 Waza
        </div>
        <button
          id="open-folder-btn"
          onClick={onOpenFolder}
          style={{
            width: '100%',
            padding: `${tokens.space.sm}px ${tokens.space.md}px`,
            background: tokens.color.bg.active,
            border: `1px solid ${tokens.color.bg.border}`,
            borderRadius: tokens.radius.md,
            color: tokens.color.text.secondary,
            cursor: 'pointer',
            fontSize: tokens.font.size.sm,
            textAlign: 'left',
          }}
        >
          📂 フォルダを開く
        </button>
      </div>
    );
  }

  const dirName = rootDir.split('/').pop() ?? rootDir;

  return (
    <div style={{ userSelect: 'none' }}>
      {/* ヘッダー */}
      <div style={{
        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
        borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          color: tokens.color.text.primary,
          fontSize: tokens.font.size.sm,
          fontWeight: tokens.font.weight.semibold,
        }}>
          {dirName}
        </span>
        <span
          onClick={onOpenFolder}
          style={{ cursor: 'pointer', opacity: 0.5, flexShrink: 0, fontSize: 13 }}
          title="フォルダを変更"
        >
          📂
        </span>
      </div>

      {/* ツリー */}
      <div style={{ padding: '4px 0', overflowX: 'hidden' }}>
        {loading && (
          <div style={{
            padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
            color: tokens.color.text.tertiary,
            fontSize: tokens.font.size.sm,
          }}>
            読み込み中...
          </div>
        )}
        {!loading && nodes.map(node => (
          <FileTreeNodeView
            key={node.path}
            node={node}
            onToggle={handleToggleSync}
            onSelectFile={onSelectFile}
            selectedPath={selectedPath}
          />
        ))}
      </div>
    </div>
  );
}
