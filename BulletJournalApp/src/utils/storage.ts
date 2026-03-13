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
