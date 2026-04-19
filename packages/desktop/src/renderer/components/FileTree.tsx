import { useState, useEffect, useCallback } from 'react';

// 除外ディレクトリ
const IGNORE = new Set(['.git', 'node_modules', 'dist', 'out', '.next', '__pycache__', '.DS_Store']);

// 拡張子→色マップ
const EXT_COLOR: Record<string, string> = {
  ts: '#4fc1ff',
  tsx: '#4ec9b0',
  js: '#f7df1e',
  jsx: '#f7df1e',
  py: '#ffde57',
  rs: '#f74c00',
  md: '#8b949e',
  json: '#f9c74f',
  css: '#c084fc',
  html: '#e34c26',
  sh: '#89e051',
  toml: '#9c4221',
  yaml: '#cb171e',
  yml: '#cb171e',
};

function getFileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_COLOR[ext] ?? '#c9d1d9';
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
  children: TreeNode[] | null; // null = 未ロード, [] = 空
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
  const isSelected = !node.isDirectory && node.path === selectedPath;
  const indent = node.depth * 16 + 8;

  function handleClick(): void {
    if (node.isDirectory) {
      onToggle(node.path);
    } else {
      onSelectFile(node.path);
    }
  }

  const fileColor = node.isDirectory ? '#58a6ff' : getFileColor(node.name);

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
          color: isSelected ? '#ffffff' : fileColor,
          background: isSelected ? '#1f6feb33' : 'transparent',
          borderLeft: isSelected ? '2px solid #1f6feb' : '2px solid transparent',
          userSelect: 'none',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#161b22';
        }}
        onMouseLeave={e => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
        }}
        title={node.path}
      >
        <span style={{ fontSize: 10, width: 10, flexShrink: 0, opacity: 0.7 }}>
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
              color: '#484f58',
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

export function FileTree({ rootDir, onSelectFile, onOpenFolder, selectedPath = null }: FileTreeProps): JSX.Element {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);

  // ルートディレクトリが変わったら再ロード
  useEffect(() => {
    if (!rootDir) {
      setNodes([]);
      return;
    }
    setLoading(true);
    void window.wazaAPI.fs.readDir(rootDir).then(entries => {
      setNodes(entriesToNodes(entries, 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [rootDir]);

  // ノードをpathで検索して更新するimmutableヘルパー
  const updateNode = useCallback(
    (nodeList: TreeNode[], targetPath: string, updater: (n: TreeNode) => TreeNode): TreeNode[] => {
      return nodeList.map(n => {
        if (n.path === targetPath) return updater(n);
        if (n.children) {
          return { ...n, children: updateNode(n.children, targetPath, updater) };
        }
        return n;
      });
    },
    []
  );

  const handleToggle = useCallback(async (path: string): Promise<void> => {
    // 現在のexpanded状態を取得
    const findNode = (nodeList: TreeNode[]): TreeNode | null => {
      for (const n of nodeList) {
        if (n.path === path) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    };

    setNodes(prev => {
      const target = findNode(prev);
      if (!target) return prev;

      if (target.expanded) {
        // 折りたたみ（childrenは保持）
        return updateNode(prev, path, n => ({ ...n, expanded: false }));
      } else {
        // 展開：未ロードなら非同期でchildrenを取得
        if (target.children === null) {
          // まず展開中マークを立てる
          const next = updateNode(prev, path, n => ({ ...n, expanded: true, children: [] }));
          // 非同期でファイル一覧取得
          void window.wazaAPI.fs.readDir(path).then(entries => {
            setNodes(current =>
              updateNode(current, path, n => ({
                ...n,
                children: entriesToNodes(entries, n.depth + 1),
              }))
            );
          });
          return next;
        } else {
          // 既にロード済み — 展開するだけ
          return updateNode(prev, path, n => ({ ...n, expanded: true }));
        }
      }
    });
  }, [updateNode]);

  const handleToggleSync = useCallback((path: string): void => {
    void handleToggle(path);
  }, [handleToggle]);

  if (!rootDir) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{
          marginBottom: 12,
          color: '#58a6ff',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.02em',
        }}>
          技 Waza
        </div>
        <button
          id="open-folder-btn"
          onClick={onOpenFolder}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#21262d',
            border: '1px solid #30363d',
            borderRadius: 6,
            color: '#c9d1d9',
            cursor: 'pointer',
            fontSize: 13,
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
        padding: '10px 12px',
        borderBottom: '1px solid #21262d',
        color: '#8b949e',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          color: '#c9d1d9',
          fontSize: 12,
          fontWeight: 600,
        }}>
          {dirName}
        </span>
        <span
          onClick={onOpenFolder}
          style={{ cursor: 'pointer', opacity: 0.6, flexShrink: 0, fontSize: 14 }}
          title="フォルダを変更"
        >
          📂
        </span>
      </div>

      {/* ツリー */}
      <div style={{ padding: '4px 0', overflowX: 'hidden' }}>
        {loading && (
          <div style={{ padding: '8px 16px', color: '#484f58', fontSize: 12 }}>
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
