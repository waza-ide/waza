import React from "react";

export type LogLevel = "info" | "warn" | "error" | "success";

export type LogEntry = {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
};

type AgentLogProps = {
  entries: LogEntry[];
  maxHeight?: string;
};

const levelStyles: Record<LogLevel, React.CSSProperties> = {
  info: { color: "var(--vscode-foreground)" },
  warn: { color: "var(--vscode-editorWarning-foreground)" },
  error: { color: "var(--vscode-editorError-foreground)" },
  success: { color: "var(--vscode-terminal-ansiGreen)" },
};

const levelPrefix: Record<LogLevel, string> = {
  info: "ℹ",
  warn: "⚠",
  error: "✖",
  success: "✔",
};

/**
 * エージェントのログエントリーを一覧表示するコンポーネント
 * VSCode API に直接アクセスしない — メッセージパッシング経由でデータを受け取る
 */
export function AgentLog({
  entries,
  maxHeight = "300px",
}: AgentLogProps): React.ReactElement {
  const containerStyle: React.CSSProperties = {
    overflowY: "auto",
    maxHeight,
    fontFamily: "var(--vscode-editor-font-family, monospace)",
    fontSize: "0.85rem",
    padding: "8px",
    background: "var(--vscode-terminal-background)",
    borderRadius: "4px",
  };

  return (
    <div style={containerStyle} aria-label="エージェントログ" role="log">
      {entries.length === 0 ? (
        <span style={{ opacity: 0.5 }}>ログはまだありません</span>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              ...levelStyles[entry.level],
              marginBottom: "4px",
              wordBreak: "break-all",
            }}
          >
            <span style={{ opacity: 0.6, marginRight: "6px" }}>
              {entry.timestamp.toLocaleTimeString("ja-JP")}
            </span>
            <span style={{ marginRight: "6px" }}>
              {levelPrefix[entry.level]}
            </span>
            <span>{entry.message}</span>
          </div>
        ))
      )}
    </div>
  );
}
