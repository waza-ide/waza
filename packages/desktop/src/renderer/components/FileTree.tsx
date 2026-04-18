import { useState, useEffect } from 'react';

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface FileTreeNodeProps {
  entry: DirEntry;
  depth: number;
  onSelectFile: (path: string) => void;
}

function FileTreeNode({ entry, depth, onSelectFile }: FileTreeNodeProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirEntry[]>([]);

  async function toggleExpand(): Promise<void> {
    if (!entry.isDirectory) {
      onSelectFile(entry.path);
      return;
    }
    if (!expanded) {
      const entries = await window.wazaAPI.fs.readDir(entry.path);
      setChildren(entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      }));
    }
    setExpanded(prev => !prev);
  }

  return (
    <>
      <div
        onClick={() => { void toggleExpand(); }}
        style={{
          padding: `3px 8px 3px ${16 + depth * 14}px`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: entry.isDirectory ? '#58a6ff' : '#c9d1d9',
          userSelect: 'none',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#161b22'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: '10px', width: 10 }}>
          {entry.isDirectory ? (expanded ? '▾' : '▸') : '·'}
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
      </div>
      {expanded && children.map(child => (
        <FileTreeNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          onSelectFile={onSelectFile}
        />
      ))}
    </>
  );
}

interface FileTreeProps {
  rootDir: string | null;
  onSelectFile: (path: string) => void;
  onOpenFolder: () => void;
}

export function FileTree({ rootDir, onSelectFile, onOpenFolder }: FileTreeProps): JSX.Element {
  const [rootEntries, setRootEntries] = useState<DirEntry[]>([]);

  useEffect(() => {
    if (!rootDir) return;
    void window.wazaAPI.fs.readDir(rootDir).then(entries => {
      setRootEntries(entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      }));
    });
  }, [rootDir]);

  if (!rootDir) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{
          marginBottom: 12,
          color: '#58a6ff',
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '0.02em',
        }}>
          技 Waza
        </div>
        <button
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

  return (
    <div>
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
        <span>Explorer</span>
        <span
          onClick={onOpenFolder}
          style={{ cursor: 'pointer', opacity: 0.6 }}
          title="フォルダを変更"
        >
          📂
        </span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {rootEntries.map(entry => (
          <FileTreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}
