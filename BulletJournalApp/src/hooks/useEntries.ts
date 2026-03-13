import { useState, useEffect, useCallback } from 'react';
import { Entry, EntryStatus } from '../types';
import { uid } from '../utils/date';
import { loadData, saveData } from '../utils/storage';
import { STATUS_CYCLE } from '../utils/constants';

const STORAGE_KEY = 'bujo-entries';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await loadData<Entry[]>(STORAGE_KEY, []);
      setEntries(data);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) saveData(STORAGE_KEY, entries);
  }, [entries, loaded]);

  const addEntry = useCallback((entry: Omit<Entry, 'id' | 'createdAt'>) => {
    setEntries(prev => [...prev, { ...entry, id: uid(), createdAt: Date.now() } as Entry]);
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<Entry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const cycleStatus = useCallback((id: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const idx = STATUS_CYCLE.indexOf(e.status as typeof STATUS_CYCLE[number]);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return { ...e, status: next as EntryStatus };
    }));
  }, []);

  const mergeNotionEntries = useCallback((notionEntries: Entry[]) => {
    setEntries(prev => {
      const existing = new Map(prev.filter(e => e.notionPageId).map(e => [e.notionPageId!, e]));
      const merged = [...prev.filter(e => !e.notionPageId)];
      for (const ne of notionEntries) {
        const ex = existing.get(ne.notionPageId!);
        if (ex) {
          if (ne.createdAt > (ex.notionLastSync || 0)) {
            merged.push({ ...ex, ...ne, id: ex.id });
          } else {
            merged.push(ex);
          }
        } else {
          merged.push(ne);
        }
      }
      for (const [pid, ex] of existing) {
        if (!notionEntries.find(ne => ne.notionPageId === pid)) {
          merged.push(ex);
        }
      }
      return merged;
    });
  }, []);

  return { entries, loaded, addEntry, updateEntry, deleteEntry, cycleStatus, mergeNotionEntries, setEntries };
}
