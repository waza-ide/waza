import React from "react";

export type ModelOption = {
  id: string;
  label: string;
  kind: "local" | "cloud";
  available: boolean;
};

type ModelPickerProps = {
  options: ModelOption[];
  selectedId: string;
  onSelect: (id: string) => void;
};

/**
 * モデル選択コンポーネント
 * VSCode API に直接アクセスしない
 */
export function ModelPicker({
  options,
  selectedId,
  onSelect,
}: ModelPickerProps): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
      }}
      role="radiogroup"
      aria-label="モデルを選択"
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;

        return (
          <button
            key={option.id}
            id={`model-picker-${option.id}`}
            role="radio"
            aria-checked={isSelected}
            disabled={!option.available}
            onClick={() => option.available && onSelect(option.id)}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: isSelected
                ? "1px solid var(--vscode-focusBorder)"
                : "1px solid var(--vscode-panel-border)",
              background: isSelected
                ? "var(--vscode-button-background)"
                : "var(--vscode-editor-background)",
              color: isSelected
                ? "var(--vscode-button-foreground)"
                : option.available
                  ? "var(--vscode-foreground)"
                  : "var(--vscode-disabledForeground)",
              cursor: option.available ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: option.available
                  ? option.kind === "local"
                    ? "var(--vscode-terminal-ansiGreen)"
                    : "var(--vscode-terminal-ansiBlue)"
                  : "var(--vscode-disabledForeground)",
                display: "inline-block",
              }}
              aria-hidden="true"
            />
            {option.label}
            {!option.available && (
              <span style={{ opacity: 0.5 }}>(利用不可)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
