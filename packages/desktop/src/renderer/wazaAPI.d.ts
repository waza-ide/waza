interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

type UpdaterStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number; bytesPerSecond: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string };

interface WazaAPI {
  fs: {
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    readDir(dirPath: string): Promise<DirEntry[]>;
  };
  dialog: {
    openFolder(): Promise<string | null>;
  };
  agent: {
    exec(command: string, cwd: string): Promise<{ success: boolean; output: string }>;
  };
  updater: {
    checkForUpdates(): Promise<void>;
    downloadUpdate(): Promise<void>;
    quitAndInstall(): void;
    onStatus(callback: (status: UpdaterStatus) => void): () => void;
  };
}

declare global {
  interface Window {
    wazaAPI: WazaAPI;
  }
}

export {};
