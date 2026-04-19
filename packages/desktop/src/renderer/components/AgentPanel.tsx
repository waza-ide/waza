import { useRef, useEffect } from 'react';
import { tokens } from '../styles/tokens.js';
import type { AgentState } from '../agent/types.js';

interface LogEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AgentPanelProps {
  log: LogEntry[];
  currentState: AgentState;
}

const STATE_ICON: Partial<Record<AgentState['status'], string>> = {
  idle:     '○',
  thinking: '◎',
  acting:   '▶',
  done:     '✓',
  error:    '✗',
  stopped:  '□',
};

const STATE_COLOR: Partial<Record<AgentState['status'], string>> = {
  idle:     tokens.color.text.tertiary,
  thinking: tokens.color.accent.blue,
  acting:   tokens.color.accent.amber,
  done:     tokens.color.accent.green,
  error:    tokens.color.accent.red,
  stopped:  tokens.color.text.tertiary,
};

export function AgentPanel({ log, currentState }: AgentPanelProps): JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length, currentState.status]);

  if (log.length === 0 && currentState.status === 'idle') {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: tokens.space.md,
        color: tokens.color.text.tertiary,
        fontSize: tokens.font.size.sm,
        padding: tokens.space.xl,
      }}>
        <span style={{ fontSize: 32, opacity: 0.2 }}>技</span>
        <span>Wazaに指示してください</span>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      padding: tokens.space.md,
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.space.md,
    }}>
      {log.map((entry, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.space.xs,
          }}
        >
          <div style={{
            fontSize: tokens.font.size.xs,
            color: tokens.color.text.tertiary,
            fontWeight: tokens.font.weight.medium,
          }}>
            {entry.role === 'user' ? 'あなた' : entry.role === 'system' ? 'System' : '技 Waza'}
          </div>
          <div style={{
            fontSize: tokens.font.size.sm,
            color: entry.role === 'user' ? tokens.color.text.primary : tokens.color.text.secondary,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {entry.content}
          </div>
        </div>
      ))}

      {/* 実行中ステータス */}
      {(currentState.status === 'thinking' || currentState.status === 'acting') && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.space.xs,
        }}>
          <div style={{
            fontSize: tokens.font.size.xs,
            color: STATE_COLOR[currentState.status],
            display: 'flex',
            alignItems: 'center',
            gap: tokens.space.xs,
          }}>
            <span>{STATE_ICON[currentState.status]}</span>
            <span>{
              currentState.status === 'thinking' ? currentState.message :
              currentState.status === 'acting' ? `実行: ${currentState.action}` : ''
            }</span>
          </div>
          {/* アニメーションドット */}
          <div style={{
            display: 'flex',
            gap: tokens.space.xs,
            paddingLeft: 2,
          }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: tokens.color.accent.blue,
                  animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* error / stopped / done のステータス表示 */}
      {(currentState.status === 'error' || currentState.status === 'stopped') && (
        <div style={{
          fontSize: tokens.font.size.xs,
          color: STATE_COLOR[currentState.status],
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space.xs,
          padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
          background: `${STATE_COLOR[currentState.status]}11`,
          borderRadius: tokens.radius.md,
          border: `1px solid ${STATE_COLOR[currentState.status]}33`,
        }}>
          <span>{STATE_ICON[currentState.status]}</span>
          <span>
            {currentState.status === 'error' ? `エラー: ${'message' in currentState ? currentState.message : ''}` : '停止しました'}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
