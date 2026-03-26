import React, { useMemo, useRef, useState, useCallback } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { STATUS, PRIORITY, TYPES, DAYS_KR } from '../utils/constants';
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
  const { styles, C, statusColor } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<GanttRange>('month');

  // 가로 스크롤 동기화 (본문 → 헤더)
  const handleBodyScroll = useCallback(() => {
    if (scrollRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  }, []);
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
    const rawWidth = (endOffset - startOffset + 1) * dayWidth - 4;
    const width = Math.max(Math.max(dayWidth, 28), rawWidth);
    return { left, width };
  };

  const getBarColor = (entry: Entry) => {
    return statusColor(entry.status);
  };

  const [filterMode, setFilterMode] = useState<'all' | 'hide-done' | 'hide-inactive'>('all');

  const getBarOpacity = (entry: Entry) => {
    if (entry.status === 'migrated' || entry.status === 'migrated_up') return 0.25;
    if (entry.status === 'cancelled') return 0.3;
    if (entry.status === 'done') return 0.7;
    return 1;
  };

  const displayEntries = filterMode === 'hide-done'
    ? ganttEntries.filter(e => e.status !== 'done' && e.status !== 'migrated' && e.status !== 'migrated_up' && e.status !== 'cancelled')
    : filterMode === 'hide-inactive'
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
            <div style={{ width: 10, height: 10, borderRadius: 2, background: statusColor(k),
              opacity: k === 'cancelled' || k === 'migrated' || k === 'migrated_up' ? 0.3 : k === 'done' ? 0.7 : 1 }} />
            <span style={{ color: C.textSecondary }}>{v.label}</span>
          </div>
        ))}
        <button
          style={{
            marginLeft: 'auto', fontSize: 10, padding: '3px 8px', borderRadius: 6,
            border: `1px solid ${C.border}`, cursor: 'pointer',
            background: filterMode !== 'all' ? C.primary : C.bgWhite,
            color: filterMode !== 'all' ? C.headerText : C.textSecondary,
            fontFamily: '-apple-system, sans-serif',
          }}
          onClick={() => setFilterMode(filterMode === 'all' ? 'hide-inactive' : filterMode === 'hide-inactive' ? 'hide-done' : 'all')}
        >
          {filterMode === 'all' ? '이관/취소 숨김' : filterMode === 'hide-inactive' ? '완료도 숨김' : '전체 보기'}
        </button>
      </div>

      {displayEntries.length === 0 ? (
        <div style={styles.emptyState as React.CSSProperties}>
          <p style={{ color: C.textMuted, fontSize: 14 }}>해당 기간에 일정이 없습니다</p>
          <p style={{ color: C.textLight, fontSize: 12, marginTop: 8 }}>
            항목 추가 시 종료일을 설정하면 간트차트에 표시됩니다
          </p>
        </div>
      ) : (
        <div style={{
          ...styles.ganttContainer as React.CSSProperties,
          position: 'relative',
          maxHeight: 'calc(100vh - 240px)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        } as React.CSSProperties}>
          {/* Sticky header row */}
          <div style={{ display: 'flex', flexShrink: 0, borderBottom: `2px solid ${C.border}` }}>
            <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, flexShrink: 0, borderRight: `2px solid ${C.border}`, height: 28 }} />
            <div ref={headerScrollRef} style={{
              flex: 1, overflowX: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none',
            } as React.CSSProperties}>
              <div style={{ display: 'flex', width: totalDays * dayWidth, minWidth: '100%', height: 28 }}>
                {dayLabels.map((dl, i) => (
                  <div key={i} style={{
                    width: dayWidth, minWidth: dayWidth, textAlign: 'center',
                    fontSize: range === 'quarter' ? 8 : 9,
                    color: dl.isToday ? C.accent : dl.isWeekend ? `${C.accent}88` : C.textMuted,
                    background: dl.isToday ? `${C.accent}18` : C.bgWhite,
                    fontWeight: dl.isToday ? 700 : 400,
                    borderRight: `1px solid ${C.borderLight}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}>{dl.label}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div style={{ display: 'flex' }}>
            {/* Fixed label column */}
            <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, flexShrink: 0, borderRight: `2px solid ${C.border}` }}>
              {displayEntries.map(entry => {
                const pr = PRIORITY[entry.priority] || PRIORITY.none;
                const tp = TYPES[entry.type];
                const isInactive = entry.status === 'done' || entry.status === 'cancelled' || entry.status === 'migrated' || entry.status === 'migrated_up';
                return (
                  <div key={entry.id} style={{
                    height: ROW_HEIGHT, display: 'flex', alignItems: 'center',
                    width: LABEL_WIDTH, padding: '0 4px', fontSize: 11,
                    borderBottom: `1px solid ${C.borderLight}`, boxSizing: 'border-box',
                    cursor: 'pointer',
                    opacity: entry.status === 'migrated' || entry.status === 'migrated_up' ? 0.4 : 1,
                  } as React.CSSProperties}
                    onClick={() => onEdit(entry)}
                  >
                    {tp && (
                      <span style={{
                        fontSize: 10, marginRight: 2, flexShrink: 0,
                        color: entry.type === 'event' ? C.accent
                          : (entry.type === 'goal-yearly' || entry.type === 'goal-monthly') ? C.blue
                          : C.textMuted,
                      }}>{tp.symbol}</span>
                    )}
                    {pr.symbol && (
                      <span style={{ color: entry.priority === 'urgent' ? C.accent : C.amber, marginRight: 2, fontSize: 9 }}>
                        {pr.symbol}
                      </span>
                    )}
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: isInactive ? 'line-through' : 'none',
                      color: isInactive ? C.textMuted : C.textPrimary,
                    }}>{entry.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Scrollable timeline */}
            <div ref={scrollRef} onScroll={handleBodyScroll} style={{
              overflowX: 'auto', flex: 1,
              scrollbarWidth: 'none', msOverflowStyle: 'none',
            } as React.CSSProperties}>
              <div style={{ width: totalDays * dayWidth, minWidth: '100%' }}>

                {/* Bars */}
                {displayEntries.map(entry => {
                  const { left, width } = getBarPosition(entry);
                  const color = getBarColor(entry);
                  const opacity = getBarOpacity(entry);

                  return (
                    <div key={entry.id} style={{
                      height: ROW_HEIGHT,
                      position: 'relative',
                      borderBottom: `1px solid ${C.borderLight}`,
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
                          borderRight: `1px solid ${C.borderLight}`,
                          background: dl.isToday ? `${C.accent}08` : 'transparent',
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
                          fontSize: 9, color: C.headerText, padding: '0 3px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: '20px',
                        }}>
                          {width > 30 ? entry.text : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </div> {/* body wrapper end */}
        </div>
      )}

      {/* 간결한 통계 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: C.textSecondary }}>전체 <strong>{ganttEntries.length}</strong></span>
        <span style={{ fontSize: 11, color: C.green }}>완료 <strong>{ganttEntries.filter(e => e.status === 'done').length}</strong></span>
        <span style={{ fontSize: 11, color: C.amber }}>진행 <strong>{ganttEntries.filter(e => e.status === 'progress').length}</strong></span>
      </div>
    </div>
  );
}
