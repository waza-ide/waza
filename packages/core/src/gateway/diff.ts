/**
 * Diff generation — Codex Mode Phase 2
 *
 * Generates a unified diff between the current file content on disk
 * and the proposed new content from an agent write_file action.
 *
 * Uses the `diff` npm package which is a pure JS implementation
 * (no native binaries, works in both Node and browser contexts).
 */
import { createTwoFilesPatch } from 'diff';

export interface DiffResult {
  /** Unified diff in the standard patch format */
  patch: string;
  /** true when the file did not exist before (new file) */
  isNewFile: boolean;
  /** Number of lines added */
  addedLines: number;
  /** Number of lines removed */
  removedLines: number;
}

/**
 * Generate a unified diff between the on-disk content for `filePath`
 * and the proposed `newContent`.
 *
 * In Electron (renderer process), file reading is done via the wazaAPI
 * contextBridge — pass a `readFileFn` that wraps `window.wazaAPI.fs.readFile`.
 *
 * In Node (Main process or tests), pass `(p) => fs.promises.readFile(p, 'utf-8')`.
 *
 * @param filePath   Absolute or workspace-relative path shown in the diff header.
 * @param newContent Proposed content produced by the agent.
 * @param readFileFn Async function that resolves to the current file content,
 *                   or rejects/throws when the file does not exist.
 */
export async function generateDiff(
  filePath: string,
  newContent: string,
  readFileFn: (path: string) => Promise<string>
): Promise<DiffResult> {
  let oldContent = '';
  let isNewFile = false;

  try {
    oldContent = await readFileFn(filePath);
  } catch {
    // File does not exist yet — treat as new file
    isNewFile = true;
    oldContent = '';
  }

  const oldLabel = isNewFile ? '/dev/null' : filePath;
  const newLabel = filePath;

  const patch = createTwoFilesPatch(
    oldLabel,
    newLabel,
    oldContent,
    newContent,
    isNewFile ? '(new file)' : undefined,
    undefined,
    { context: 4 }
  );

  // Count +/- lines in the hunk body (skip the header lines)
  let addedLines = 0;
  let removedLines = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) addedLines++;
    if (line.startsWith('-') && !line.startsWith('---')) removedLines++;
  }

  return { patch, isNewFile, addedLines, removedLines };
}

/**
 * Parse a unified diff string into colored line segments for the ReviewModal.
 */
export type DiffLineType = 'added' | 'removed' | 'context' | 'header';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  lineNumber?: number;
}

export function parseDiffLines(patch: string): DiffLine[] {
  const lines = patch.split('\n');
  const result: DiffLine[] = [];
  let newLineNum = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Extract the new-file starting line from the hunk header: @@ -a,b +c,d @@
      const match = /\+(\d+)/.exec(line);
      newLineNum = match ? parseInt(match[1]!, 10) - 1 : 0;
      result.push({ type: 'header', content: line });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      newLineNum++;
      result.push({ type: 'added', content: line.slice(1), lineNumber: newLineNum });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({ type: 'removed', content: line.slice(1) });
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file" — skip silently
    } else if (line.startsWith('---') || line.startsWith('+++')) {
      result.push({ type: 'header', content: line });
    } else {
      if (line.length > 0) newLineNum++;
      result.push({ type: 'context', content: line.slice(1), lineNumber: newLineNum });
    }
  }

  return result;
}
