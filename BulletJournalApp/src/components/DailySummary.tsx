import React, { useMemo } from 'react';
import { formatDateKey, getTodayStr } from '../utils/date';
import { Entry } from '../types';

interface DailySummaryProps {
  date: Date;
  entries: Entry[];
  isDark?: boolean;
}

export function DailySummary({ date, entries, isDark = false }: DailySummaryProps) {
  const dateStr = formatDateKey(date);
  const isToday = dateStr === getTodayStr();

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

  const C = isDark
    ? { bg: '#2a2a2a', text: '#e8e0d4', sub: '#a89888', muted: '#6b5d4d', green: '#5aac4f', amber: '#d0a85f', border: '#3a3530' }
    : { bg: 'white', text: '#2c2416', sub: '#6b5d4d', muted: '#b8a99a', green: '#4a8c3f', amber: '#c0883f', border: '#ebe5dc' };

  return (
    <div style={{
      background: C.bg, borderRadius: 12, padding: '10px 14px', marginBottom: 10,
      boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(44,36,22,0.06)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Mini donut */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${C.green} ${stats.rate * 3.6}deg, ${C.border} 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: C.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: C.text,
        }}>{stats.rate}%</div>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: C.sub }}>
          <span style={{ fontWeight: 700, color: C.green }}>{stats.done}</span>/{stats.total} 완료
        </div>
        {stats.todo > 0 && (
          <div style={{ fontSize: 11, color: C.muted }}>
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
