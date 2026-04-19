import { useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext.js';
import type { AgentState } from '../agent/types.js';

interface LogEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AgentPanelProps {
  log: LogEntry[];
  currentState: AgentState;
}

export function AgentPanel({ log, currentState }: AgentPanelProps): JSX.Element {
  const { tokens } = useTheme();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length, currentState.status]);

  const STATE_ICON: Partial<Record<AgentState['status'], string>> = {
    idle: '○', thinking: '◎', acting: '▶',
    done: '✓', error: '✗', stopped: '□',
  };
  const STATE_COLOR: Partial<Record<AgentState['status'], string>> = {
    idle:     tokens.color.text.tertiary,
    thinking: tokens.color.accent.blue,
    acting:   tokens.color.accent.amber,
    done:     tokens.color.accent.green,
    error:    tokens.color.accent.red,
    stopped:  tokens.color.text.tertiary,
  };

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
        
        <span>Start a conversation below</span>
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
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.xs }}>
          <div style={{
            fontSize: tokens.font.size.xs,
            color: tokens.color.text.tertiary,
            fontWeight: tokens.font.weight.medium,
          }}>
            {entry.role === 'user' ? 'You' : entry.role === 'system' ? 'System' : 'Waza'}
          </div>
          <div style={{
            fontSize: tokens.font.size.sm,
            color: entry.role === 'user'
              ? tokens.color.text.primary
              : tokens.color.text.secondary,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {entry.content}
          </div>
        </div>
      ))}

      {/* 実行中 — アニメーションドット */}
      {(currentState.status === 'thinking' || currentState.status === 'acting') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.xs }}>
          <div style={{
            fontSize: tokens.font.size.xs,
            color: STATE_COLOR[currentState.status],
            display: 'flex',
            alignItems: 'center',
            gap: tokens.space.xs,
          }}>
            <span>{STATE_ICON[currentState.status]}</span>
            <span>
              {currentState.status === 'thinking' ? currentState.message : `Running: ${currentState.action}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: tokens.space.xs, paddingLeft: 2 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'inline-block',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: tokens.color.accent.blue,
                animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* error / stopped */}
      {(currentState.status === 'error' || currentState.status === 'stopped') && (
        <div style={{
          fontSize: tokens.font.size.xs,
          color: STATE_COLOR[currentState.status],
          display: 'flex',
          alignItems: 'center',
          gap: tokens.space.xs,
          padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
          background: `${STATE_COLOR[currentState.status]}18`,
          borderRadius: tokens.radius.md,
          border: `1px solid ${STATE_COLOR[currentState.status]}33`,
        }}>
          <span>{STATE_ICON[currentState.status]}</span>
          <span>
            {currentState.status === 'error'
              ? `Error: ${'message' in currentState ? currentState.message : ''}`
              : 'Stopped'}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
