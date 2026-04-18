import { useState, useRef, useEffect } from 'react';
import { ModelRouter } from '@waza/core';

interface WazaSidebarProps {
  currentFile: string | null;
}

interface LogEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const router = new ModelRouter();

export function WazaSidebar({ currentFile }: WazaSidebarProps): JSX.Element {
  const [input, setInput] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  async function handleSubmit(): Promise<void> {
    if (!input.trim() || running) return;

    const userMessage = input.trim();
    setInput('');
    setLog(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }]);
    setRunning(true);

    try {
      const systemContent = currentFile
        ? `あなたはWazaというAIコーディングアシスタントです。現在編集中のファイル: ${currentFile}`
        : 'あなたはWazaというAIコーディングアシスタントです。';

      const provider = await router.route({ provider: 'auto', model: 'default' });
      const response = await provider.complete({
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userMessage },
        ],
        model: provider.model,
        maxTokens: 2048,
      });

      setLog(prev => [...prev, {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setLog(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ エラー: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date(),
      }]);
    } finally {
      setRunning(false);
    }
  }

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
            <div>Wazaに質問してください</div>
          </div>
        )}
        {log.map((entry, i) => (
          <div key={i} style={{
            alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            background: entry.role === 'user' ? '#1f6feb' : '#161b22',
            border: `1px solid ${entry.role === 'user' ? '#1f6feb' : '#30363d'}`,
            borderRadius: entry.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
            padding: '8px 12px',
            fontSize: 13,
            lineHeight: 1.6,
            color: '#c9d1d9',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {entry.content}
          </div>
        ))}
        {running && (
          <div style={{
            alignSelf: 'flex-start',
            color: '#8b949e',
            fontSize: 13,
            padding: '4px 8px',
          }}>
            ⠋ 考え中...
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
            style={{
              flex: 1,
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 6,
              color: '#c9d1d9',
              fontSize: 13,
              padding: '8px 10px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
          <button
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
