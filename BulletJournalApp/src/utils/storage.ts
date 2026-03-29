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
  return JSON.stringify({ entries: JSON.parse(entries), goals: JSON.parse(goals) }, null, 2);
}

export function importAllData(json: string): { entries: unknown[]; goals: unknown[] } {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object') throw new Error('잘못된 데이터 형식입니다.');
  if (data.entries && !Array.isArray(data.entries)) throw new Error('entries가 배열이 아닙니다.');
  if (data.goals && !Array.isArray(data.goals)) throw new Error('goals가 배열이 아닙니다.');
  if (!data.entries && !data.goals) throw new Error('entries 또는 goals 데이터가 필요합니다.');
  // 각 entry에 최소한의 필드 검증
  if (data.entries) {
    for (const e of data.entries) {
      if (!e.id || !e.text || !e.date) throw new Error('항목에 필수 필드(id, text, date)가 없습니다.');
    }
    localStorage.setItem('bujo-entries', JSON.stringify(data.entries));
  }
  if (data.goals) {
    for (const g of data.goals) {
      if (!g.id || !g.text) throw new Error('목표에 필수 필드(id, text)가 없습니다.');
    }
    localStorage.setItem('bujo-goals', JSON.stringify(data.goals));
  }
  return data;
}

export function getStorageUsage(): { usedKB: number; pct: number } {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += key.length + (localStorage.getItem(key)?.length || 0);
    }
  }
  const usedKB = Math.round(total * 2 / 1024); // UTF-16 = 2 bytes per char
  const pct = Math.round((usedKB / 5120) * 100); // ~5MB limit
  return { usedKB, pct };
}

const AUTO_BACKUP_KEY = 'bujo-auto-backup';
const AUTO_BACKUP_TIME_KEY = 'bujo-auto-backup-time';
const BACKUP_INTERVAL = 1000 * 60 * 60; // 1 hour

export function autoBackup(): void {
  try {
    const lastBackup = localStorage.getItem(AUTO_BACKUP_TIME_KEY);
    const now = Date.now();
    if (lastBackup && now - parseInt(lastBackup, 10) < BACKUP_INTERVAL) return;

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
    if (data && time) return { data, time: parseInt(time, 10) };
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

// === Goal → Entry 마이그레이션 ===
const GOALS_MIGRATED_KEY = 'bujo-goals-migrated';

export function migrateGoalsToEntries(): import('../types').Entry[] {
  if (localStorage.getItem(GOALS_MIGRATED_KEY)) return [];
  const raw = localStorage.getItem('bujo-goals');
  if (!raw) { localStorage.setItem(GOALS_MIGRATED_KEY, '1'); return []; }

  try {
    const goals = JSON.parse(raw) as Array<{
      id: string; text: string; year: number; month?: number | null;
      done: boolean; updatedAt?: number;
    }>;
    if (!goals.length) { localStorage.setItem(GOALS_MIGRATED_KEY, '1'); return []; }

    const now = Date.now();
    const pad = (n: number) => String(n).padStart(2, '0');
    const converted = goals.map(g => ({
      id: g.id,
      text: g.text,
      type: (g.month != null ? 'goal-monthly' : 'goal-yearly') as import('../types').EntryType,
      status: (g.done ? 'done' : 'todo') as import('../types').EntryStatus,
      priority: 'none' as import('../types').EntryPriority,
      date: g.month != null
        ? `${g.year}-${pad(g.month + 1)}-01`
        : `${g.year}-01-01`,
      createdAt: g.updatedAt || now,
      updatedAt: g.updatedAt || now,
    }));

    localStorage.setItem(GOALS_MIGRATED_KEY, '1');
    return converted;
  } catch {
    localStorage.setItem(GOALS_MIGRATED_KEY, '1');
    return [];
  }
}

// === 삭제 추적 (오프라인 삭제 동기화용) ===
const DELETED_ENTRIES_KEY = 'bujo-deleted-entries';
const DELETED_GOALS_KEY = 'bujo-deleted-goals';

export function trackDeletedEntry(id: string): void {
  const ids = getDeletedEntryIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(DELETED_ENTRIES_KEY, JSON.stringify(ids));
  }
}

export function trackDeletedGoal(id: string): void {
  const ids = getDeletedGoalIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(DELETED_GOALS_KEY, JSON.stringify(ids));
  }
}

export function getDeletedEntryIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DELETED_ENTRIES_KEY) || '[]');
  } catch { return []; }
}

export function getDeletedGoalIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DELETED_GOALS_KEY) || '[]');
  } catch { return []; }
}

export function clearDeletedEntryIds(): void {
  localStorage.removeItem(DELETED_ENTRIES_KEY);
}

export function clearDeletedGoalIds(): void {
  localStorage.removeItem(DELETED_GOALS_KEY);
}

// === 백업 알림 ===
const LAST_EXPORT_KEY = 'bujo-last-export';
const BACKUP_REMIND_DAYS = 3;

export function markExported(): void {
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
}

export function getLastExportTime(): number | null {
  const t = localStorage.getItem(LAST_EXPORT_KEY);
  return t ? parseInt(t, 10) : null;
}

export function shouldRemindBackup(): boolean {
  const last = getLastExportTime();
  if (!last) return true; // 한 번도 백업한 적 없으면 알림
  const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return daysSince >= BACKUP_REMIND_DAYS;
}

export async function shareBackup(): Promise<boolean> {
  const data = exportAllData();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `bullet-journal-${dateStr}.json`;

  // Web Share API with file (iOS 15+)
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([data], fileName, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Bullet Journal 백업',
          files: [file],
        });
        markExported();
        return true;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
    }
  }

  // Fallback: text share
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Bullet Journal 백업',
        text: data,
      });
      markExported();
      return true;
    } catch {
      // user cancelled
      return false;
    }
  }

  // Final fallback: download
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  markExported();
  return true;
}
