import { tokens } from '../styles/tokens.js';

interface LogEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AgentHistoryProps {
  entries?: LogEntry[];
}

export function AgentHistory({ entries = [] }: AgentHistoryProps): JSX.Element {
  if (entries.length === 0) {
    return (
      <div style={{
        padding: `${tokens.space.xl}px ${tokens.space.md}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: tokens.space.md,
      }}>
        <span style={{ fontSize: 28, opacity: 0.15 }}>技</span>
        <span style={{
          fontSize: tokens.font.size.sm,
          color: tokens.color.text.tertiary,
          textAlign: 'center',
        }}>
          履歴はまだありません
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: `${tokens.space.sm}px 0` }}>
      {entries.map((entry, i) => (
        <div
          key={i}
          style={{
            padding: `${tokens.space.sm}px ${tokens.space.md}px`,
            cursor: 'pointer',
            borderBottom: `1px solid ${tokens.color.bg.borderSub}`,
          }}
        >
          <div style={{
            fontSize: tokens.font.size.xs,
            color: tokens.color.text.tertiary,
            marginBottom: tokens.space.xs,
          }}>
            {entry.role === 'user' ? 'あなた' : 'Waza'} · {
              entry.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
            }
          </div>
          <div style={{
            fontSize: tokens.font.size.sm,
            color: tokens.color.text.secondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {entry.content}
          </div>
        </div>
      ))}
    </div>
  );
}
