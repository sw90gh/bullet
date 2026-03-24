import { doc, setDoc, deleteDoc, collection, onSnapshot, getDocs, writeBatch, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Entry } from '../types';

// === Collection refs ===
function entriesCol(uid: string) {
  return collection(db, 'users', uid, 'entries');
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

export function deleteEntryFromFirestore(uid: string, entryId: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'entries', entryId));
}

// === Batch upload (for initial sync) ===
export async function batchUploadEntries(uid: string, entries: Entry[]): Promise<void> {
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

// === Legacy goals collection cleanup ===
const GOALS_CLEANED_KEY = 'bujo-firestore-goals-cleaned';

export async function cleanupFirestoreGoals(uid: string): Promise<void> {
  if (localStorage.getItem(GOALS_CLEANED_KEY)) return;
  try {
    const goalsCol = collection(db, 'users', uid, 'goals');
    const snapshot = await getDocs(goalsCol);
    if (snapshot.empty) {
      localStorage.setItem(GOALS_CLEANED_KEY, '1');
      return;
    }
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    localStorage.setItem(GOALS_CLEANED_KEY, '1');
    console.log(`[Firestore] Cleaned up ${snapshot.size} legacy goals`);
  } catch (err) {
    console.error('[Firestore] Goals cleanup error:', err);
  }
}
