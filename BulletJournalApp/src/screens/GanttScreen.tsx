import React, { useMemo, useRef, useState } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { STATUS, PRIORITY, DAYS_KR } from '../utils/constants';
import { getDaysInMonth, pad, daysBetween, formatDateKey, getWeekDates, addDays } from '../utils/date';
import { Entry } from '../types';

interface GanttScreenProps {
  year: number;
  month: number;
  entries: Entry[];
  onEdit: (entry: Entry) => void;
}

type GanttRange = 'week' | 'month' | 'quarter';

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 110;

export function GanttScreen({ year, month, entries, onEdit }: GanttScreenProps) {
  const { styles } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<GanttRange>('month');
  const todayStr = formatDateKey(new Date());

  // 범위에 따른 시작일/종료일/일수 계산
  const { rangeStart, rangeEnd, totalDays, dayWidth, dayLabels } = useMemo(() => {
    let start: string, end: string, days: number, dw: number;
    const labels: { label: string; isToday: boolean; isWeekend: boolean }[] = [];

    if (range === 'week') {
      const weekDates = getWeekDates(year, month, new Date().getDate());
      start = formatDateKey(weekDates[0]);
      end = formatDateKey(weekDates[6]);
      days = 7;
      dw = Math.floor((window.innerWidth - LABEL_WIDTH - 40) / 7);
      dw = Math.max(dw, 36);
      for (let i = 0; i < 7; i++) {
        const d = weekDates[i];
        const ds = formatDateKey(d);
        labels.push({
          label: `${d.getDate()}${DAYS_KR[d.getDay()]}`,
          isToday: ds === todayStr,
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
        });
      }
    } else if (range === 'quarter') {
      const qStartMonth = Math.floor(month / 3) * 3;
      start = `${year}-${pad(qStartMonth + 1)}-01`;
      const qEndMonth = qStartMonth + 2;
      const qEndDays = getDaysInMonth(year, qEndMonth);
      end = `${year}-${pad(qEndMonth + 1)}-${pad(qEndDays)}`;
      days = daysBetween(start, end) + 1;
      dw = 10;
      for (let i = 0; i < days; i++) {
        const ds = addDays(start, i);
        const d = new Date(year, qStartMonth, 1);
        d.setDate(d.getDate() + i);
        labels.push({
          label: d.getDate() === 1 ? `${d.getMonth() + 1}월` : (d.getDate() % 5 === 0 ? `${d.getDate()}` : ''),
          isToday: ds === todayStr,
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
        });
      }
    } else {
      // month
      const dim = getDaysInMonth(year, month);
      start = `${year}-${pad(month + 1)}-01`;
      end = `${year}-${pad(month + 1)}-${pad(dim)}`;
      days = dim;
      dw = 32;
      for (let i = 0; i < dim; i++) {
        const ds = `${year}-${pad(month + 1)}-${pad(i + 1)}`;
        const d = new Date(year, month, i + 1);
        labels.push({
          label: `${i + 1}`,
          isToday: ds === todayStr,
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
        });
      }
    }

    return { rangeStart: start, rangeEnd: end, totalDays: days, dayWidth: dw, dayLabels: labels };
  }, [range, year, month, todayStr]);

  // Filter entries that overlap with range
  const ganttEntries = useMemo(() => {
    return entries
      .filter(e => {
        const start = e.startDate || e.date;
        const end = e.endDate || e.date;
        if (!start) return false;
        return start <= rangeEnd && end >= rangeStart;
      })
      .sort((a, b) => {
        const as = a.startDate || a.date;
        const bs = b.startDate || b.date;
        return as.localeCompare(bs);
      });
  }, [entries, rangeStart, rangeEnd]);

  const getBarPosition = (entry: Entry) => {
    const start = entry.startDate || entry.date;
    const end = entry.endDate || entry.date;
    const startOffset = Math.max(0, daysBetween(rangeStart, start));
    const endOffset = Math.min(totalDays - 1, daysBetween(rangeStart, end));
    const left = startOffset * dayWidth;
    const width = Math.max(dayWidth * 0.8, (endOffset - startOffset + 1) * dayWidth - 4);
    return { left, width };
  };

  const getBarColor = (entry: Entry) => {
    const st = STATUS[entry.status];
    return st ? st.color : '#2c2416';
  };

  const [hideInactive, setHideInactive] = useState(false);

  const getBarOpacity = (entry: Entry) => {
    if (entry.status === 'migrated' || entry.status === 'migrated_up') return 0.25;
    if (entry.status === 'cancelled') return 0.3;
    if (entry.status === 'done') return 0.7;
    return 1;
  };

  const displayEntries = hideInactive
    ? ganttEntries.filter(e => e.status !== 'migrated' && e.status !== 'migrated_up' && e.status !== 'cancelled')
    : ganttEntries;

  return (
    <div>
      {/* Range selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {([
          { key: 'week' as GanttRange, label: '주간' },
          { key: 'month' as GanttRange, label: '월간' },
          { key: 'quarter' as GanttRange, label: '분기' },
        ]).map(t => (
          <button key={t.key}
            style={{
              ...styles.chip,
              ...(range === t.key ? styles.chipActive : {}),
              flex: 1, textAlign: 'center',
            }}
            onClick={() => setRange(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Legend + Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(STATUS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: v.color,
              opacity: k === 'cancelled' || k === 'migrated' || k === 'migrated_up' ? 0.3 : k === 'done' ? 0.7 : 1 }} />
            <span style={{ color: '#6b5d4d' }}>{v.label}</span>
          </div>
        ))}
        <button
          style={{
            marginLeft: 'auto', fontSize: 10, padding: '3px 8px', borderRadius: 6,
            border: '1px solid #ddd5c9', cursor: 'pointer',
            background: hideInactive ? '#2c2416' : 'white',
            color: hideInactive ? 'white' : '#6b5d4d',
            fontFamily: '-apple-system, sans-serif',
          }}
          onClick={() => setHideInactive(!hideInactive)}
        >
          {hideInactive ? '전체 보기' : '이관/취소 숨김'}
        </button>
      </div>

      {displayEntries.length === 0 ? (
        <div style={styles.emptyState as React.CSSProperties}>
          <p style={{ color: '#b8a99a', fontSize: 14 }}>해당 기간에 일정이 없습니다</p>
          <p style={{ color: '#ccc4b8', fontSize: 12, marginTop: 8 }}>
            항목 추가 시 종료일을 설정하면 간트차트에 표시됩니다
          </p>
        </div>
      ) : (
        <div style={{ ...styles.ganttContainer as React.CSSProperties, position: 'relative' }}>
          <div style={{ display: 'flex' }}>
            {/* Fixed label column */}
            <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, flexShrink: 0, borderRight: '2px solid #ddd5c9' }}>
              <div style={{ height: 28, borderBottom: '1px solid #ddd5c9', boxSizing: 'border-box' }} />
              {displayEntries.map(entry => {
                const pr = PRIORITY[entry.priority] || PRIORITY.none;
                const isInactive = entry.status === 'done' || entry.status === 'cancelled' || entry.status === 'migrated' || entry.status === 'migrated_up';
                return (
                  <div key={entry.id} style={{
                    height: ROW_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    width: LABEL_WIDTH,
                    padding: '0 6px',
                    fontSize: 11,
                    borderBottom: '1px solid #ebe5dc',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    opacity: entry.status === 'migrated' || entry.status === 'migrated_up' ? 0.4 : 1,
                  } as React.CSSProperties}
                    onClick={() => onEdit(entry)}
                  >
                    {pr.symbol && (
                      <span style={{ color: entry.priority === 'urgent' ? '#c0583f' : '#c0883f', marginRight: 3, fontSize: 10 }}>
                        {pr.symbol}
                      </span>
                    )}
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: isInactive ? 'line-through' : 'none',
                      color: isInactive ? '#b8a99a' : '#2c2416',
                    }}>{entry.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Scrollable timeline */}
            <div ref={scrollRef} style={{
              overflowX: 'auto', flex: 1,
              scrollbarWidth: 'none', msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}>
              <div style={{ width: totalDays * dayWidth, minWidth: '100%' }}>
                {/* Day headers */}
                <div style={{ display: 'flex', borderBottom: '1px solid #ddd5c9', height: 28, boxSizing: 'border-box' }}>
                  {dayLabels.map((dl, i) => (
                    <div key={i} style={{
                      width: dayWidth,
                      minWidth: dayWidth,
                      textAlign: 'center',
                      fontSize: range === 'quarter' ? 8 : 9,
                      color: dl.isToday ? '#c0583f' : dl.isWeekend ? '#c0583f88' : '#b8a99a',
                      background: dl.isToday ? '#c0583f18' : 'transparent',
                      fontWeight: dl.isToday ? 700 : 400,
                      borderRight: '1px solid #ebe5dc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}>
                      {dl.label}
                    </div>
                  ))}
                </div>

                {/* Bars */}
                {displayEntries.map(entry => {
                  const { left, width } = getBarPosition(entry);
                  const color = getBarColor(entry);
                  const opacity = getBarOpacity(entry);

                  return (
                    <div key={entry.id} style={{
                      height: ROW_HEIGHT,
                      position: 'relative',
                      borderBottom: '1px solid #ebe5dc',
                      boxSizing: 'border-box',
                    }}>
                      {/* Grid lines */}
                      {dayLabels.map((dl, i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          left: i * dayWidth,
                          top: 0,
                          bottom: 0,
                          width: dayWidth,
                          borderRight: '1px solid #ebe5dc',
                          background: dl.isToday ? '#c0583f08' : 'transparent',
                        }} />
                      ))}
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
                          fontSize: 9, color: 'white', padding: '0 3px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: '20px',
                        }}>
                          {width > 50 ? entry.text : ''}
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
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2416', marginBottom: 8 }}>통계</div>
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
