export interface EditorTab {
  id: string;           // ユニークID（= ファイルパス）
  path: string;
  filename: string;
  content: string;
  isDirty: boolean;     // 未保存の変更あり
  language: string;
}

export interface MultiFileEdit {
  files: Array<{
    path: string;
    originalContent: string;
    newContent: string;
  }>;
  description: string;  // エージェントによる変更説明
}
