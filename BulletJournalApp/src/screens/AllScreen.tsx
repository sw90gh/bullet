import React, { useMemo, useState } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { Entry, EntryPriority } from '../types';

interface AllScreenProps {
  entries: Entry[];
  cycleStatus: (id: string) => void;
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
}

export function AllScreen({ entries, cycleStatus, onAdd, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority }: AllScreenProps) {
  const { styles, C } = useTheme();
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (showAll) return entries;
    return entries.filter(e => e.status === 'todo' || e.status === 'progress');
  }, [entries, showAll]);

  // 날짜별 그루핑 (날짜순 정렬)
  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    const sorted = [...filtered].sort((a, b) => {
      const da = a.date || '9999';
      const db = b.date || '9999';
      if (da !== db) return da.localeCompare(db);
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    for (const entry of sorted) {
      const key = entry.date || 'no-date';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [filtered]);

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === 'no-date') return '날짜 없음';
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const base = `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
    if (diff === 0) return `${base} · 오늘`;
    if (diff === 1) return `${base} · 내일`;
    if (diff === -1) return `${base} · 어제`;
    if (diff < -1) return `${base} · ${Math.abs(diff)}일 전`;
    return `${base} · ${diff}일 후`;
  };

  return (
    <div>
      {/* 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        <button
          style={{
            ...styles.chip,
            ...(showAll ? {} : styles.chipActive),
            flex: 1, textAlign: 'center',
          }}
          onClick={() => setShowAll(false)}
        >
          미완료 ({entries.filter(e => e.status === 'todo' || e.status === 'progress').length})
        </button>
        <button
          style={{
            ...styles.chip,
            ...(showAll ? styles.chipActive : {}),
            flex: 1, textAlign: 'center',
          }}
          onClick={() => setShowAll(true)}
        >
          전체 ({entries.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={styles.emptyState as React.CSSProperties}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>·</div>
          <p style={{ color: C.textMuted, fontSize: 14 }}>
            {showAll ? '등록된 항목이 없습니다' : '미완료 항목이 없습니다'}
          </p>
          <button style={styles.emptyAdd} onClick={onAdd}>+ 새 항목 추가</button>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([dateStr, dateEntries]) => (
          <div key={dateStr} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.textSecondary,
              padding: '6px 2px 4px', borderBottom: `1px solid ${C.borderLight}`,
              marginBottom: 4,
            }}>
              {formatDateLabel(dateStr)}
              <span style={{ fontWeight: 400, color: C.textMuted, marginLeft: 6, fontSize: 11 }}>
                {dateEntries.length}건
              </span>
            </div>
            {dateEntries.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                cycleStatus={cycleStatus}
                onEdit={() => onEdit(entry)}
                onDelete={() => onDelete(entry.id)}
                onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
                onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
                onChangePriority={onChangePriority}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
