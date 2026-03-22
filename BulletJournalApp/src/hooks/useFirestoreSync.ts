import { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { Entry, Goal } from '../types';
import {
  syncEntryToFirestore,
  syncGoalToFirestore,
  deleteEntryFromFirestore,
  deleteGoalFromFirestore,
  subscribeToEntries,
  subscribeToGoals,
} from '../utils/firestore';
import {
  getDeletedEntryIds,
  getDeletedGoalIds,
  clearDeletedEntryIds,
  clearDeletedGoalIds,
} from '../utils/storage';

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
  const [syncError, setSyncError] = useState<string | null>(null);
  const prevEntriesRef = useRef<Entry[]>([]);
  const prevGoalsRef = useRef<Goal[]>([]);
  const isRemoteUpdate = useRef(false);
  const initialSyncDone = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Auto-fade: synced → idle after 3s
  const setSyncWithFade = (status: SyncStatus, error?: string) => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setSyncStatus(status);
    if (error) setSyncError(error);
    if (status === 'synced') {
      setSyncError(null);
      fadeTimer.current = setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // Reset when user changes
  useEffect(() => {
    if (!user) {
      initialSyncDone.current = false;
      prevEntriesRef.current = [];
      prevGoalsRef.current = [];
      setSyncStatus('idle');
    }
  }, [user]);

  // Cleanup fade timer
  useEffect(() => {
    return () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); };
  }, []);

  // Subscribe to Firestore changes + initial sync
  useEffect(() => {
    if (!user || !loaded) return;

    const uid = user.uid;
    let firstEntrySnapshot = true;
    let firstGoalSnapshot = true;
    let entriesReady = false;
    let goalsReady = false;

    // Deleted IDs tracked while offline
    const deletedEntryIds = new Set(getDeletedEntryIds());
    const deletedGoalIds = new Set(getDeletedGoalIds());

    setSyncStatus('syncing');

    const doInitialMerge = () => {
      if (!entriesReady || !goalsReady || initialSyncDone.current) return;
      initialSyncDone.current = true;

      // Push local-only entries to Firestore (diff upload, not full batch)
      setEntries(current => {
        const remoteIds = new Set(prevEntriesRef.current.map(e => e.id));
        const localOnly = current.filter(e => !remoteIds.has(e.id) && !deletedEntryIds.has(e.id));
        for (const entry of localOnly) {
          syncEntryToFirestore(uid, entry).catch(console.error);
        }
        // Also push locally-updated entries (local updatedAt > remote)
        const remoteMap = new Map(prevEntriesRef.current.map(e => [e.id, e]));
        for (const entry of current) {
          const remote = remoteMap.get(entry.id);
          if (remote && (entry.updatedAt || 0) > (remote.updatedAt || 0)) {
            syncEntryToFirestore(uid, entry).catch(console.error);
          }
        }
        return current;
      });

      setGoals(current => {
        const remoteIds = new Set(prevGoalsRef.current.map(g => g.id));
        const localOnly = current.filter(g => !remoteIds.has(g.id) && !deletedGoalIds.has(g.id));
        for (const goal of localOnly) {
          syncGoalToFirestore(uid, goal).catch(console.error);
        }
        const remoteMap = new Map(prevGoalsRef.current.map(g => [g.id, g]));
        for (const goal of current) {
          const remote = remoteMap.get(goal.id);
          if (remote && (goal.updatedAt || 0) > (remote.updatedAt || 0)) {
            syncGoalToFirestore(uid, goal).catch(console.error);
          }
        }
        return current;
      });

      // Apply offline deletes to server
      for (const id of deletedEntryIds) {
        deleteEntryFromFirestore(uid, id).catch(console.error);
      }
      for (const id of deletedGoalIds) {
        deleteGoalFromFirestore(uid, id).catch(console.error);
      }
      clearDeletedEntryIds();
      clearDeletedGoalIds();

      setSyncWithFade('synced');
    };

    const handleSyncError = (error: Error) => {
      console.error('[Sync] error:', error);
      setSyncWithFade('error', error.message);
    };

    const unsubEntries = subscribeToEntries(uid, (remoteEntries) => {
      isRemoteUpdate.current = true;
      const isFirst = firstEntrySnapshot;
      firstEntrySnapshot = false;

      setEntries(local => {
        const localMap = new Map(local.map(e => [e.id, e]));
        const remoteMap = new Map(remoteEntries.map(e => [e.id, e]));
        const merged: Entry[] = [];

        const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
        for (const id of allIds) {
          // Skip items deleted offline
          if (deletedEntryIds.has(id)) continue;

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

      if (isFirst) {
        entriesReady = true;
        doInitialMerge();
      } else {
        setSyncWithFade('synced');
      }
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    }, handleSyncError);

    const unsubGoals = subscribeToGoals(uid, (remoteGoals) => {
      isRemoteUpdate.current = true;
      const isFirst = firstGoalSnapshot;
      firstGoalSnapshot = false;

      setGoals(local => {
        const localMap = new Map(local.map(g => [g.id, g]));
        const remoteMap = new Map(remoteGoals.map(g => [g.id, g]));
        const merged: Goal[] = [];

        const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
        for (const id of allIds) {
          if (deletedGoalIds.has(id)) continue;

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

      if (isFirst) {
        goalsReady = true;
        doInitialMerge();
      }
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    }, handleSyncError);

    return () => {
      unsubEntries();
      unsubGoals();
    };
  }, [user, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push local changes to Firestore (debounced diff)
  useEffect(() => {
    if (!user || !loaded || !initialSyncDone.current || isRemoteUpdate.current) return;

    const timer = setTimeout(() => {
      const uid = user.uid;
      const prevEntries = prevEntriesRef.current;
      const prevMap = new Map(prevEntries.map(e => [e.id, e]));
      const currMap = new Map(entries.map(e => [e.id, e]));
      let changed = false;

      const promises: Promise<void>[] = [];
      for (const entry of entries) {
        const prev = prevMap.get(entry.id);
        if (!prev || entry.updatedAt !== prev.updatedAt) {
          promises.push(syncEntryToFirestore(uid, entry));
          changed = true;
        }
      }

      for (const prev of prevEntries) {
        if (!currMap.has(prev.id)) {
          promises.push(deleteEntryFromFirestore(uid, prev.id));
          changed = true;
        }
      }

      prevEntriesRef.current = entries;
      if (changed) {
        Promise.all(promises)
          .then(() => setSyncWithFade('synced'))
          .catch((err) => {
            console.error('Entry sync push error:', err);
            setSyncWithFade('error', err.message);
          });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [entries, user, loaded]);

  useEffect(() => {
    if (!user || !loaded || !initialSyncDone.current || isRemoteUpdate.current) return;

    const timer = setTimeout(() => {
      const uid = user.uid;
      const prevGoals = prevGoalsRef.current;
      const prevMap = new Map(prevGoals.map(g => [g.id, g]));
      const currMap = new Map(goals.map(g => [g.id, g]));
      let changed = false;

      const promises: Promise<void>[] = [];
      for (const goal of goals) {
        const prev = prevMap.get(goal.id);
        if (!prev || goal.updatedAt !== prev.updatedAt) {
          promises.push(syncGoalToFirestore(uid, goal));
          changed = true;
        }
      }

      for (const prev of prevGoals) {
        if (!currMap.has(prev.id)) {
          promises.push(deleteGoalFromFirestore(uid, prev.id));
          changed = true;
        }
      }

      prevGoalsRef.current = goals;
      if (changed) {
        Promise.all(promises)
          .then(() => setSyncWithFade('synced'))
          .catch((err) => {
            console.error('Goal sync push error:', err);
            setSyncWithFade('error', err.message);
          });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [goals, user, loaded]);

  return { syncStatus, syncError };
}
