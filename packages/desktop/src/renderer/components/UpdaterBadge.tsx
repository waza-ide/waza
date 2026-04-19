import { useState, useEffect } from 'react';

type UpdaterStatusType =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number; bytesPerSecond: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string };

export function UpdaterBadge(): JSX.Element | null {
  const [status, setStatus] = useState<UpdaterStatusType>({ type: 'idle' });

  useEffect(() => {
    // updater APIが未実装の環境（開発等）では何もしない
    if (!window.wazaAPI?.updater) return;

    const unsubscribe = window.wazaAPI.updater.onStatus(s => {
      setStatus(s as UpdaterStatusType);
      if (s.type === 'error') console.error('[updater]', s.message);
    });
    return unsubscribe;
  }, []);

  // idle / checking / not-available / error → 何も表示しない
  if (
    status.type === 'idle' ||
    status.type === 'checking' ||
    status.type === 'not-available' ||
    status.type === 'error'
  ) {
    return null;
  }

  // アップデート利用可能
  if (status.type === 'available') {
    return (
      <button
        id="updater-download-btn"
        onClick={() => void window.wazaAPI.updater.downloadUpdate()}
        style={{
          fontSize: 11,
          padding: '3px 10px',
          background: '#1f6feb',
          border: 'none',
          borderRadius: 4,
          color: '#fff',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ↑ v{status.version} へ更新
      </button>
    );
  }

  // ダウンロード中
  if (status.type === 'downloading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: '#8b949e',
      }}>
        <div style={{
          width: 72,
          height: 4,
          background: '#21262d',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${status.percent}%`,
            background: '#1f6feb',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span>{status.percent}%</span>
      </div>
    );
  }

  // ダウンロード完了
  if (status.type === 'downloaded') {
    return (
      <button
        id="updater-install-btn"
        onClick={() => window.wazaAPI.updater.quitAndInstall()}
        style={{
          fontSize: 11,
          padding: '3px 10px',
          background: '#238636',
          border: 'none',
          borderRadius: 4,
          color: '#fff',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ✓ 再起動してインストール
      </button>
    );
  }

  return null;
}
