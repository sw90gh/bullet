import React, { useMemo, useRef } from 'react';
import { styles } from '../styles/theme';
import { STATUS, PRIORITY } from '../utils/constants';
import { getDaysInMonth, pad, daysBetween, formatDateKey } from '../utils/date';
import { Entry } from '../types';

interface GanttScreenProps {
  year: number;
  month: number;
  entries: Entry[];
  onEdit: (entry: Entry) => void;
}

const DAY_WIDTH = 32;
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 130;

export function GanttScreen({ year, month, entries, onEdit }: GanttScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const daysInMonth = getDaysInMonth(year, month);
  const monthStart = `${year}-${pad(month + 1)}-01`;
  const monthEnd = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
  const todayStr = formatDateKey(new Date());

  // Filter entries that overlap with this month
  const ganttEntries = useMemo(() => {
    return entries
      .filter(e => {
        const start = e.startDate || e.date;
        const end = e.endDate || e.date;
        if (!start) return false;
        return start <= monthEnd && end >= monthStart;
      })
      .sort((a, b) => {
        const as = a.startDate || a.date;
        const bs = b.startDate || b.date;
        return as.localeCompare(bs);
      });
  }, [entries, monthStart, monthEnd]);

  const getBarPosition = (entry: Entry) => {
    const start = entry.startDate || entry.date;
    const end = entry.endDate || entry.date;
    const startOffset = Math.max(0, daysBetween(monthStart, start));
    const endOffset = Math.min(daysInMonth - 1, daysBetween(monthStart, end));
    const left = startOffset * DAY_WIDTH;
    const width = Math.max(DAY_WIDTH * 0.8, (endOffset - startOffset + 1) * DAY_WIDTH - 4);
    return { left, width };
  };

  const getBarColor = (entry: Entry) => {
    const st = STATUS[entry.status];
    if (!st) return '#2c2416';
    return st.color;
  };

  const getBarOpacity = (entry: Entry) => {
    if (entry.status === 'cancelled') return 0.4;
    if (entry.status === 'done') return 0.7;
    return 1;
  };

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(STATUS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: v.color,
              opacity: k === 'cancelled' ? 0.4 : k === 'done' ? 0.7 : 1 }} />
            <span style={{ color: '#6b5d4d' }}>{v.label}</span>
          </div>
        ))}
      </div>

      {ganttEntries.length === 0 ? (
        <div style={styles.emptyState as React.CSSProperties}>
          <p style={{ color: '#b8a99a', fontSize: 14 }}>이번 달 일정이 없습니다</p>
          <p style={{ color: '#ccc4b8', fontSize: 12, marginTop: 8 }}>
            항목 추가 시 종료일을 설정하면 간트차트에 표시됩니다
          </p>
        </div>
      ) : (
        <div style={{ ...styles.ganttContainer as React.CSSProperties, position: 'relative' }}>
          {/* Scrollable area */}
          <div style={{ display: 'flex' }}>
            {/* Fixed label column */}
            <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, flexShrink: 0, borderRight: '2px solid #ddd5c9' }}>
              {/* Day header spacer */}
              <div style={{ height: 32, borderBottom: '1px solid #ddd5c9', boxSizing: 'border-box' }} />
              {/* Labels */}
              {ganttEntries.map(entry => {
                const pr = PRIORITY[entry.priority] || PRIORITY.none;
                return (
                  <div key={entry.id} style={{
                    height: ROW_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    width: LABEL_WIDTH,
                    padding: '0 8px',
                    fontSize: 12,
                    color: '#2c2416',
                    borderBottom: '1px solid #ebe5dc',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  } as React.CSSProperties}
                    onClick={() => onEdit(entry)}
                  >
                    {pr.symbol && (
                      <span style={{ color: entry.priority === 'urgent' ? '#c0583f' : '#c0883f', marginRight: 4, fontSize: 11 }}>
                        {pr.symbol}
                      </span>
                    )}
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: entry.status === 'done' || entry.status === 'cancelled' ? 'line-through' : 'none',
                      color: entry.status === 'done' || entry.status === 'cancelled' ? '#b8a99a' : '#2c2416',
                    }}>{entry.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Scrollable timeline */}
            <div ref={scrollRef} style={{ overflowX: 'auto', flex: 1 }}>
              <div style={{ width: daysInMonth * DAY_WIDTH, minWidth: '100%' }}>
                {/* Day headers */}
                <div style={styles.ganttDayHeader as React.CSSProperties}>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayStr = `${year}-${pad(month + 1)}-${pad(i + 1)}`;
                    const isToday = dayStr === todayStr;
                    const d = new Date(year, month, i + 1);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={i} style={{
                        ...styles.ganttDayCell,
                        width: DAY_WIDTH,
                        minWidth: DAY_WIDTH,
                        background: isToday ? '#c0583f18' : isWeekend ? '#faf6f0' : 'transparent',
                        fontWeight: isToday ? 700 : 400,
                        color: isToday ? '#c0583f' : isWeekend ? '#c0583f88' : '#b8a99a',
                      } as React.CSSProperties}>
                        {i + 1}
                      </div>
                    );
                  })}
                </div>

                {/* Bars */}
                {ganttEntries.map(entry => {
                  const { left, width } = getBarPosition(entry);
                  const color = getBarColor(entry);
                  const opacity = getBarOpacity(entry);

                  return (
                    <div key={entry.id} style={{
                      height: ROW_HEIGHT,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: '1px solid #ebe5dc',
                      boxSizing: 'border-box',
                    }}>
                      {/* Grid lines */}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const dayStr = `${year}-${pad(month + 1)}-${pad(i + 1)}`;
                        const isToday = dayStr === todayStr;
                        return (
                          <div key={i} style={{
                            position: 'absolute',
                            left: i * DAY_WIDTH,
                            top: 0,
                            bottom: 0,
                            width: DAY_WIDTH,
                            borderRight: '1px solid #ebe5dc',
                            background: isToday ? '#c0583f08' : 'transparent',
                          }} />
                        );
                      })}
                      {/* Bar */}
                      <div
                        style={{
                          ...styles.ganttBar,
                          left,
                          width,
                          background: color,
                          opacity,
                        } as React.CSSProperties}
                        onClick={() => onEdit(entry)}
                        title={`${entry.text} (${entry.startDate || entry.date} ~ ${entry.endDate || entry.date})`}
                      >
                        <span style={{
                          fontSize: 10, color: 'white', padding: '0 4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: '20px',
                        }}>
                          {width > 60 ? entry.text : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ marginTop: 16, padding: '12px 14px', background: 'white', borderRadius: 12,
        boxShadow: '0 1px 3px rgba(44,36,22,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2416', marginBottom: 8 }}>이번 달 통계</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#2c2416' }}>{ganttEntries.length}</div>
            <div style={{ fontSize: 11, color: '#6b5d4d' }}>전체</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#4a8c3f' }}>
              {ganttEntries.filter(e => e.status === 'done').length}
            </div>
            <div style={{ fontSize: 11, color: '#6b5d4d' }}>완료</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#c0883f' }}>
              {ganttEntries.filter(e => e.status === 'progress').length}
            </div>
            <div style={{ fontSize: 11, color: '#6b5d4d' }}>진행 중</div>
          </div>
        </div>
      </div>
    </div>
  );
}
