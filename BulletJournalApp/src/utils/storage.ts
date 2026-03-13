export async function loadData<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function saveData(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

export function exportAllData(): string {
  const entries = localStorage.getItem('bujo-entries') || '[]';
  const goals = localStorage.getItem('bujo-goals') || '[]';
  const notion = localStorage.getItem('bujo-notion') || 'null';
  return JSON.stringify({ entries: JSON.parse(entries), goals: JSON.parse(goals), notion: JSON.parse(notion) }, null, 2);
}

export function importAllData(json: string): { entries: unknown[]; goals: unknown[] } {
  const data = JSON.parse(json);
  if (data.entries) localStorage.setItem('bujo-entries', JSON.stringify(data.entries));
  if (data.goals) localStorage.setItem('bujo-goals', JSON.stringify(data.goals));
  if (data.notion) localStorage.setItem('bujo-notion', JSON.stringify(data.notion));
  return data;
}

const AUTO_BACKUP_KEY = 'bujo-auto-backup';
const AUTO_BACKUP_TIME_KEY = 'bujo-auto-backup-time';
const BACKUP_INTERVAL = 1000 * 60 * 60; // 1 hour

export function autoBackup(): void {
  try {
    const lastBackup = localStorage.getItem(AUTO_BACKUP_TIME_KEY);
    const now = Date.now();
    if (lastBackup && now - parseInt(lastBackup) < BACKUP_INTERVAL) return;

    const data = exportAllData();
    localStorage.setItem(AUTO_BACKUP_KEY, data);
    localStorage.setItem(AUTO_BACKUP_TIME_KEY, String(now));
  } catch (e) {
    console.error('Auto backup error:', e);
  }
}

export function getAutoBackup(): { data: string; time: number } | null {
  try {
    const data = localStorage.getItem(AUTO_BACKUP_KEY);
    const time = localStorage.getItem(AUTO_BACKUP_TIME_KEY);
    if (data && time) return { data, time: parseInt(time) };
    return null;
  } catch {
    return null;
  }
}

export function restoreAutoBackup(): boolean {
  const backup = getAutoBackup();
  if (!backup) return false;
  try {
    importAllData(backup.data);
    return true;
  } catch {
    return false;
  }
}
