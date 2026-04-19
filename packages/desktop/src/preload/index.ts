import { contextBridge, ipcRenderer } from 'electron';

// renderer → main への安全なブリッジ
contextBridge.exposeInMainWorld('wazaAPI', {
  fs: {
    readFile: (filePath: string) =>
      ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    readDir: (dirPath: string) =>
      ipcRenderer.invoke('fs:readDir', dirPath),
  },
  dialog: {
    openFolder: () =>
      ipcRenderer.invoke('dialog:openFolder'),
  },
  agent: {
    exec: (command: string, cwd: string) =>
      ipcRenderer.invoke('agent:exec', command, cwd),
  },
  updater: {
    checkForUpdates: () =>
      ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: () =>
      ipcRenderer.invoke('updater:downloadUpdate'),
    quitAndInstall: () =>
      ipcRenderer.invoke('updater:quitAndInstall'),
    onStatus: (callback: (status: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, status: unknown): void =>
        callback(status);
      ipcRenderer.on('updater:status', handler);
      return () => ipcRenderer.removeListener('updater:status', handler);
    },
  },
  // Codex Mode Phase 3 — Task IPC
  task: {
    create: (payload: unknown) =>
      ipcRenderer.invoke('task:create', payload),
    control: (payload: unknown) =>
      ipcRenderer.invoke('task:control', payload),
    snapshot: () =>
      ipcRenderer.invoke('task:snapshot'),
    onUpdate: (callback: (patch: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, patch: unknown): void =>
        callback(patch);
      ipcRenderer.on('task:update', handler);
      return () => ipcRenderer.removeListener('task:update', handler);
    },
  },
});
