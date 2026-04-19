import { useState, useCallback, useRef, useEffect } from 'react';
import { ModelRouter } from '@waza/core';
import { useTheme } from './context/ThemeContext.js';
import { useSettings } from './context/SettingsContext.js';
import { TitleBar } from './components/layout/TitleBar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import type { ThreadGroup } from './components/layout/Sidebar.js';
import { StatusBar } from './components/layout/StatusBar.js';
import { TabBar } from './components/TabBar.js';
import { Editor } from './components/Editor.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { AgentPanel } from './components/AgentPanel.js';
import { AgentPanelV2 } from './components/AgentPanelV2.js';
import { Composer } from './components/Composer.js';
import type { ModelId } from './components/Composer.js';
import { MultiFileDiffView } from './components/MultiFileDiffView.js';
import { useEditorTabs } from './hooks/useEditorTabs.js';
import { DesktopAgentLoop } from './agent/loop.js';
import type { AgentState } from './agent/types.js';
import type { MultiFileEdit } from './types/editor.js';
import { useTaskStore } from './stores/taskStore.js';
import type { Task } from '@waza/core';
import { ReviewModal } from './components/review/ReviewModal.js';
import type { ReviewRequest, GatewayDecision } from '@waza/core';

interface LogEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const router = new ModelRouter();

export function App(): JSX.Element {
  const { tokens } = useTheme();
  const { settings } = useSettings();
  const { createTask, setActive: setActiveTask, activeTaskId } = useTaskStore();

  const [rootDir, setRootDir] = useState<string | null>(null);
  const [agentLog, setAgentLog] = useState<LogEntry[]>([]);
  const [currentState, setCurrentState] = useState<AgentState>({ status: 'idle' });
  const [pendingEdit, setPendingEdit] = useState<MultiFileEdit | null>(null);
  const [reviewRequest, setReviewRequest] = useState<ReviewRequest | null>(null);
  const [resolveReview, setResolveReview] = useState<((d: GatewayDecision) => void) | null>(null);
  const [threadName, setThreadName] = useState<string | null>(null);
  const [showAgentPanel, setShowAgentPanel] = useState(false);

  // Thread groups (empty = file tree mode)
  const [threadGroups] = useState<ThreadGroup[]>([]);
  const [activeThreadId] = useState<string | null>(null);

  const agentLoopRef = useRef<DesktopAgentLoop>(new DesktopAgentLoop(router, ''));

  // Wire ReviewGateway handler once on mount
  useEffect(() => {
    agentLoopRef.current.setReviewHandler(
      (req: ReviewRequest): Promise<GatewayDecision> =>
        new Promise(resolve => {
          setReviewRequest(req);
          setResolveReview(() => (d: GatewayDecision) => {
            setReviewRequest(null);
            setResolveReview(null);
            resolve(d);
          });
        })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSubmit = useCallback(async (input: string, modelId: ModelId): Promise<void> => {
    setThreadName(input.length > 40 ? input.slice(0, 40) + '…' : input);
    setAgentLog(prev => [...prev, { role: 'user', content: input }]);
    setCurrentState({ status: 'thinking', step: 0, message: 'Thinking…' });
    setShowAgentPanel(true);

    const loop = agentLoopRef.current;
    const unsubscribe = loop.onStateChange((state: AgentState) => {
      setCurrentState(state);
      if (state.status === 'done') {
        setAgentLog(prev => [...prev, { role: 'assistant', content: state.result }]);
        unsubscribe();
        setCurrentState({ status: 'idle' });
      } else if (state.status === 'error') {
        setAgentLog(prev => [...prev, { role: 'assistant', content: `Error: ${state.message}` }]);
        unsubscribe();
        setCurrentState({ status: 'idle' });
      } else if (state.status === 'stopped') {
        setAgentLog(prev => [...prev, { role: 'system', content: 'Stopped.' }]);
        unsubscribe();
        setCurrentState({ status: 'idle' });
      }
    });
    // Pass modelId and current settings to the loop
    await loop.run(input, modelId, {
      cocoroBaseUrl:   settings.cocoroBaseUrl,
      cocoroApiKey:    settings.cocoroApiKey,
      cocoroModel:     settings.cocoroModel,
      ollamaBaseUrl:   settings.ollamaBaseUrl,
      ollamaModel:     settings.ollamaModel,
      anthropicApiKey: settings.anthropicApiKey,
      geminiApiKey:    settings.geminiApiKey,
      maxSteps:        settings.maxSteps,
    });
  }, [settings]);

  const handleStop = useCallback((): void => {
    agentLoopRef.current.stop();
  }, []);

  const handleNewThread = useCallback((): void => {
    setAgentLog([]);
    setCurrentState({ status: 'idle' });
    setThreadName(null);
    setShowAgentPanel(false);
  }, []);

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
      borderRadius: 12,   // matches window rounding
    }}>
      {/* TitleBar */}
      <TitleBar threadName={threadName} />

      {/* Main body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
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

        {/* Main content area */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Editor column */}
          <div style={{
            flex: activeTab ? 1 : (showAgentPanel ? 1 : 1),
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
            background: tokens.color.bg.base,
          }}>
            {/* TabBar */}
            {tabs.length > 0 && (
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSelect={setActiveTabId}
                onClose={closeTab}
              />
            )}

            {/* Editor or Welcome */}
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

            {/* Multi-file diff */}
            {pendingEdit && pendingEdit.files.length > 0 && (
              <div style={{
                borderTop: `1px solid ${tokens.color.bg.border}`,
                maxHeight: 260,
                overflow: 'auto',
                flexShrink: 0,
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

            {/* Composer — fixed at bottom of main column */}
            <div style={{
              borderTop: `1px solid ${tokens.color.bg.border}`,
              flexShrink: 0,
            }}>
              <Composer
                currentFile={activeTab?.path ?? null}
                running={isRunning}
                onSubmit={(input, modelId) => { void handleSubmit(input, modelId); }}
                onStop={handleStop}
              />
            </div>

            {/* StatusBar */}
            <StatusBar
              mode="local"
              branch={null}
              projectPath={rootDir}
            />
          </div>

          {/* Agent panel — Codex-style right pane */}
          {showAgentPanel && (
            <div style={{
              width: 320,
              flexShrink: 0,
              borderLeft: `1px solid ${tokens.color.bg.border}`,
              background: tokens.color.bg.sidebar,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Panel header */}
              <div style={{
                height: 36,
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
                  title="Close panel"
                  style={{
                    color: tokens.color.text.tertiary,
                    fontSize: 16,
                    lineHeight: 1,
                    padding: '2px 4px',
                    borderRadius: tokens.radius.sm,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.primary;
                    (e.currentTarget as HTMLButtonElement).style.background = tokens.color.bg.active;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text.tertiary;
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  ×
                </button>
              </div>

              {/* Agent panel — Codex-mode taskStore view */}
              <AgentPanelV2 />
            </div>
          )}
        </div>
      </div>
    </div>
    {reviewRequest && resolveReview && (
      <ReviewModal
        request={reviewRequest}
        onDecision={resolveReview}
      />
    )}
  );
}