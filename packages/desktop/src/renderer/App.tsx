import { useState, useCallback, useRef } from 'react';
import { ModelRouter } from '@waza/core';
import { tokens } from './styles/tokens.js';
import { TitleBar } from './components/layout/TitleBar.js';
import { ActivityBar } from './components/layout/ActivityBar.js';
import type { ActivityTab } from './components/layout/ActivityBar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { TabBar } from './components/TabBar.js';
import { Editor } from './components/Editor.js';
import { AgentPanel } from './components/AgentPanel.js';
import { Composer } from './components/Composer.js';
import { MultiFileDiffView } from './components/MultiFileDiffView.js';
import { useEditorTabs } from './hooks/useEditorTabs.js';
import { DesktopAgentLoop } from './agent/loop.js';
import type { AgentState } from './agent/types.js';
import type { MultiFileEdit } from './types/editor.js';

interface LogEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const router = new ModelRouter();

export function App(): JSX.Element {
  const [activityTab, setActivityTab] = useState<ActivityTab>('files');
  const [rootDir, setRootDir] = useState<string | null>(null);
  const [agentLog, setAgentLog] = useState<LogEntry[]>([]);
  const [currentState, setCurrentState] = useState<AgentState>({ status: 'idle' });
  const [pendingEdit, setPendingEdit] = useState<MultiFileEdit | null>(null);
  const [currentModel] = useState('auto');
  const [showAgentPanel, setShowAgentPanel] = useState(false);

  const agentLoopRef = useRef<DesktopAgentLoop>(
    new DesktopAgentLoop(router, '')
  );

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
    if (dir) {
      setRootDir(dir);
      agentLoopRef.current.setWorkDir(dir);
    }
  }, []);

  const handleSubmit = useCallback(async (input: string): Promise<void> => {
    // ユーザーメッセージをログに追加
    setAgentLog(prev => [...prev, { role: 'user', content: input }]);
    setCurrentState({ status: 'thinking', step: 0, message: '考え中...' });
    setShowAgentPanel(true);

    const loop = agentLoopRef.current;
    const unsubscribe = loop.onStateChange((state: AgentState) => {
      setCurrentState(state);

      if (state.status === 'done') {
        setAgentLog(prev => [...prev, { role: 'assistant', content: state.result }]);
        unsubscribe();
        setCurrentState({ status: 'idle' });
      } else if (state.status === 'error') {
        setAgentLog(prev => [...prev, { role: 'assistant', content: `エラー: ${state.message}` }]);
        unsubscribe();
        setCurrentState({ status: 'idle' });
      } else if (state.status === 'stopped') {
        setAgentLog(prev => [...prev, { role: 'system', content: '停止しました' }]);
        unsubscribe();
        setCurrentState({ status: 'idle' });
      }
    });

    await loop.run(input);
  }, []);

  const handleStop = useCallback((): void => {
    agentLoopRef.current.stop();
  }, []);

  const handleSelectModel = useCallback((): void => {
    // 将来: モデル選択モーダル
    console.log('[Waza] model select requested');
  }, []);

  // MultiFileEdit Accept/Reject
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
    const file = pendingEdit.files.find(f => f.path === path);
    if (!file) return;
    await applyMultiFileEdit({ ...pendingEdit, files: [file] });
    const remaining = pendingEdit.files.filter(f => f.path !== path);
    setPendingEdit(remaining.length > 0 ? { ...pendingEdit, files: remaining } : null);
  }, [pendingEdit, applyMultiFileEdit]);

  const handleRejectFile = useCallback((path: string): void => {
    if (!pendingEdit) return;
    const remaining = pendingEdit.files.filter(f => f.path !== path);
    setPendingEdit(remaining.length > 0 ? { ...pendingEdit, files: remaining } : null);
  }, [pendingEdit]);

  const isRunning = currentState.status === 'thinking' || currentState.status === 'acting';

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      background: tokens.color.bg.base,
      color: tokens.color.text.primary,
      fontFamily: tokens.font.sans,
      fontSize: tokens.font.size.base,
      overflow: 'hidden',
    }}>
      {/* TitleBar */}
      <TitleBar projectName={rootDir?.split('/').pop() ?? null} />

      {/* メインレイアウト */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ActivityBar (48px) */}
        <ActivityBar
          activeTab={activityTab}
          onTabChange={setActivityTab}
        />

        {/* Sidebar (240px) */}
        <Sidebar
          activeTab={activityTab}
          rootDir={rootDir}
          onSelectFile={openTab}
          onOpenFolder={handleOpenFolder}
          selectedPath={activeTab?.path ?? null}
        />

        {/* MainArea */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* TabBar */}
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelect={setActiveTabId}
            onClose={closeTab}
          />

          {/* エディタ + AgentPanel（横並び） */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Monaco エディタ */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Editor
                tab={activeTab}
                onChange={updateContent}
                onSave={saveTab}
              />
            </div>

            {/* AgentPanel（実行中 or ログあり の場合のみ表示） */}
            {showAgentPanel && (
              <div style={{
                width: 320,
                flexShrink: 0,
                borderLeft: `1px solid ${tokens.color.bg.border}`,
                background: tokens.color.bg.surface,
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* パネルヘッダー */}
                <div style={{
                  height: 32,
                  padding: `0 ${tokens.space.md}px`,
                  borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: tokens.font.size.xs,
                    fontWeight: tokens.font.weight.semibold,
                    color: tokens.color.text.tertiary,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}>
                    Agent
                  </span>
                  <button
                    id="close-agent-panel-btn"
                    onClick={() => setShowAgentPanel(false)}
                    style={{
                      fontSize: 14,
                      color: tokens.color.text.tertiary,
                      padding: `0 ${tokens.space.xs}px`,
                      background: 'transparent',
                      transition: `color ${tokens.transition.fast}`,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.secondary;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.tertiary;
                    }}
                    title="パネルを閉じる"
                  >
                    ×
                  </button>
                </div>
                <AgentPanel log={agentLog} currentState={currentState} />
              </div>
            )}
          </div>

          {/* MultiFileDiff（保留中変更がある場合） */}
          {pendingEdit && pendingEdit.files.length > 0 && (
            <MultiFileDiffView
              edit={pendingEdit}
              onAcceptAll={handleAcceptAll}
              onRejectAll={handleRejectAll}
              onAcceptFile={handleAcceptFile}
              onRejectFile={handleRejectFile}
            />
          )}

          {/* Composer（下部固定） */}
          <Composer
            currentFile={activeTab?.path ?? null}
            running={isRunning}
            onSubmit={input => { void handleSubmit(input); }}
            onStop={handleStop}
            currentModel={currentModel}
            onSelectModel={handleSelectModel}
          />
        </div>
      </div>
    </div>
  );
}
