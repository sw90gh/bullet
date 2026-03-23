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
  onAddGoal: () => void;
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
  onAddEntry, onAddGoal, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, onDayTap, onToggleGoalDone
}: MonthlyScreenProps) {
  const { styles, C } = useTheme();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${pad(month + 1)}`;
  const monthEntries = entries.filter(e => e.date?.startsWith(monthKey) && e.type !== 'goal-yearly' && e.type !== 'goal-monthly');
  const monthGoals = entries.filter(e => e.type === 'goal-monthly' && e.date?.startsWith(monthKey));
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
            const hasEntries = monthEntries.some(e => e.date === dateStr);
            const isT = dateStr === todayStr;
            return (
              <div key={i} style={{ ...styles.miniCalCell as React.CSSProperties, cursor: 'pointer' }}
                onClick={() => onDayTap(d)}>
                <span style={{
                  ...styles.miniCalNum,
                  ...(isT ? styles.miniCalToday : {}),
                } as React.CSSProperties}>{d}</span>
                {hasEntries && <div style={styles.miniCalDot} />}
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Monthly Goals */}
      <div style={{ ...styles.sectionHeader as React.CSSProperties, marginTop: 20 }}>
        <span style={styles.sectionTitle}>월간 목표</span>
        <button style={styles.sectionAdd as React.CSSProperties} onClick={onAddGoal}>+</button>
      </div>
      {monthGoals.length === 0 ? (
        <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', padding: 12 }}>월간 목표를 추가해보세요</p>
      ) : (
        monthGoals.map(entry => (
          <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
            onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
            onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
            onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
            onChangePriority={onChangePriority} />
        ))
      )}
    </div>
  );
}
