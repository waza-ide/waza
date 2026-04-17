import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type ToolResult = {
  success: boolean;
  output: string;
};

export type FileDiff = {
  filePath: string;
  originalContent: string;
  newContent: string;
};

/**
 * ワークスペースルートを基準とした絶対パスを返す
 * ファイルパスが既に絶対パスの場合はそのまま返す
 */
function resolveWorkspacePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;

  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error(
      "ワークスペースが開かれていません。フォルダを開いてから再試行してください。"
    );
  }

  return path.join(folders[0].uri.fsPath, filePath);
}

/**
 * ファイル読み込みツール
 * ワークスペース相対パス・絶対パスの両方に対応する
 */
export async function readFile(filePath: string): Promise<ToolResult> {
  try {
    const absPath = resolveWorkspacePath(filePath);
    const content = await fs.readFile(absPath, "utf-8");
    return {
      success: true,
      output: content,
    };
  } catch (error) {
    return {
      success: false,
      output: `ファイル読み込みエラー: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * ファイル書き込みツール
 * 書き込み前に元のファイル内容を読んで FileDiff を生成する
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<{ result: ToolResult; diff: FileDiff }> {
  const absPath = resolveWorkspacePath(filePath);

  // 書き込み前に元のファイルを読む（存在しない場合は空文字）
  let originalContent = "";
  try {
    originalContent = await fs.readFile(absPath, "utf-8");
  } catch {
    // ファイルが存在しない場合は新規作成
  }

  try {
    // 親ディレクトリが存在しない場合は作成する
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content, "utf-8");

    return {
      result: {
        success: true,
        output: `ファイルを書き込みました: ${filePath}`,
      },
      diff: {
        filePath,
        originalContent,
        newContent: content,
      },
    };
  } catch (error) {
    return {
      result: {
        success: false,
        output: `ファイル書き込みエラー: ${error instanceof Error ? error.message : String(error)}`,
      },
      diff: {
        filePath,
        originalContent,
        newContent: content,
      },
    };
  }
}

/**
 * ディレクトリ一覧ツール
 * ファイル・ディレクトリを再帰なしで一覧する
 */
export async function listDirectory(dirPath: string): Promise<ToolResult> {
  try {
    const absPath = resolveWorkspacePath(dirPath);
    const entries = await fs.readdir(absPath, { withFileTypes: true });

    const lines = entries
      .sort((a, b) => {
        // ディレクトリを先に表示
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      })
      .map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`);

    return {
      success: true,
      output: lines.length > 0 ? lines.join("\n") : "（空のディレクトリ）",
    };
  } catch (error) {
    return {
      success: false,
      output: `ディレクトリ一覧エラー: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * ファイル検索ツール（glob パターン対応）
 * vscode.workspace.findFiles を使用する
 */
export async function findFiles(pattern: string): Promise<ToolResult> {
  try {
    const uris = await vscode.workspace.findFiles(
      pattern,
      "**/node_modules/**",
      100 // 最大100件
    );

    if (uris.length === 0) {
      return {
        success: true,
        output: `パターン "${pattern}" に一致するファイルはありません`,
      };
    }

    const folders = vscode.workspace.workspaceFolders;
    const rootPath = folders?.[0]?.uri.fsPath ?? "";

    const lines = uris
      .map((uri) => {
        const rel = path.relative(rootPath, uri.fsPath);
        return `📄 ${rel}`;
      })
      .sort();

    return {
      success: true,
      output: `${lines.length} 件見つかりました:\n${lines.join("\n")}`,
    };
  } catch (error) {
    return {
      success: false,
      output: `ファイル検索エラー: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
