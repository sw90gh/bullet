import React from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { MONTHS_KR } from '../utils/constants';
import { pad } from '../utils/date';
import { Entry, Goal } from '../types';

interface AnnualScreenProps {
  year: number;
  goals: Goal[];
  entries: Entry[];
  onAdd: () => void;
  onEdit: (g: Goal) => void;
  onMonthTap: (m: number) => void;
  onToggleGoalDone: (id: string) => void;
}

export function AnnualScreen({ year, goals, entries, onAdd, onEdit, onMonthTap, onToggleGoalDone }: AnnualScreenProps) {
  const { styles } = useTheme();
  const yearGoals = goals.filter(g => g.year === year && (g.month === undefined || g.month === null));
  const today = new Date();

  return (
    <div>
      {/* Year Goals */}
      <div style={styles.sectionHeader as React.CSSProperties}>
        <span style={styles.sectionTitle}>{year}년 핵심 목표</span>
        <button style={styles.sectionAdd as React.CSSProperties} onClick={onAdd}>+</button>
      </div>
      {yearGoals.length === 0 ? (
        <p style={{ fontSize: 13, color: '#b8a99a', textAlign: 'center', padding: 16 }}>연간 목표를 추가해보세요</p>
      ) : (
        yearGoals.map(g => (
          <div key={g.id} style={styles.goalRow as React.CSSProperties}
            onClick={() => onToggleGoalDone(g.id)}
            onContextMenu={(e) => { e.preventDefault(); onEdit(g); }}>
            <span style={{ fontSize: 15, color: g.done ? '#4a8c3f' : '#2c2416', marginRight: 8, fontWeight: 700 }}>
              {g.done ? '×' : '·'}
            </span>
            <span style={{
              fontSize: 14, color: g.done ? '#b8a99a' : '#3d3427', flex: 1,
              textDecoration: g.done ? 'line-through' : 'none',
            }}>{g.text}</span>
            <span style={{ fontSize: 10, color: g.done ? '#4a8c3f' : '#b8a99a', flexShrink: 0 }}>
              {g.done ? '완료' : '진행 중'}
            </span>
          </div>
        ))
      )}

      {/* 12 Month Grid */}
      <div style={styles.sectionHeader as React.CSSProperties}>
        <span style={styles.sectionTitle}>월별 요약</span>
      </div>
      <div style={styles.monthGrid as React.CSSProperties}>
        {Array.from({ length: 12 }, (_, m) => {
          const mk = `${year}-${pad(m + 1)}`;
          const count = entries.filter(e => e.date?.startsWith(mk)).length;
          const doneCount = entries.filter(e => e.date?.startsWith(mk) && e.status === 'done').length;
          const monthGoalCount = goals.filter(g => g.year === year && g.month === m).length;
          const isCur = year === today.getFullYear() && m === today.getMonth();

          return (
            <div key={m}
              style={{ ...styles.monthCard, ...(isCur ? styles.monthCardCur : {}) } as React.CSSProperties}
              onClick={() => onMonthTap(m)}>
              <div style={styles.monthCardName}>{MONTHS_KR[m]}</div>
              {count > 0 ? (
                <div style={{ fontSize: 11, color: '#6b5d4d' }}>
                  <span style={{ color: '#4a8c3f' }}>{doneCount}</span>/{count} 완료
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#ccc4b8' }}>—</div>
              )}
              {monthGoalCount > 0 && (
                <div style={{ fontSize: 10, color: '#3a7ca5', marginTop: 2 }}>목표 {monthGoalCount}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
