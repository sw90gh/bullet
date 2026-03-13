import React, { useMemo } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { formatDateKey, getTodayStr } from '../utils/date';
import { Entry } from '../types';

interface DailySummaryProps {
  date: Date;
  entries: Entry[];
}

export function DailySummary({ date, entries }: DailySummaryProps) {
  const { C } = useTheme();
  const dateStr = formatDateKey(date);

  const stats = useMemo(() => {
    const dayEntries = entries.filter(e => e.date === dateStr);
    const total = dayEntries.length;
    const done = dayEntries.filter(e => e.status === 'done').length;
    const progress = dayEntries.filter(e => e.status === 'progress').length;
    const todo = dayEntries.filter(e => e.status === 'todo').length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, progress, todo, rate };
  }, [entries, dateStr]);

  if (stats.total === 0) return null;

  return (
    <div style={{
      background: C.bgWhite, borderRadius: 12, padding: '10px 14px', marginBottom: 10,
      boxShadow: `0 1px 3px ${C.cardShadow}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${C.green} ${stats.rate * 3.6}deg, ${C.borderLight} 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: C.bgWhite,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: C.textPrimary,
        }}>{stats.rate}%</div>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: C.textSecondary }}>
          <span style={{ fontWeight: 700, color: C.green }}>{stats.done}</span>/{stats.total} 완료
        </div>
        {stats.todo > 0 && (
          <div style={{ fontSize: 11, color: C.textMuted }}>
            남은 할일 <span style={{ fontWeight: 600 }}>{stats.todo}</span>
          </div>
        )}
        {stats.progress > 0 && (
          <div style={{ fontSize: 11, color: C.amber }}>
            진행 중 <span style={{ fontWeight: 600 }}>{stats.progress}</span>
          </div>
        )}
      </div>
    </div>
  );
}
