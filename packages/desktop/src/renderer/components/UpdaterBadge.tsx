import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext.js';

type UpdaterStatusType =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number; bytesPerSecond: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string };

export function UpdaterBadge(): JSX.Element | null {
  const { tokens } = useTheme();
  const [status, setStatus] = useState<UpdaterStatusType>({ type: 'idle' });

  useEffect(() => {
    if (!window.wazaAPI?.updater) return;
    const unsubscribe = window.wazaAPI.updater.onStatus(s => {
      setStatus(s as UpdaterStatusType);
      if (s.type === 'error') console.error('[updater]', s.message);
    });
    return unsubscribe;
  }, []);

  if (
    status.type === 'idle' ||
    status.type === 'checking' ||
    status.type === 'not-available' ||
    status.type === 'error'
  ) {
    return null;
  }

  if (status.type === 'available') {
    return (
      <button
        id="updater-download-btn"
        onClick={() => void window.wazaAPI.updater.downloadUpdate()}
        style={{
          fontSize: tokens.font.size.xs,
          padding: `3px ${tokens.space.sm}px`,
          background: tokens.color.accent.blue,
          border: 'none',
          borderRadius: tokens.radius.sm,
          color: '#fff',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ↑ v{status.version} へ更新
      </button>
    );
  }

  if (status.type === 'downloading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.space.xs,
        fontSize: tokens.font.size.xs,
        color: tokens.color.text.tertiary,
      }}>
        <div style={{
          width: 60,
          height: 3,
          background: tokens.color.bg.border,
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${status.percent}%`,
            background: tokens.color.accent.blue,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span>{status.percent}%</span>
      </div>
    );
  }

  if (status.type === 'downloaded') {
    return (
      <button
        id="updater-install-btn"
        onClick={() => window.wazaAPI.updater.quitAndInstall()}
        style={{
          fontSize: tokens.font.size.xs,
          padding: `3px ${tokens.space.sm}px`,
          background: tokens.color.accent.green,
          border: 'none',
          borderRadius: tokens.radius.sm,
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
