import { doc, setDoc, deleteDoc, collection, onSnapshot, writeBatch, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Entry, Goal } from '../types';

// === Collection refs ===
function entriesCol(uid: string) {
  return collection(db, 'users', uid, 'entries');
}
function goalsCol(uid: string) {
  return collection(db, 'users', uid, 'goals');
}

// Remove undefined values (Firestore doesn't accept them)
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value;
  }
  return result as T;
}

// === Single doc operations ===
export function syncEntryToFirestore(uid: string, entry: Entry): Promise<void> {
  return setDoc(doc(db, 'users', uid, 'entries', entry.id), stripUndefined({
    ...entry,
    updatedAt: entry.updatedAt || Date.now(),
  }));
}

export function syncGoalToFirestore(uid: string, goal: Goal): Promise<void> {
  return setDoc(doc(db, 'users', uid, 'goals', goal.id), stripUndefined({
    ...goal,
    updatedAt: goal.updatedAt || Date.now(),
  }));
}

export function deleteEntryFromFirestore(uid: string, entryId: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'entries', entryId));
}

export function deleteGoalFromFirestore(uid: string, goalId: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'goals', goalId));
}

// === Batch upload (for initial sync) ===
export async function batchUploadEntries(uid: string, entries: Entry[]): Promise<void> {
  // Firestore batch max = 500
  for (let i = 0; i < entries.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = entries.slice(i, i + 400);
    for (const entry of chunk) {
      const ref = doc(db, 'users', uid, 'entries', entry.id);
      batch.set(ref, { ...entry, updatedAt: entry.updatedAt || Date.now() });
    }
    await batch.commit();
  }
}

export async function batchUploadGoals(uid: string, goals: Goal[]): Promise<void> {
  for (let i = 0; i < goals.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = goals.slice(i, i + 400);
    for (const goal of chunk) {
      const ref = doc(db, 'users', uid, 'goals', goal.id);
      batch.set(ref, { ...goal, updatedAt: goal.updatedAt || Date.now() });
    }
    await batch.commit();
  }
}

// === Real-time listeners ===
export function subscribeToEntries(
  uid: string,
  callback: (entries: Entry[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(entriesCol(uid), (snapshot: QuerySnapshot<DocumentData>) => {
    const entries = snapshot.docs.map(d => d.data() as Entry);
    callback(entries);
  }, (error) => {
    console.error('Entries subscription error:', error);
    onError?.(error);
  });
}

export function subscribeToGoals(
  uid: string,
  callback: (goals: Goal[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(goalsCol(uid), (snapshot: QuerySnapshot<DocumentData>) => {
    const goals = snapshot.docs.map(d => d.data() as Goal);
    callback(goals);
  }, (error) => {
    console.error('Goals subscription error:', error);
    onError?.(error);
  });
}
