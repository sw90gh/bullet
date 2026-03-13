import { useState, useCallback, useEffect } from 'react';
import { Entry, NotionConfig } from '../types';
import { queryNotionDatabase, createNotionPage, updateNotionPage } from '../utils/notion';
import { loadData, saveData } from '../utils/storage';

const STORAGE_KEY = 'bujo-notion';

export function useNotionSync() {
  const [config, setConfig] = useState<NotionConfig | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await loadData<NotionConfig | null>(STORAGE_KEY, null);
      setConfig(data);
    })();
  }, []);

  const saveConfig = useCallback((cfg: NotionConfig | null) => {
    setConfig(cfg);
    saveData(STORAGE_KEY, cfg);
  }, []);

  const connect = useCallback((accessToken: string, databaseId: string) => {
    // Trim whitespace and strip "Bearer " prefix if user accidentally included it
    let cleanToken = accessToken.trim();
    if (cleanToken.toLowerCase().startsWith('bearer ')) {
      cleanToken = cleanToken.slice(7).trim();
    }
    // Extract database ID from Notion URL if user pasted full URL
    let cleanDbId = databaseId.trim();
    // Handle full Notion URLs like https://www.notion.so/workspace/DB_ID?v=...
    const urlMatch = cleanDbId.match(/([a-f0-9]{32})/i) || cleanDbId.match(/([a-f0-9-]{36})/i);
    if (urlMatch) {
      cleanDbId = urlMatch[1];
    }
    saveConfig({ accessToken: cleanToken, databaseId: cleanDbId, connected: true, lastSync: undefined });
  }, [saveConfig]);

  const disconnect = useCallback(() => {
    saveConfig(null);
    setLastError(null);
  }, [saveConfig]);

  const syncFromNotion = useCallback(async (): Promise<Entry[]> => {
    if (!config?.connected) return [];
    setSyncing(true);
    setLastError(null);
    try {
      const entries = await queryNotionDatabase(config);
      saveConfig({ ...config, lastSync: Date.now() });
      return entries;
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Sync failed');
      return [];
    } finally {
      setSyncing(false);
    }
  }, [config, saveConfig]);

  const pushToNotion = useCallback(async (entry: Entry): Promise<string | null> => {
    if (!config?.connected) return null;
    try {
      if (entry.notionPageId) {
        await updateNotionPage(config, entry.notionPageId, entry);
        return entry.notionPageId;
      } else {
        return await createNotionPage(config, entry);
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Push failed');
      return null;
    }
  }, [config]);

  return {
    config,
    syncing,
    lastError,
    connect,
    disconnect,
    syncFromNotion,
    pushToNotion,
    isConnected: !!config?.connected,
  };
}
