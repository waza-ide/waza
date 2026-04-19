import { useState, useCallback } from 'react';
import { FileTree } from './components/FileTree.js';
import { Editor } from './components/Editor.js';
import { WazaSidebar } from './components/WazaSidebar.js';
import { TabBar } from './components/TabBar.js';
import { MultiFileDiffView } from './components/MultiFileDiffView.js';
import { UpdaterBadge } from './components/UpdaterBadge.js';
import { useEditorTabs } from './hooks/useEditorTabs.js';
import type { MultiFileEdit } from './types/editor.js';

export function App(): JSX.Element {
  const [rootDir, setRootDir] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<MultiFileEdit | null>(null);

  const {
    tabs,
    activeTab,
    activeTabId,
    openTab,
    closeTab,
    updateContent,
    saveTab,
    applyMultiFileEdit,
    setActiveTabId,
  } = useEditorTabs();

  const handleOpenFolder = useCallback(async (): Promise<void> => {
    const dir = await window.wazaAPI.dialog.openFolder();
    if (dir) setRootDir(dir);
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!activeTabId) return;
    await saveTab(activeTabId);
  }, [activeTabId, saveTab]);

  const handleEditorChange = useCallback((content: string) => {
    if (!activeTabId) return;
    updateContent(activeTabId, content);
  }, [activeTabId, updateContent]);

  // MultiFileEdit の Accept/Reject
  const handleAcceptAll = useCallback(async (): Promise<void> => {
    if (!pendingEdit) return;
    await applyMultiFileEdit(pendingEdit);
    setPendingEdit(null);
  }, [pendingEdit, applyMultiFileEdit]);

  const handleRejectAll = useCallback((): void => {
    setPendingEdit(null);
  }, []);

  const handleAcceptFile = useCallback(async (path: string): Promise<void> => {
    if (!pendingEdit) return;
    const fileEdit = pendingEdit.files.find(f => f.path === path);
    if (!fileEdit) return;
    await applyMultiFileEdit({
      files: [fileEdit],
      description: pendingEdit.description,
    });
    const remaining = pendingEdit.files.filter(f => f.path !== path);
    setPendingEdit(remaining.length > 0 ? { ...pendingEdit, files: remaining } : null);
  }, [pendingEdit, applyMultiFileEdit]);

  const handleRejectFile = useCallback((path: string): void => {
    if (!pendingEdit) return;
    const remaining = pendingEdit.files.filter(f => f.path !== path);
    setPendingEdit(remaining.length > 0 ? { ...pendingEdit, files: remaining } : null);
  }, [pendingEdit]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: '#0d1117',
      color: '#c9d1d9',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      overflow: 'hidden',
    }}>
      {/* タイトルバー */}
      <div style={{
        height: 38,
        background: '#010409',
        borderBottom: '1px solid #21262d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
        WebkitAppRegion: 'drag' as React.CSSProperties['WebkitAppRegion'],
      }}>
        <span style={{ fontWeight: 700, color: '#58a6ff', fontSize: 13 }}>技 Waza</span>
        {rootDir && (
          <span style={{ fontSize: 11, color: '#484f58', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {rootDir.split('/').pop()}
          </span>
        )}
        <div style={{ WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
          <UpdaterBadge />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左: ファイルツリー（幅240px） */}
        <div style={{
          width: 240,
          borderRight: '1px solid #21262d',
          overflow: 'auto',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <FileTree
            rootDir={rootDir}
            onSelectFile={openTab}
            onOpenFolder={handleOpenFolder}
            selectedPath={activeTab?.path ?? null}
          />
        </div>

        {/* 中央: タブ + Monaco */}
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelect={setActiveTabId}
            onClose={closeTab}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              file={activeTab ? { path: activeTab.path, content: activeTab.content } : null}
              onSave={handleSave}
              onChange={handleEditorChange}
            />
          </div>
        </div>

        {/* 右: MultiFileDiff + Wazaパネル */}
        <div style={{
          width: 360,
          borderLeft: '1px solid #21262d',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {pendingEdit && (
            <div style={{ flexShrink: 0, overflow: 'auto', maxHeight: '40%' }}>
              <MultiFileDiffView
                edit={pendingEdit}
                onAcceptAll={handleAcceptAll}
                onRejectAll={handleRejectAll}
                onAcceptFile={handleAcceptFile}
                onRejectFile={handleRejectFile}
              />
            </div>
          )}
          <WazaSidebar
            currentFile={activeTab?.path ?? null}
            rootDir={rootDir}
            onMultiFileEdit={setPendingEdit}
          />
        </div>
      </div>
    </div>
  );
}
