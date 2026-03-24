import React from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { getDaysInMonth, pad, getTodayStr } from '../utils/date';
import { Entry, EntryPriority } from '../types';

interface MonthlyScreenProps {
  year: number;
  month: number;
  entries: Entry[];
  cycleStatus: (id: string) => void;
  onAddEntry: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  onDayTap: (d: number) => void;
  onToggleGoalDone: (id: string) => void;
}

export function MonthlyScreen({
  year, month, entries, cycleStatus,
  onAddEntry, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, onDayTap, onToggleGoalDone
}: MonthlyScreenProps) {
  const { styles, C } = useTheme();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${pad(month + 1)}`;
  const monthEntries = entries.filter(e => e.date?.startsWith(monthKey) && e.type !== 'goal-yearly' && e.type !== 'goal-monthly')
    .sort((a, b) => {
      const po: Record<string, number> = { urgent: 0, important: 1, none: 2 };
      if (po[a.priority || 'none'] !== po[b.priority || 'none'])
        return po[a.priority || 'none'] - po[b.priority || 'none'];
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  const todayStr = getTodayStr();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Mini Calendar */}
      <div style={styles.miniCal}>
        <div style={styles.miniCalHeader as React.CSSProperties}>
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} style={{ ...styles.miniCalDow, color: d === '일' || d === '토' ? C.accent : C.textSecondary }}>{d}</div>
          ))}
        </div>
        <div style={styles.miniCalGrid as React.CSSProperties}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={styles.miniCalCell as React.CSSProperties} />;
            const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
            const dayItems = monthEntries.filter(e => e.date === dateStr);
            const isT = dateStr === todayStr;
            return (
              <div key={i} style={{ ...styles.miniCalCell as React.CSSProperties, cursor: 'pointer', padding: '4px 1px' }}
                onClick={() => onDayTap(d)}>
                <span style={{
                  ...styles.miniCalNum,
                  ...(isT ? styles.miniCalToday : {}),
                } as React.CSSProperties}>{d}</span>
                {dayItems.length > 0 && (
                  <div style={{ marginTop: 1 }}>
                    <div style={{
                      fontSize: 7, color: C.textMuted, lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '100%', padding: '0 1px',
                    }}>{dayItems[0].text.slice(0, 4)}</div>
                    {dayItems.length > 1 && (
                      <div style={{ fontSize: 6, color: C.blue }}>+{dayItems.length - 1}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 밀린 항목 */}
      {(() => {
        const overdue = entries.filter(e => {
          if (!e.date || e.date >= todayStr) return false;
          if (e.type === 'goal-yearly' || e.type === 'goal-monthly') return false;
          if (e.status === 'done' || e.status === 'cancelled' || e.status === 'migrated' || e.status === 'migrated_up') return false;
          return true;
        }).sort((a, b) => {
          const mc = (b.migrateCount || 0) - (a.migrateCount || 0);
          if (mc !== 0) return mc;
          return a.date.localeCompare(b.date);
        });
        if (overdue.length === 0) return null;
        return (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.accent,
              padding: '6px 2px 4px', borderBottom: `1px solid ${C.accent}40`,
              marginBottom: 4,
            }}>
              밀린 항목 ({overdue.length}건)
            </div>
            {overdue.map(entry => (
              <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
                onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
                onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
                onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
                onChangePriority={onChangePriority} />
            ))}
          </div>
        );
      })()}

      {/* Monthly Tasks */}
      <div style={styles.sectionHeader as React.CSSProperties}>
        <span style={styles.sectionTitle}>이번 달 할 일</span>
        <button style={styles.sectionAdd as React.CSSProperties} onClick={onAddEntry}>+</button>
      </div>
      {monthEntries.length === 0 ? (
        <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', padding: 20 }}>등록된 항목이 없습니다</p>
      ) : (
        monthEntries.slice(0, 30).map(entry => (
          <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
            onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
            onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
            onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
            onChangePriority={onChangePriority} />
        ))
      )}

      {/* 월간 목표 제거됨 — 목표는 연간 탭에서만 관리 */}
    </div>
  );
}
