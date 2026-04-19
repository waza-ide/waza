import { useState, useRef, useEffect, useCallback } from 'react';
import { ModelRouter } from '@waza/core';
import { DesktopAgentLoop } from '../agent/loop.js';
import type { AgentState } from '../agent/types.js';

interface WazaSidebarProps {
  currentFile: string | null;
  rootDir?: string | null;
}

interface LogEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const router = new ModelRouter();
let agentLoop: DesktopAgentLoop | null = null;

function getOrCreateLoop(workDir: string): DesktopAgentLoop {
  if (!agentLoop) {
    agentLoop = new DesktopAgentLoop(router, workDir);
  }
  return agentLoop;
}

function stateToMessage(state: AgentState): string | null {
  switch (state.status) {
    case 'thinking': return `⠋ ${state.message}`;
    case 'acting': return `⚙️ ツール実行: ${state.action}`;
    case 'stopped': return '⏹ 停止しました';
    default: return null;
  }
}

export function WazaSidebar({ currentFile, rootDir }: WazaSidebarProps): JSX.Element {
  const [input, setInput] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [agentState, setAgentState] = useState<AgentState>({ status: 'idle' });
  const logEndRef = useRef<HTMLDivElement>(null);
  const workDir = rootDir ?? currentFile?.split('/').slice(0, -1).join('/') ?? process.cwd?.() ?? '/tmp';

  // agentLoopのworkDirを同期
  useEffect(() => {
    if (agentLoop) agentLoop.setWorkDir(workDir);
  }, [workDir]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log, agentState]);

  const running = agentState.status === 'thinking' || agentState.status === 'acting';

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!input.trim() || running) return;

    const userMessage = input.trim();
    setInput('');
    setLog(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }]);

    const loop = getOrCreateLoop(workDir);

    // StateChange ハンドラー登録（一時的）
    const unsubscribe = loop.onStateChange((state: AgentState) => {
      setAgentState(state);

      if (state.status === 'done') {
        setLog(prev => [...prev, {
          role: 'assistant',
          content: state.result,
          timestamp: new Date(),
        }]);
        unsubscribe();
        setAgentState({ status: 'idle' });
      } else if (state.status === 'error') {
        setLog(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ エラー: ${state.message}`,
          timestamp: new Date(),
        }]);
        unsubscribe();
        setAgentState({ status: 'idle' });
      } else if (state.status === 'stopped') {
        setLog(prev => [...prev, {
          role: 'system',
          content: '⏹ 停止しました',
          timestamp: new Date(),
        }]);
        unsubscribe();
        setAgentState({ status: 'idle' });
      }
    });

    await loop.run(userMessage);
  }, [input, running, workDir]);

  const handleStop = useCallback((): void => {
    agentLoop?.stop();
  }, []);

  const statusMessage = stateToMessage(agentState);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d1117',
    }}>
      {/* ヘッダー */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #21262d',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, color: '#58a6ff', fontSize: 14 }}>技 Waza</span>
        {currentFile && (
          <span style={{
            fontSize: 11,
            color: '#8b949e',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {currentFile.split('/').pop()}
          </span>
        )}
        {running && (
          <button
            id="stop-agent-btn"
            onClick={handleStop}
            title="停止"
            style={{
              padding: '2px 8px',
              background: '#b91c1c',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            ⏹ 停止
          </button>
        )}
      </div>

      {/* ログ */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {log.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#484f58',
            fontSize: 13,
            marginTop: 32,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>技</div>
            <div>Wazaに質問や指示をしてください</div>
            <div style={{ fontSize: 11, marginTop: 8, color: '#30363d' }}>
              ファイル操作・コマンド実行が可能です
            </div>
          </div>
        )}

        {log.map((entry, i) => (
          <div key={i} style={{
            alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            background:
              entry.role === 'user' ? '#1f6feb' :
              entry.role === 'system' ? '#21262d' : '#161b22',
            border: `1px solid ${
              entry.role === 'user' ? '#1f6feb' :
              entry.role === 'system' ? '#484f58' : '#30363d'
            }`,
            borderRadius: entry.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
            padding: '8px 12px',
            fontSize: 13,
            lineHeight: 1.6,
            color: entry.role === 'system' ? '#8b949e' : '#c9d1d9',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {entry.content}
          </div>
        ))}

        {/* 実行中ステータス */}
        {statusMessage && (
          <div style={{
            alignSelf: 'flex-start',
            color: '#8b949e',
            fontSize: 12,
            padding: '4px 8px',
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: 8,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>
            {statusMessage}
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      {/* 入力エリア */}
      <div style={{
        padding: 12,
        borderTop: '1px solid #21262d',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            id="waza-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Wazaに指示する（Shift+Enter で改行）"
            rows={3}
            disabled={running}
            style={{
              flex: 1,
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 6,
              color: running ? '#484f58' : '#c9d1d9',
              fontSize: 13,
              padding: '8px 10px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              cursor: running ? 'not-allowed' : 'text',
            }}
          />
          <button
            id="send-btn"
            onClick={() => { void handleSubmit(); }}
            disabled={running || !input.trim()}
            style={{
              padding: '0 14px',
              background: running || !input.trim() ? '#21262d' : '#1f6feb',
              border: 'none',
              borderRadius: 6,
              color: running || !input.trim() ? '#484f58' : '#fff',
              cursor: running || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: 13,
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            送信
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: '#484f58', textAlign: 'right' }}>
          Enter で送信 / Shift+Enter で改行
        </div>
      </div>
    </div>
  );
}
