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

// === 백업 알림 ===
const LAST_EXPORT_KEY = 'bujo-last-export';
const BACKUP_REMIND_DAYS = 3;

export function markExported(): void {
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
}

export function getLastExportTime(): number | null {
  const t = localStorage.getItem(LAST_EXPORT_KEY);
  return t ? parseInt(t) : null;
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
