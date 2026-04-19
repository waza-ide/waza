import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import log from 'electron-log';

autoUpdater.logger = log;
(autoUpdater.logger as typeof log).transports.file.level = 'info';
autoUpdater.autoDownload = false;       // ダウンロードは手動トリガー
autoUpdater.autoInstallOnAppQuit = true; // 終了時に自動インストール

export function setupAutoUpdater(win: BrowserWindow): void {
  // IPC: アップデート確認
  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (err) {
      log.error('[updater] checkForUpdates error:', err);
      return null;
    }
  });

  // IPC: ダウンロード開始
  ipcMain.handle('updater:downloadUpdate', async () => {
    try {
      return await autoUpdater.downloadUpdate();
    } catch (err) {
      log.error('[updater] downloadUpdate error:', err);
      return null;
    }
  });

  // IPC: 再起動してインストール
  ipcMain.handle('updater:quitAndInstall', () => {
    autoUpdater.quitAndInstall();
  });

  // イベント → renderer に通知
  autoUpdater.on('checking-for-update', () => {
    win.webContents.send('updater:status', { type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('[updater] update available:', info.version);
    win.webContents.send('updater:status', {
      type: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : undefined,
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('[updater] update not available');
    win.webContents.send('updater:status', { type: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send('updater:status', {
      type: 'downloading',
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('[updater] update downloaded:', info.version);
    win.webContents.send('updater:status', {
      type: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    log.error('[updater] error:', err.message);
    win.webContents.send('updater:status', {
      type: 'error',
      message: err.message,
    });
  });

  // 起動5秒後に自動チェック（開発環境では無効）
  if (process.env['NODE_ENV'] !== 'development') {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        log.warn('[updater] auto-check failed:', err);
      });
    }, 5_000);
  }
}
