import { useState, useEffect, useCallback } from 'react';
import { Entry, EntryStatus } from '../types';
import { uid } from '../utils/date';
import { loadData, saveData, trackDeletedEntry } from '../utils/storage';
import { STATUS_CYCLE } from '../utils/constants';

const STORAGE_KEY = 'bujo-entries';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await loadData<Entry[]>(STORAGE_KEY, []);
      // updatedAt이 없는 기존 항목에 자동 부여
      const now = Date.now();
      const patched = data.map(e => e.updatedAt ? e : { ...e, updatedAt: now });
      setEntries(patched);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) saveData(STORAGE_KEY, entries);
  }, [entries, loaded]);

  const addEntry = useCallback((entry: Omit<Entry, 'id' | 'createdAt'>) => {
    setEntries(prev => [...prev, { ...entry, id: uid(), createdAt: Date.now(), updatedAt: Date.now() } as Entry]);
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<Entry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    trackDeletedEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const cycleStatus = useCallback((id: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const idx = STATUS_CYCLE.indexOf(e.status as typeof STATUS_CYCLE[number]);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return { ...e, status: next as EntryStatus, updatedAt: Date.now() };
    }));
  }, []);

  const migrateEntry = useCallback((id: string, targetDate: string) => {
    setEntries(prev => {
      const original = prev.find(e => e.id === id);
      if (!original) return prev;
      const now = Date.now();
      const migrated = prev.map(e =>
        e.id === id ? { ...e, status: 'migrated' as EntryStatus, updatedAt: now } : e
      );
      const newEntry: Entry = {
        ...original,
        id: uid(),
        date: targetDate,
        startDate: targetDate,
        endDate: original.endDate ? targetDate : undefined,
        status: 'todo' as EntryStatus,
        createdAt: now,
        updatedAt: now,
      };
      return [...migrated, newEntry];
    });
  }, []);

  const migrateUpEntry = useCallback((id: string) => {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'migrated_up' as EntryStatus, updatedAt: Date.now() } : e
    ));
  }, []);

  return { entries, loaded, addEntry, updateEntry, deleteEntry, cycleStatus, migrateEntry, migrateUpEntry, setEntries };
}
