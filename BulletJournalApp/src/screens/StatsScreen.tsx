import React, { useMemo } from 'react';
import { getStyles } from '../styles/theme';
import { STATUS } from '../utils/constants';
import { pad } from '../utils/date';
import { Entry } from '../types';

interface StatsScreenProps {
  year: number;
  month: number;
  entries: Entry[];
  isDark?: boolean;
}

export function StatsScreen({ year, month, entries, isDark = false }: StatsScreenProps) {
  const styles = getStyles(isDark);
  const monthKey = `${year}-${pad(month + 1)}`;
  const C = isDark
    ? { bg: '#2a2a2a', text: '#e8e0d4', sub: '#a89888', muted: '#6b5d4d', border: '#3a3530', green: '#5aac4f', amber: '#d0a85f', red: '#c0583f', blue: '#5a9cc5' }
    : { bg: 'white', text: '#2c2416', sub: '#6b5d4d', muted: '#b8a99a', border: '#ebe5dc', green: '#4a8c3f', amber: '#c0883f', red: '#c0583f', blue: '#3a7ca5' };

  const monthEntries = useMemo(() => entries.filter(e => e.date?.startsWith(monthKey)), [entries, monthKey]);
  const allYearEntries = useMemo(() => entries.filter(e => e.date?.startsWith(`${year}`)), [entries, year]);

  const monthStats = useMemo(() => {
    const total = monthEntries.length;
    const done = monthEntries.filter(e => e.status === 'done').length;
    const progress = monthEntries.filter(e => e.status === 'progress').length;
    const cancelled = monthEntries.filter(e => e.status === 'cancelled').length;
    const tasks = monthEntries.filter(e => e.type === 'task').length;
    const events = monthEntries.filter(e => e.type === 'event').length;
    const notes = monthEntries.filter(e => e.type === 'note').length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, progress, cancelled, tasks, events, notes, rate };
  }, [monthEntries]);

  const weeklyRates = useMemo(() => {
    const weeks: { label: string; total: number; done: number; rate: number }[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let weekStart = 1;
    let weekNum = 1;
    while (weekStart <= daysInMonth) {
      const weekEnd = Math.min(weekStart + 6, daysInMonth);
      const weekEntries = monthEntries.filter(e => {
        const day = parseInt(e.date?.slice(8) || '0');
        return day >= weekStart && day <= weekEnd;
      });
      const total = weekEntries.length;
      const done = weekEntries.filter(e => e.status === 'done').length;
      weeks.push({
        label: `${weekNum}주`,
        total,
        done,
        rate: total > 0 ? Math.round((done / total) * 100) : 0,
      });
      weekStart = weekEnd + 1;
      weekNum++;
    }
    return weeks;
  }, [monthEntries, year, month]);

  const monthlyRates = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const mk = `${year}-${pad(m + 1)}`;
      const me = allYearEntries.filter(e => e.date?.startsWith(mk));
      const total = me.length;
      const done = me.filter(e => e.status === 'done').length;
      return {
        label: `${m + 1}월`,
        total,
        done,
        rate: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
  }, [allYearEntries, year]);

  const tagStats = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    monthEntries.forEach(e => {
      e.tags?.forEach(t => {
        const prev = map.get(t) || { total: 0, done: 0 };
        map.set(t, { total: prev.total + 1, done: prev.done + (e.status === 'done' ? 1 : 0) });
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8);
  }, [monthEntries]);

  // 연간 통계
  const yearStats = useMemo(() => {
    const total = allYearEntries.length;
    const done = allYearEntries.filter(e => e.status === 'done').length;
    return { total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [allYearEntries]);

  const yearGoals = entries.filter(e => (e.type === 'goal-yearly' || e.type === 'goal-monthly') && e.date?.startsWith(`${year}`));
  const goalsDone = yearGoals.filter(e => e.status === 'done').length;
  const goalsRate = yearGoals.length > 0 ? Math.round((goalsDone / yearGoals.length) * 100) : 0;

  const barBg: React.CSSProperties = {
    height: 6, borderRadius: 3, background: C.border, overflow: 'hidden', flex: 1,
  };

  const cardStyle: React.CSSProperties = {
    background: C.bg, borderRadius: 14, padding: 16, marginBottom: 12,
    boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(44,36,22,0.06)',
  };

  return (
    <div>
      {/* 연간 요약 */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          {year}년 전체 요약
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{yearStats.total}</div>
            <div style={{ fontSize: 10, color: C.muted }}>전체</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.green }}>{yearStats.done}</div>
            <div style={{ fontSize: 10, color: C.muted }}>완료</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.blue }}>{yearStats.rate}%</div>
            <div style={{ fontSize: 10, color: C.muted }}>완료율</div>
          </div>
        </div>
      </div>

      {/* 월간 요약 */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          {month + 1}월 요약
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `conic-gradient(${C.green} ${monthStats.rate * 3.6}deg, ${C.border} 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%', background: C.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: C.text,
            }}>{monthStats.rate}%</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ fontSize: 11, color: C.sub }}>전체 <strong>{monthStats.total}</strong></div>
              <div style={{ fontSize: 11, color: C.green }}>완료 <strong>{monthStats.done}</strong></div>
              <div style={{ fontSize: 11, color: C.amber }}>진행 <strong>{monthStats.progress}</strong></div>
              <div style={{ fontSize: 11, color: C.red }}>취소 <strong>{monthStats.cancelled}</strong></div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ fontSize: 11, color: C.sub }}>할일 {monthStats.tasks}</div>
          <div style={{ fontSize: 11, color: C.red }}>일정 {monthStats.events}</div>
          <div style={{ fontSize: 11, color: C.sub }}>메모 {monthStats.notes}</div>
        </div>
      </div>

      {/* 주간별 완료율 */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>주간별 완료율</div>
        {weeklyRates.map(w => (
          <div key={w.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: C.sub, width: 28, flexShrink: 0 }}>{w.label}</span>
            <div style={barBg}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: w.rate > 70 ? C.green : w.rate > 40 ? C.amber : C.red,
                width: `${w.rate}%`, transition: 'width 0.3s',
              }} />
            </div>
            <span style={{ fontSize: 10, color: C.muted, width: 40, textAlign: 'right', flexShrink: 0 }}>
              {w.done}/{w.total}
            </span>
          </div>
        ))}
      </div>

      {/* 연간 월별 추이 */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>{year}년 월별 추이</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
          {monthlyRates.map((m, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: Math.max(2, m.rate * 0.7),
                background: i === month ? C.text : m.rate > 70 ? C.green : m.rate > 0 ? C.amber : C.border,
                borderRadius: '3px 3px 0 0', transition: 'height 0.3s',
                marginBottom: 3,
              }} />
              <div style={{ fontSize: 8, color: i === month ? C.text : C.muted }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 태그별 통계 */}
      {tagStats.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>태그별 현황</div>
          {tagStats.map(([tag, stat]) => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.blue, minWidth: 50, flexShrink: 0 }}>#{tag}</span>
              <div style={barBg}>
                <div style={{
                  height: '100%', borderRadius: 3, background: C.blue,
                  width: `${stat.total > 0 ? (stat.done / stat.total) * 100 : 0}%`,
                }} />
              </div>
              <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{stat.done}/{stat.total}</span>
            </div>
          ))}
        </div>
      )}

      {/* 목표 달성률 */}
      {yearGoals.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            {year}년 목표 달성 ({goalsDone}/{yearGoals.length})
          </div>
          <div style={barBg}>
            <div style={{
              height: '100%', borderRadius: 3, background: C.green,
              width: `${goalsRate}%`,
            }} />
          </div>
          <div style={{ fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 6 }}>{goalsRate}% 달성</div>
        </div>
      )}
    </div>
  );
}
