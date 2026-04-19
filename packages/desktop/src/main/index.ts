import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { setupAutoUpdater } from './updater.js';
import { setupTaskIpc } from './ipc/task.js';

const isDev = process.env['NODE_ENV'] === 'development';
const isMac = process.platform === 'darwin';

function createWindow(): BrowserWindow {
  // Hide the native menu bar (File/Edit/View etc)
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    // transparent window only works reliably on macOS
    // on Linux it causes a white screen (compositor issue)
    backgroundColor: isMac ? '#00000000' : '#0d1117',
    transparent: isMac,
    titleBarStyle: isMac ? 'hidden' : 'default',
    trafficLightPosition: isMac ? { x: 14, y: 12 } : undefined,
    roundedCorners: isMac,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    void win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    void win.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  return win;
}

// IPC: ファイル読み込み
ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  return fs.readFile(filePath, 'utf-8');
});

// IPC: ファイル書き込み
ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  return fs.writeFile(filePath, content, 'utf-8');
});

// IPC: ディレクトリ一覧
ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map(e => ({
    name: e.name,
    path: path.join(dirPath, e.name),
    isDirectory: e.isDirectory(),
  }));
});

// IPC: フォルダ選択ダイアログ
ipcMain.handle('dialog:openFolder', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0] ?? null;
});

// IPC: シェルコマンド実行（エージェントツール用）
ipcMain.handle('agent:exec', async (_event, command: string, cwd: string) => {
  const { execSync } = await import('node:child_process');
  try {
    const output = execSync(command, {
      cwd,
      timeout: 30_000,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });
    return { success: true, output: String(output) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, output: message };
  }
});

app.whenReady().then(() => {
  const win = createWindow();
  setupAutoUpdater(win);
  setupTaskIpc(win);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
