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

  // 이관: 원본을 migrated로 표시하고, 새 날짜에 복사본 생성
  const migrateEntry = useCallback((id: string, targetDate: string) => {
    setEntries(prev => {
      const original = prev.find(e => e.id === id);
      if (!original) return prev;
      const migrated = prev.map(e =>
        e.id === id ? { ...e, status: 'migrated' as EntryStatus } : e
      );
      const newEntry: Entry = {
        ...original,
        id: uid(),
        date: targetDate,
        startDate: targetDate,
        endDate: original.endDate ? targetDate : undefined,
        status: 'todo' as EntryStatus,
        createdAt: Date.now(),
      };
      return [...migrated, newEntry];
    });
  }, []);

  // 상위 이관: 원본을 migrated_up으로 표시 (목표 생성은 App에서 처리)
  const migrateUpEntry = useCallback((id: string) => {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'migrated_up' as EntryStatus } : e
    ));
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

  return { entries, loaded, addEntry, updateEntry, deleteEntry, cycleStatus, migrateEntry, migrateUpEntry, mergeNotionEntries, setEntries };
}
