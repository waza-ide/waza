import { useState } from 'react';
import { FileTree } from './components/FileTree.js';
import { Editor } from './components/Editor.js';
import { WazaSidebar } from './components/WazaSidebar.js';

interface OpenFile {
  path: string;
  content: string;
}

export function App(): JSX.Element {
  const [rootDir, setRootDir] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);

  async function handleOpenFolder(): Promise<void> {
    const dir = await window.wazaAPI.dialog.openFolder();
    if (dir) setRootDir(dir);
  }

  async function handleSelectFile(filePath: string): Promise<void> {
    const content = await window.wazaAPI.fs.readFile(filePath);
    setOpenFile({ path: filePath, content });
  }

  async function handleSave(content: string): Promise<void> {
    if (!openFile) return;
    await window.wazaAPI.fs.writeFile(openFile.path, content);
    setOpenFile({ ...openFile, content });
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: '#0d1117',
      color: '#c9d1d9',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
    }}>
      {/* 左: ファイルツリー（幅240px） */}
      <div style={{
        width: 240,
        borderRight: '1px solid #21262d',
        overflow: 'auto',
        flexShrink: 0,
      }}>
        <FileTree
          rootDir={rootDir}
          onSelectFile={handleSelectFile}
          onOpenFolder={handleOpenFolder}
          selectedPath={openFile?.path ?? null}
        />
      </div>

      {/* 中央: Monacoエディタ（flex: 1） */}
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <Editor
          file={openFile}
          onSave={handleSave}
        />
      </div>

      {/* 右: Wazaエージェントパネル（幅360px） */}
      <div style={{
        width: 360,
        borderLeft: '1px solid #21262d',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <WazaSidebar currentFile={openFile?.path ?? null} rootDir={rootDir} />
      </div>
    </div>
  );
}
