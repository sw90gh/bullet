import { Entry, RecurringConfig } from '../types';
import { uid, formatDateKey, getTodayStr } from './date';

/**
 * Generate recurring entries for today based on existing recurring entries.
 * Only creates entries that don't already exist for the target date.
 */
export function generateRecurringEntries(entries: Entry[]): Entry[] {
  const today = getTodayStr();
  const newEntries: Entry[] = [];

  const recurringEntries = entries.filter(e => e.recurring);

  for (const entry of recurringEntries) {
    const rec = entry.recurring!;

    // Check if recurring has ended
    if (rec.endDate && rec.endDate < today) continue;

    // Check if entry already exists for today
    const alreadyExists = entries.some(e =>
      e.text === entry.text &&
      e.date === today &&
      e.type === entry.type
    );
    if (alreadyExists) continue;

    // Check if today is a valid recurring date
    if (shouldRecurOnDate(entry.date, today, rec)) {
      newEntries.push({
        ...entry,
        id: uid(),
        date: today,
        startDate: today,
        endDate: undefined,
        status: 'todo',
        createdAt: Date.now(),
        // Keep the recurring config so it can be identified
      });
    }
  }

  return newEntries;
}

function shouldRecurOnDate(startDate: string, targetDate: string, config: RecurringConfig): boolean {
  const start = new Date(startDate);
  const target = new Date(targetDate);

  if (target <= start) return false;

  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  switch (config.type) {
    case 'daily':
      return diffDays % config.interval === 0;
    case 'weekly':
      return diffDays % (config.interval * 7) === 0;
    case 'monthly': {
      const monthsDiff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
      return monthsDiff > 0 && monthsDiff % config.interval === 0 && target.getDate() === start.getDate();
    }
    default:
      return false;
  }
}
