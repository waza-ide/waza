import { useState, useCallback, useRef } from 'react';
import { ModelRouter } from '@waza/core';
import { useTheme } from './context/ThemeContext.js';
import { TitleBar } from './components/layout/TitleBar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import type { ThreadGroup } from './components/layout/Sidebar.js';
import { StatusBar } from './components/layout/StatusBar.js';
import { TabBar } from './components/TabBar.js';
import { Editor } from './components/Editor.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { AgentPanel } from './components/AgentPanel.js';
import { Composer } from './components/Composer.js';
import type { ModelId } from './components/Composer.js';
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
  const { tokens } = useTheme();

  const [rootDir, setRootDir] = useState<string | null>(null);
  const [agentLog, setAgentLog] = useState<LogEntry[]>([]);
  const [currentState, setCurrentState] = useState<AgentState>({ status: 'idle' });
  const [pendingEdit, setPendingEdit] = useState<MultiFileEdit | null>(null);
  const [threadName, setThreadName] = useState<string | null>(null);
  const [showAgentPanel, setShowAgentPanel] = useState(false);

  // スレッドグループ (MVP: 空 = ファイルツリーモード)
  const [threadGroups] = useState<ThreadGroup[]>([]);
  const [activeThreadId] = useState<string | null>(null);

  const agentLoopRef = useRef<DesktopAgentLoop>(new DesktopAgentLoop(router, ''));

  const {
    tabs, activeTab, activeTabId,
    openTab, closeTab, updateContent, saveTab, applyMultiFileEdit, setActiveTabId,
  } = useEditorTabs();

  const handleOpenFolder = useCallback(async (): Promise<void> => {
    const dir = await window.wazaAPI.dialog.openFolder();
    if (dir) {
      setRootDir(dir);
      agentLoopRef.current.setWorkDir(dir);
    }
  }, []);

  const handleSubmit = useCallback(async (input: string, _modelId: ModelId): Promise<void> => {
    // スレッド名設定（最初の40文字）
    setThreadName(input.length > 40 ? input.slice(0, 40) + '...' : input);
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

  const handleNewThread = useCallback((): void => {
    setAgentLog([]);
    setCurrentState({ status: 'idle' });
    setThreadName(null);
    setShowAgentPanel(false);
  }, []);

  // MultiFileEdit ハンドラ
  const handleAcceptAll = useCallback(async (): Promise<void> => {
    if (!pendingEdit) return;
    await applyMultiFileEdit(pendingEdit);
    setPendingEdit(null);
  }, [pendingEdit, applyMultiFileEdit]);

  const handleRejectAll = useCallback((): void => setPendingEdit(null), []);

  const handleAcceptFile = useCallback(async (path: string): Promise<void> => {
    if (!pendingEdit) return;
    const file = pendingEdit.files.find(f => f.path === path);
    if (file) await applyMultiFileEdit({ ...pendingEdit, files: [file] });
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
      <TitleBar threadName={threadName} />

      {/* メインボディ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar (260px) — ActivityBar廃止 */}
        <Sidebar
          rootDir={rootDir}
          onOpenFolder={handleOpenFolder}
          onSelectFile={openTab}
          selectedPath={activeTab?.path ?? null}
          threadGroups={threadGroups}
          activeThreadId={activeThreadId}
          onSelectThread={() => {}}
          onNewThread={handleNewThread}
        />

        {/* MainArea */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
          background: tokens.color.bg.base,
        }}>
          {/* TabBar（タブがある場合のみ） */}
          {tabs.length > 0 && (
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelect={setActiveTabId}
              onClose={closeTab}
            />
          )}

          {/* コンテンツエリア */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* エディタ or WelcomeScreen */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {activeTab ? (
                <Editor
                  tab={activeTab}
                  onChange={updateContent}
                  onSave={saveTab}
                />
              ) : (
                <WelcomeScreen
                  projectName={rootDir?.split('/').pop() ?? null}
                  onOpenFolder={handleOpenFolder}
                />
              )}
            </div>

            {/* AgentPanel（実行中 or ログあり の場合のみ） */}
            {showAgentPanel && (
              <div style={{
                width: 300,
                flexShrink: 0,
                borderLeft: `1px solid ${tokens.color.bg.border}`,
                background: tokens.color.bg.sidebar,
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
                    letterSpacing: '0.05em',
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
                      transition: `color ${tokens.transition.fast}`,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.primary;
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

          {/* MultiFileDiff */}
          {pendingEdit && pendingEdit.files.length > 0 && (
            <div style={{
              borderTop: `1px solid ${tokens.color.bg.border}`,
              maxHeight: 260,
              overflow: 'auto',
            }}>
              <MultiFileDiffView
                edit={pendingEdit}
                onAcceptAll={handleAcceptAll}
                onRejectAll={handleRejectAll}
                onAcceptFile={handleAcceptFile}
                onRejectFile={handleRejectFile}
              />
            </div>
          )}

          {/* Composer */}
          <Composer
            currentFile={activeTab?.path ?? null}
            running={isRunning}
            onSubmit={input => { void handleSubmit(input, 'auto'); }}
            onStop={handleStop}
          />

          {/* StatusBar */}
          <StatusBar
            mode="local"
            branch={null}
            projectPath={rootDir}
          />
        </div>
      </div>
    </div>
  );
}
