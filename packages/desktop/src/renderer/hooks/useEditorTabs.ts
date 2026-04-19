import { useState, useCallback, useRef } from 'react';
import type { EditorTab, MultiFileEdit } from '../types/editor.js';

export function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust',
    md: 'markdown', json: 'json',
    yaml: 'yaml', yml: 'yaml',
    html: 'html', css: 'css',
    sh: 'shell', toml: 'toml',
    go: 'go', rb: 'ruby',
    java: 'java', cpp: 'cpp', c: 'c',
    cs: 'csharp', php: 'php', swift: 'swift',
    kt: 'kotlin', scala: 'scala',
  };
  return map[ext] ?? 'plaintext';
}

export interface UseEditorTabsReturn {
  tabs: EditorTab[];
  activeTab: EditorTab | null;
  activeTabId: string | null;
  openTab: (path: string) => Promise<void>;
  closeTab: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  saveTab: (id: string) => Promise<void>;
  applyMultiFileEdit: (edit: MultiFileEdit) => Promise<void>;
  setActiveTabId: (id: string | null) => void;
}

export function useEditorTabs(): UseEditorTabsReturn {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // 常に最新のtabsを参照するためのref
  const tabsRef = useRef<EditorTab[]>(tabs);
  tabsRef.current = tabs;

  const openTab = useCallback(async (path: string) => {
    // 既に開いていればアクティブにするだけ
    if (tabsRef.current.find(t => t.id === path)) {
      setActiveTabId(path);
      return;
    }
    const content = await window.wazaAPI.fs.readFile(path);
    // 非同期後に再チェック（並列呼び出し対策）
    setTabs(prev => {
      if (prev.find(t => t.id === path)) {
        setActiveTabId(path);
        return prev;
      }
      const tab: EditorTab = {
        id: path,
        path,
        filename: path.split('/').pop() ?? path,
        content,
        isDirty: false,
        language: detectLanguage(path),
      };
      setActiveTabId(path);
      return [...prev, tab];
    });
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      // 閉じたタブがアクティブなら隣をアクティブに
      setActiveTabId(current => {
        if (current !== id) return current;
        const idx = prev.findIndex(t => t.id === id);
        return next[Math.min(idx, next.length - 1)]?.id ?? null;
      });
      return next;
    });
  }, []);

  const updateContent = useCallback((id: string, content: string) => {
    setTabs(prev => prev.map(t =>
      t.id === id ? { ...t, content, isDirty: true } : t
    ));
  }, []);

  const saveTab = useCallback(async (id: string) => {
    // tabsRefで最新のtabを取得（非同期なのでstateより確実）
    const tab = tabsRef.current.find(t => t.id === id);
    if (!tab) return;
    await window.wazaAPI.fs.writeFile(tab.path, tab.content);
    setTabs(prev => prev.map(t =>
      t.id === id ? { ...t, isDirty: false } : t
    ));
  }, []);

  // エージェントによるマルチファイル編集を適用
  const applyMultiFileEdit = useCallback(async (edit: MultiFileEdit) => {
    for (const file of edit.files) {
      const isOpen = tabsRef.current.find(t => t.path === file.path);
      if (isOpen) {
        // 開いているタブは内容を更新（未保存マーク）
        setTabs(prev => prev.map(t =>
          t.path === file.path
            ? { ...t, content: file.newContent, isDirty: true }
            : t
        ));
      } else {
        // 開いていないタブはファイルに直接書き込む
        await window.wazaAPI.fs.writeFile(file.path, file.newContent);
      }
    }
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  return {
    tabs,
    activeTab,
    activeTabId,
    openTab,
    closeTab,
    updateContent,
    saveTab,
    applyMultiFileEdit,
    setActiveTabId,
  };
}
