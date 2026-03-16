import { useEffect, useRef, useCallback, useState } from 'react';
import { User } from 'firebase/auth';
import { Entry, Goal } from '../types';
import {
  syncEntryToFirestore,
  syncGoalToFirestore,
  deleteEntryFromFirestore,
  deleteGoalFromFirestore,
  batchUploadEntries,
  batchUploadGoals,
  subscribeToEntries,
  subscribeToGoals,
} from '../utils/firestore';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export function useFirestoreSync(
  user: User | null,
  entries: Entry[],
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>,
  goals: Goal[],
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>,
  loaded: boolean,
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const prevEntriesRef = useRef<Entry[]>([]);
  const prevGoalsRef = useRef<Goal[]>([]);
  const isRemoteUpdate = useRef(false);
  const initialSyncDone = useRef(false);

  // Reset when user changes
  useEffect(() => {
    if (!user) {
      initialSyncDone.current = false;
      prevEntriesRef.current = [];
      prevGoalsRef.current = [];
      setSyncStatus('idle');
    }
  }, [user]);

  // Initial sync: upload local data to Firestore on first login
  const doInitialSync = useCallback(async (uid: string) => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;
    setSyncStatus('syncing');
    try {
      if (entries.length > 0) await batchUploadEntries(uid, entries);
      if (goals.length > 0) await batchUploadGoals(uid, goals);
      setSyncStatus('synced');
    } catch (e) {
      console.error('Initial sync error:', e);
      setSyncStatus('error');
    }
  }, [entries, goals]);

  // Subscribe to Firestore changes
  useEffect(() => {
    if (!user || !loaded) return;

    doInitialSync(user.uid);

    const unsubEntries = subscribeToEntries(user.uid, (remoteEntries) => {
      isRemoteUpdate.current = true;
      setEntries(local => {
        const localMap = new Map(local.map(e => [e.id, e]));
        const remoteMap = new Map(remoteEntries.map(e => [e.id, e]));
        const merged: Entry[] = [];

        // Merge: for each entry, keep the one with higher updatedAt
        const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
        for (const id of allIds) {
          const l = localMap.get(id);
          const r = remoteMap.get(id);
          if (l && r) {
            merged.push((r.updatedAt || 0) >= (l.updatedAt || 0) ? r : l);
          } else if (r) {
            merged.push(r);
          } else if (l) {
            merged.push(l);
          }
        }
        prevEntriesRef.current = merged;
        return merged;
      });
      setSyncStatus('synced');
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    });

    const unsubGoals = subscribeToGoals(user.uid, (remoteGoals) => {
      isRemoteUpdate.current = true;
      setGoals(local => {
        const localMap = new Map(local.map(g => [g.id, g]));
        const remoteMap = new Map(remoteGoals.map(g => [g.id, g]));
        const merged: Goal[] = [];

        const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
        for (const id of allIds) {
          const l = localMap.get(id);
          const r = remoteMap.get(id);
          if (l && r) {
            merged.push((r.updatedAt || 0) >= (l.updatedAt || 0) ? r : l);
          } else if (r) {
            merged.push(r);
          } else if (l) {
            merged.push(l);
          }
        }
        prevGoalsRef.current = merged;
        return merged;
      });
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    });

    return () => {
      unsubEntries();
      unsubGoals();
    };
  }, [user, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push local changes to Firestore (debounced diff)
  useEffect(() => {
    if (!user || !loaded || isRemoteUpdate.current) return;

    const timer = setTimeout(() => {
      const uid = user.uid;
      const prevEntries = prevEntriesRef.current;
      const prevMap = new Map(prevEntries.map(e => [e.id, e]));
      const currMap = new Map(entries.map(e => [e.id, e]));

      // Find added or updated entries
      for (const entry of entries) {
        const prev = prevMap.get(entry.id);
        if (!prev || entry.updatedAt !== prev.updatedAt) {
          syncEntryToFirestore(uid, entry).catch(console.error);
        }
      }

      // Find deleted entries
      for (const prev of prevEntries) {
        if (!currMap.has(prev.id)) {
          deleteEntryFromFirestore(uid, prev.id).catch(console.error);
        }
      }

      prevEntriesRef.current = entries;
    }, 500);

    return () => clearTimeout(timer);
  }, [entries, user, loaded]);

  useEffect(() => {
    if (!user || !loaded || isRemoteUpdate.current) return;

    const timer = setTimeout(() => {
      const uid = user.uid;
      const prevGoals = prevGoalsRef.current;
      const prevMap = new Map(prevGoals.map(g => [g.id, g]));
      const currMap = new Map(goals.map(g => [g.id, g]));

      for (const goal of goals) {
        const prev = prevMap.get(goal.id);
        if (!prev || goal.updatedAt !== prev.updatedAt) {
          syncGoalToFirestore(uid, goal).catch(console.error);
        }
      }

      for (const prev of prevGoals) {
        if (!currMap.has(prev.id)) {
          deleteGoalFromFirestore(uid, prev.id).catch(console.error);
        }
      }

      prevGoalsRef.current = goals;
    }, 500);

    return () => clearTimeout(timer);
  }, [goals, user, loaded]);

  return { syncStatus };
}
