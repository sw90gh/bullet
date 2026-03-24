import React from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { MONTHS_KR } from '../utils/constants';
import { pad } from '../utils/date';
import { Entry, EntryPriority } from '../types';

interface AnnualScreenProps {
  year: number;
  entries: Entry[];
  cycleStatus: (id: string) => void;
  onAdd: () => void;
  onAddGoal: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  onMonthTap: (m: number) => void;
  onToggleGoalDone: (id: string) => void;
}

export function AnnualScreen({ year, entries, cycleStatus, onAdd, onAddGoal, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, onMonthTap, onToggleGoalDone }: AnnualScreenProps) {
  const { styles, C } = useTheme();
  const yearGoals = entries.filter(e => e.type === 'goal-yearly' && e.date?.startsWith(`${year}`));
  const today = new Date();

  return (
    <div>
      {/* Year Goals */}
      <div style={styles.sectionHeader as React.CSSProperties}>
        <span style={styles.sectionTitle}>{year}년 핵심 목표</span>
        <button style={styles.sectionAdd as React.CSSProperties} onClick={onAddGoal}>+</button>
      </div>
      {yearGoals.length === 0 ? (
        <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', padding: 16 }}>연간 목표를 추가해보세요</p>
      ) : (
        yearGoals.map(entry => {
          const linked = entries.filter(e => e.linkedGoalId === entry.id);
          const doneCount = linked.filter(e => e.status === 'done').length;
          return (
            <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
              onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
              onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
              onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
              onChangePriority={onChangePriority}
              goalProgress={(linked.length > 0 || entry.targetCount) ? { done: doneCount, total: linked.length, target: entry.targetCount || 0 } : undefined} />
          );
        })
      )}

      {/* 12 Month Grid */}
      <div style={styles.sectionHeader as React.CSSProperties}>
        <span style={styles.sectionTitle}>월별 요약</span>
      </div>
      <div style={styles.monthGrid as React.CSSProperties}>
        {Array.from({ length: 12 }, (_, m) => {
          const mk = `${year}-${pad(m + 1)}`;
          const monthEntries = entries.filter(e => e.date?.startsWith(mk) && e.type !== 'goal-yearly' && e.type !== 'goal-monthly');
          const count = monthEntries.length;
          const doneCount = monthEntries.filter(e => e.status === 'done').length;
          const monthGoalCount = entries.filter(e => e.type === 'goal-monthly' && e.date?.startsWith(mk)).length;
          const isCur = year === today.getFullYear() && m === today.getMonth();

          return (
            <div key={m}
              style={{ ...styles.monthCard, ...(isCur ? styles.monthCardCur : {}) } as React.CSSProperties}
              onClick={() => onMonthTap(m)}>
              <div style={styles.monthCardName}>{MONTHS_KR[m]}</div>
              {count > 0 ? (
                <div style={{ fontSize: 11, color: C.textSecondary }}>
                  <span style={{ color: C.green }}>{doneCount}</span>/{count} 완료
                </div>
              ) : (
                <div style={{ fontSize: 11, color: C.textLight }}>—</div>
              )}
              {monthGoalCount > 0 && (
                <div style={{ fontSize: 10, color: C.blue, marginTop: 2 }}>목표 {monthGoalCount}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
