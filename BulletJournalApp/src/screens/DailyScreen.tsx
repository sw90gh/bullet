import React from 'react';
import { styles } from '../styles/theme';
import { EntryRow } from '../components/EntryRow';
import { formatDateKey, getTodayStr, daysBetween } from '../utils/date';
import { Entry } from '../types';

interface DailyScreenProps {
  date: Date;
  entries: Entry[];
  allEntries: Entry[];
  cycleStatus: (id: string) => void;
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
}

export function DailyScreen({ date, entries, allEntries, cycleStatus, onAdd, onEdit, onDelete, onMigrate, onMigrateUp }: DailyScreenProps) {
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

  // 마감 임박 항목 (오늘 기준 D-3 이내 + 기한 초과 미완료)
  const urgentEntries = isToday ? allEntries.filter(e => {
    if (!e.endDate) return false;
    if (e.status === 'done' || e.status === 'cancelled' || e.status === 'migrated' || e.status === 'migrated_up') return false;
    const daysLeft = daysBetween(todayStr, e.endDate);
    return daysLeft <= 3;
  }).sort((a, b) => {
    const da = daysBetween(todayStr, a.endDate!);
    const db = daysBetween(todayStr, b.endDate!);
    return da - db;
  }) : [];

  const getDdayLabel = (endDate: string) => {
    const d = daysBetween(todayStr, endDate);
    if (d < 0) return { label: `D+${Math.abs(d)}`, color: '#c0583f', bg: '#c0583f15' };
    if (d === 0) return { label: 'D-Day', color: '#c0883f', bg: '#c0883f15' };
    return { label: `D-${d}`, color: d === 1 ? '#c0883f' : '#3a7ca5', bg: d === 1 ? '#c0883f10' : '#3a7ca510' };
  };

  return (
    <div>
      {isToday && <div style={styles.todayBadge}>TODAY</div>}

      {/* 마감 임박 */}
      {urgentEntries.length > 0 && (
        <div style={{
          background: 'white', borderRadius: 12, padding: '10px 14px', marginBottom: 10,
          boxShadow: '0 1px 3px rgba(44,36,22,0.06)', border: '1px solid #c0583f20',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#c0583f', marginBottom: 6 }}>
            ⏰ 마감 임박 ({urgentEntries.length})
          </div>
          {urgentEntries.map(entry => {
            const dday = getDdayLabel(entry.endDate!);
            return (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', padding: '5px 0',
                borderBottom: '1px solid #f5f0e8', cursor: 'pointer',
              }} onClick={() => onEdit(entry)}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: dday.color,
                  background: dday.bg, padding: '2px 6px', borderRadius: 4,
                  marginRight: 8, flexShrink: 0, minWidth: 36, textAlign: 'center',
                }}>{dday.label}</span>
                <span style={{
                  fontSize: 12, color: '#2c2416', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{entry.text}</span>
                <span style={{ fontSize: 10, color: '#b8a99a', flexShrink: 0 }}>~{entry.endDate?.slice(5)}</span>
              </div>
            );
          })}
        </div>
      )}

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
