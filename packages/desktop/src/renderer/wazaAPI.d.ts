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
}

declare global {
  interface Window {
    wazaAPI: WazaAPI;
  }
}

export {};
