import React from "react";

export type DiffLine = {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: number;
};

type DiffViewProps = {
  filePath: string;
  lines: DiffLine[];
};

const lineStyles: Record<DiffLine["type"], React.CSSProperties> = {
  added: {
    background: "rgba(0, 200, 100, 0.15)",
    color: "var(--vscode-terminal-ansiGreen)",
  },
  removed: {
    background: "rgba(200, 50, 50, 0.15)",
    color: "var(--vscode-editorError-foreground)",
  },
  unchanged: {
    color: "var(--vscode-foreground)",
  },
};

const linePrefix: Record<DiffLine["type"], string> = {
  added: "+",
  removed: "-",
  unchanged: " ",
};

/**
 * ファイル差分を表示するコンポーネント
 */
export function DiffView({
  filePath,
  lines,
}: DiffViewProps): React.ReactElement {
  return (
    <div
      style={{
        fontFamily: "var(--vscode-editor-font-family, monospace)",
        fontSize: "0.85rem",
        border: "1px solid var(--vscode-panel-border)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "6px 12px",
          background: "var(--vscode-editorGroupHeader-tabsBackground)",
          borderBottom: "1px solid var(--vscode-panel-border)",
          fontSize: "0.8rem",
          opacity: 0.8,
        }}
      >
        {filePath}
      </div>
      <div
        style={{
          overflowX: "auto",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        {lines.map((line) => (
          <div
            key={`${line.lineNumber}-${line.type}`}
            style={{
              ...lineStyles[line.type],
              display: "flex",
              padding: "1px 8px",
              whiteSpace: "pre",
            }}
          >
            <span
              style={{ minWidth: "32px", opacity: 0.5, userSelect: "none" }}
            >
              {line.lineNumber}
            </span>
            <span style={{ minWidth: "16px", opacity: 0.7 }}>
              {linePrefix[line.type]}
            </span>
            <span>{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
