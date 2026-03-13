import React from 'react';
import { styles } from '../styles/theme';
import { EntryRow } from '../components/EntryRow';
import { formatDateKey, getTodayStr } from '../utils/date';
import { Entry } from '../types';

interface DailyScreenProps {
  date: Date;
  entries: Entry[];
  cycleStatus: (id: string) => void;
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
}

export function DailyScreen({ date, entries, cycleStatus, onAdd, onEdit, onDelete, onMigrate, onMigrateUp }: DailyScreenProps) {
  const dateStr = formatDateKey(date);
  const todayStr = getTodayStr();
  const dayEntries = entries
    .filter(e => e.date === dateStr)
    .sort((a, b) => {
      const po: Record<string, number> = { urgent: 0, important: 1, none: 2 };
      if (po[a.priority || 'none'] !== po[b.priority || 'none'])
        return po[a.priority || 'none'] - po[b.priority || 'none'];
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  const isToday = dateStr === todayStr;

  return (
    <div>
      {isToday && <div style={styles.todayBadge}>TODAY</div>}
      {dayEntries.length === 0 ? (
        <div style={styles.emptyState as React.CSSProperties}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>·</div>
          <p style={{ color: '#b8a99a', fontSize: 14 }}>기록이 없습니다</p>
          <button style={styles.emptyAdd} onClick={onAdd}>+ 새 항목 추가</button>
        </div>
      ) : (
        <div>
          {dayEntries.map(entry => (
            <EntryRow
              key={entry.id}
              entry={entry}
              cycleStatus={cycleStatus}
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry.id)}
              onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
              onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
