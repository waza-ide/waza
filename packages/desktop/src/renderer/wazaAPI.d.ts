interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

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
}

declare global {
  interface Window {
    wazaAPI: WazaAPI;
  }
}

export {};
