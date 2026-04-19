/**
 * ConversationView — Main area chat display (Codex-style)
 *
 * Shows user messages and assistant responses in a scrollable chat view.
 * Displays thinking/acting status while the agent is working.
 */
import { useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext.js';
import type { AgentState } from '../agent/types.js';

interface LogEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConversationViewProps {
  agentLog: LogEntry[];
  currentState: AgentState;
}

export function ConversationView({ agentLog, currentState }: ConversationViewProps): JSX.Element {
  const { tokens } = useTheme();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentLog.length, currentState.status]);

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      padding: `${tokens.space.xl}px`,
      gap: tokens.space.lg,
    }}>
      {/* Messages */}
      {agentLog.map((entry, i) => (
        <div
          key={i}
          style={{
            maxWidth: 720,
            width: '100%',
            alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start',
            marginLeft: entry.role === 'user' ? 'auto' : 0,
            marginRight: entry.role === 'user' ? 0 : 'auto',
          }}
        >
          {/* Role label */}
          <div style={{
            fontSize: tokens.font.size.xs,
            fontWeight: tokens.font.weight.semibold,
            color: entry.role === 'user'
              ? tokens.color.text.secondary
              : entry.role === 'system'
                ? tokens.color.accent.amber
                : tokens.color.accent.blue,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {entry.role === 'user' ? 'You' : entry.role === 'assistant' ? 'Waza' : 'System'}
          </div>

          {/* Message bubble */}
          <div style={{
            background: entry.role === 'user'
              ? tokens.color.bg.active
              : entry.role === 'system'
                ? tokens.color.accent.amber + '08'
                : tokens.color.bg.surface,
            border: entry.role === 'system'
              ? `1px solid ${tokens.color.accent.amber}22`
              : entry.role === 'assistant'
                ? `1px solid ${tokens.color.bg.border}`
                : 'none',
            borderRadius: tokens.radius.lg,
            padding: `${tokens.space.md}px ${tokens.space.lg}px`,
            fontSize: tokens.font.size.sm,
            color: tokens.color.text.primary,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: entry.role === 'system' ? tokens.font.mono : tokens.font.sans,
          }}>
            {entry.content}
          </div>
        </div>
      ))}

      {/* Thinking / Acting indicator */}
      {(currentState.status === 'thinking' || currentState.status === 'acting') && (
        <div style={{
          maxWidth: 720,
          alignSelf: 'flex-start',
        }}>
          <div style={{
            fontSize: tokens.font.size.xs,
            fontWeight: tokens.font.weight.semibold,
            color: tokens.color.accent.blue,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Waza
          </div>
          <div style={{
            background: tokens.color.bg.surface,
            border: `1px solid ${tokens.color.bg.border}`,
            borderRadius: tokens.radius.lg,
            padding: `${tokens.space.md}px ${tokens.space.lg}px`,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.space.sm,
            fontSize: tokens.font.size.sm,
            color: tokens.color.text.secondary,
          }}>
            {/* Animated dots */}
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: tokens.color.accent.blue,
                  animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
            <span>{currentState.message ?? (currentState.status === 'thinking' ? 'Thinking…' : 'Executing…')}</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
