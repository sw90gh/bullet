import React from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { getDaysInMonth, pad, getTodayStr } from '../utils/date';
import { Entry, Goal } from '../types';

interface MonthlyScreenProps {
  year: number;
  month: number;
  entries: Entry[];
  goals: Goal[];
  cycleStatus: (id: string) => void;
  onAddEntry: () => void;
  onAddGoal: () => void;
  onEditGoal: (g: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onDayTap: (d: number) => void;
  onToggleGoalDone: (id: string) => void;
}

export function MonthlyScreen({
  year, month, entries, goals, cycleStatus,
  onAddEntry, onEdit, onDayTap, onAddGoal, onEditGoal, onDeleteGoal, onToggleGoalDone
}: MonthlyScreenProps) {
  const { styles } = useTheme();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${pad(month + 1)}`;
  const monthEntries = entries.filter(e => e.date?.startsWith(monthKey));
  const monthGoals = goals.filter(g => g.year === year && g.month === month);
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
            <div key={d} style={{ ...styles.miniCalDow, color: d === '일' || d === '토' ? '#c0583f' : '#6b5d4d' }}>{d}</div>
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
        <p style={{ fontSize: 13, color: '#b8a99a', textAlign: 'center', padding: 20 }}>등록된 항목이 없습니다</p>
      ) : (
        monthEntries.slice(0, 30).map(entry => (
          <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
            onEdit={() => onEdit(entry)} onDelete={() => {}} />
        ))
      )}

      {/* Monthly Goals */}
      <div style={{ ...styles.sectionHeader as React.CSSProperties, marginTop: 20 }}>
        <span style={styles.sectionTitle}>월간 목표</span>
        <button style={styles.sectionAdd as React.CSSProperties} onClick={onAddGoal}>+</button>
      </div>
      {monthGoals.map(g => (
        <div key={g.id} style={styles.goalRow as React.CSSProperties}
          onClick={() => onToggleGoalDone(g.id)}
          onContextMenu={(e) => { e.preventDefault(); onEditGoal(g); }}>
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
      ))}
    </div>
  );
}
