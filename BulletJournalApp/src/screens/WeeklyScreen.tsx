import React from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { DAYS_KR } from '../utils/constants';
import { getWeekDates, formatDateKey, getTodayStr } from '../utils/date';
import { Entry, EntryPriority } from '../types';

interface WeeklyScreenProps {
  date: Date;
  entries: Entry[];
  cycleStatus: (id: string) => void;
  onAdd: (dateStr: string) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  setCurDate: (d: Date) => void;
  setView: (v: string) => void;
}

export function WeeklyScreen({ date, entries, cycleStatus, onAdd, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, setCurDate, setView }: WeeklyScreenProps) {
  const { styles, C } = useTheme();
  const weekDates = getWeekDates(date.getFullYear(), date.getMonth(), date.getDate());
  const todayStr = getTodayStr();

  return (
    <div>
      {weekDates.map(wd => {
        const dateStr = formatDateKey(wd);
        const dayEntries = entries.filter(e => e.date === dateStr).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const isT = dateStr === todayStr;
        const isWeekend = wd.getDay() === 0 || wd.getDay() === 6;

        return (
          <div key={dateStr} style={{ ...styles.weekDay, ...(isT ? styles.weekDayToday : {}) } as React.CSSProperties}>
            <div style={styles.weekDayHeader as React.CSSProperties}
              onClick={() => { setCurDate(wd); setView('daily'); }}>
              <span style={{
                ...styles.weekDayName,
                color: isWeekend ? C.accent : C.textPrimary,
              }}>{DAYS_KR[wd.getDay()]}</span>
              <span style={{
                ...styles.weekDayNum,
                ...(isT ? styles.weekDayNumToday : {}),
              } as React.CSSProperties}>{wd.getDate()}</span>
              <div style={{ flex: 1 }} />
              <button style={styles.weekAddBtn as React.CSSProperties}
                onClick={(e) => { e.stopPropagation(); onAdd(dateStr); }}>+</button>
            </div>
            {dayEntries.length === 0 ? (
              <p style={{ fontSize: 12, color: C.textLight, padding: '4px 0 0 28px', fontStyle: 'italic' }}>비어 있음</p>
            ) : (
              dayEntries.map(entry => (
                <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
                  onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
                  onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
                  onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
                  onChangePriority={onChangePriority}
                  compact />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
