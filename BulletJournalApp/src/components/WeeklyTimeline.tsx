import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { STATUS } from '../utils/constants';
import { formatDateKey, getTodayStr } from '../utils/date';
import { Entry } from '../types';

interface WeeklyTimelineProps {
  dates: Date[];          // 3일 배열
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onUpdateEntry: (id: string, updates: Partial<Entry>) => void;
}

const HOUR_HEIGHT = 44;
const START_HOUR = 6;
const END_HOUR = 23;
const SNAP_MINUTES = 15;
const HEADER_HEIGHT = 36;
const TIME_LABEL_WIDTH = 36;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}
function snapMinutes(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}
function yToMinutes(y: number): number {
  const raw = START_HOUR * 60 + (y / HOUR_HEIGHT) * 60;
  return snapMinutes(Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, raw)));
}

const DAYS_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

export function WeeklyTimeline({ dates, entries, onEdit, onUpdateEntry }: WeeklyTimelineProps) {
  const { C, statusColor } = useTheme();
  const todayStr = getTodayStr();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const dateStrs = useMemo(() => dates.map(d => formatDateKey(d)), [dates]);

  // 날짜별 시간 지정 항목
  const columns = useMemo(() => {
    return dateStrs.map(ds => {
      return entries
        .filter(e => e.date === ds && e.time)
        .sort((a, b) => timeToMinutes(a.time!) - timeToMinutes(b.time!));
    });
  }, [entries, dateStrs]);

  const colWidth = `calc((100% - ${TIME_LABEL_WIDTH}px) / 3)`;

  // Drag state
  const [dragState, setDragState] = useState<{
    entryId: string;
    origDateStr: string;
    startY: number;
    startX: number;
    origMinutes: number;
    origEndMinutes: number;
    currentTop: number;
    currentHeight: number;
    currentColIdx: number;
  } | null>(null);
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const pendingDragRef = useRef<{
    entry: Entry;
    startY: number;
    startX: number;
  } | null>(null);

  const didDragMove = useRef(false);
  const DRAG_THRESHOLD = 10;

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, entry: Entry) => {
    didDragMove.current = false;
    const touch = e.touches[0];
    pendingDragRef.current = { entry, startY: touch.clientY, startX: touch.clientX };
  }, []);

  const getColIdxFromX = useCallback((clientX: number): number => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left - TIME_LABEL_WIDTH;
    const colW = (rect.width - TIME_LABEL_WIDTH) / 3;
    return Math.max(0, Math.min(2, Math.floor(x / colW)));
  }, []);

  const handleTouchMoveRef = useRef<(e: TouchEvent) => void>(() => {});
  const handleTouchEndRef = useRef<() => void>(() => {});

  handleTouchMoveRef.current = (e: TouchEvent) => {
    const touch = e.touches[0];

    // Pending → activate drag after threshold
    if (pendingDragRef.current && !dragStateRef.current) {
      const dy = Math.abs(touch.clientY - pendingDragRef.current.startY);
      const dx = Math.abs(touch.clientX - pendingDragRef.current.startX);
      if (dy < DRAG_THRESHOLD && dx < DRAG_THRESHOLD) return;

      const pending = pendingDragRef.current;
      const entry = pending.entry;
      e.preventDefault();
      didDragMove.current = true;

      const startMin = timeToMinutes(entry.time!);
      const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
      const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
      const colIdx = dateStrs.indexOf(entry.date);

      setDragState({
        entryId: entry.id,
        origDateStr: entry.date,
        startY: pending.startY,
        startX: pending.startX,
        origMinutes: startMin,
        origEndMinutes: endMin,
        currentTop: top,
        currentHeight: height,
        currentColIdx: colIdx >= 0 ? colIdx : 0,
      });
      pendingDragRef.current = null;
      return;
    }

    if (!dragStateRef.current) return;
    e.preventDefault();
    didDragMove.current = true;

    const ds = dragStateRef.current;
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = touch.clientY - rect.top - HEADER_HEIGHT;
    const minutes = yToMinutes(y);
    const newTop = ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const newColIdx = getColIdxFromX(touch.clientX);

    setDragState(prev => prev ? { ...prev, currentTop: newTop, currentColIdx: newColIdx } : null);
  };

  handleTouchEndRef.current = () => {
    pendingDragRef.current = null;
    const ds = dragStateRef.current;
    if (!ds) { setDragState(null); return; }

    if (didDragMove.current) {
      const newStartMin = snapMinutes(START_HOUR * 60 + (ds.currentTop / HOUR_HEIGHT) * 60);
      const duration = ds.origEndMinutes - ds.origMinutes;
      const newEndMin = newStartMin + duration;
      const newDate = dateStrs[ds.currentColIdx] || ds.origDateStr;

      const updates: Partial<Entry> = {
        time: minutesToTime(newStartMin),
        endTime: minutesToTime(newEndMin),
      };
      if (newDate !== ds.origDateStr) {
        updates.date = newDate;
      }
      onUpdateEntry(ds.entryId, updates);
    }
    setDragState(null);
  };

  // Mouse handlers (PC)
  const handleMouseDown = useCallback((e: React.MouseEvent, entry: Entry) => {
    if (e.button !== 0) return;
    didDragMove.current = false;

    const startMin = timeToMinutes(entry.time!);
    const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
    const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
    const colIdx = dateStrs.indexOf(entry.date);

    const startY = e.clientY;
    const startX = e.clientX;

    const state = {
      entryId: entry.id,
      origDateStr: entry.date,
      startY, startX,
      origMinutes: startMin,
      origEndMinutes: endMin,
      currentTop: top,
      currentHeight: height,
      currentColIdx: colIdx >= 0 ? colIdx : 0,
    };

    const onMouseMove = (ev: MouseEvent) => {
      const dy = Math.abs(ev.clientY - startY);
      const dx = Math.abs(ev.clientX - startX);
      if (!didDragMove.current && dy < DRAG_THRESHOLD && dx < DRAG_THRESHOLD) return;
      didDragMove.current = true;

      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const y = ev.clientY - rect.top - HEADER_HEIGHT;
      const minutes = yToMinutes(y);
      const newTop = ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const colW = (rect.width - TIME_LABEL_WIDTH) / 3;
      const x = ev.clientX - rect.left - TIME_LABEL_WIDTH;
      const newColIdx = Math.max(0, Math.min(2, Math.floor(x / colW)));

      setDragState(prev => prev ? { ...prev, currentTop: newTop, currentColIdx: newColIdx } : null);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const ds = dragStateRef.current;
      if (!ds) { setDragState(null); return; }
      if (didDragMove.current) {
        const newStartMin = snapMinutes(START_HOUR * 60 + (ds.currentTop / HOUR_HEIGHT) * 60);
        const duration = ds.origEndMinutes - ds.origMinutes;
        const newEndMin = newStartMin + duration;
        const newDate = dateStrs[ds.currentColIdx] || ds.origDateStr;
        const updates: Partial<Entry> = {
          time: minutesToTime(newStartMin),
          endTime: minutesToTime(newEndMin),
        };
        if (newDate !== ds.origDateStr) updates.date = newDate;
        onUpdateEntry(ds.entryId, updates);
      }
      setDragState(null);
    };

    setDragState(state);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [dateStrs, onUpdateEntry, getColIdxFromX]);

  // Register non-passive touch listeners
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => handleTouchMoveRef.current(e);
    const onEnd = () => handleTouchEndRef.current();
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, []);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  return (
    <div ref={containerRef} style={{
      background: C.bgWhite, borderRadius: 14, overflow: 'hidden',
      boxShadow: `0 1px 3px ${C.cardShadow}`,
      userSelect: 'none', WebkitUserSelect: 'none',
      touchAction: dragState ? 'none' : 'auto',
    } as React.CSSProperties}>
      <div ref={gridRef} style={{ position: 'relative' }}>
        {/* Column headers */}
        <div style={{
          display: 'flex', height: HEADER_HEIGHT,
          borderBottom: `2px solid ${C.border}`,
          position: 'sticky', top: 0, zIndex: 10, background: C.bgWhite,
        }}>
          <div style={{ width: TIME_LABEL_WIDTH, flexShrink: 0 }} />
          {dates.map((d, i) => {
            const ds = dateStrs[i];
            const isT = ds === todayStr;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div key={ds} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                borderLeft: i > 0 ? `1px solid ${C.borderLight}` : undefined,
                background: isT ? `${C.accent}08` : undefined,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: isT ? C.accent : isWeekend ? `${C.accent}88` : C.textSecondary,
                }}>{DAYS_SHORT[d.getDay()]}</span>
                <span style={{
                  fontSize: 12, fontWeight: isT ? 700 : 500,
                  color: isT ? C.accent : C.textPrimary,
                  ...(isT ? {
                    background: C.accent, color: 'white', borderRadius: '50%',
                    width: 22, height: 22, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                  } : {}),
                } as React.CSSProperties}>{d.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div style={{ position: 'relative', marginLeft: 0 }}>
          {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
            const hour = START_HOUR + i;
            return (
              <div key={hour} style={{
                height: HOUR_HEIGHT, display: 'flex',
                borderBottom: `1px solid ${C.borderLight}`,
              }}>
                <div style={{
                  width: TIME_LABEL_WIDTH, flexShrink: 0,
                  fontSize: 9, color: C.textMuted, textAlign: 'right',
                  paddingRight: 4, paddingTop: 0, lineHeight: '1',
                }}>{hour.toString().padStart(2, '0')}</div>
                {dates.map((_, ci) => (
                  <div key={ci} style={{
                    flex: 1,
                    borderLeft: `1px solid ${C.borderLight}`,
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', top: HOUR_HEIGHT / 2, left: 0, right: 0,
                      borderBottom: `1px dashed ${C.borderLight}`,
                    }} />
                  </div>
                ))}
              </div>
            );
          })}

          {/* Now indicator */}
          {dateStrs.includes(todayStr) && nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60 && (() => {
            const todayColIdx = dateStrs.indexOf(todayStr);
            return (
              <div style={{
                position: 'absolute',
                top: nowTop,
                left: `calc(${TIME_LABEL_WIDTH}px + ${todayColIdx} * ${colWidth})`,
                width: colWidth,
                borderTop: `2px solid ${C.accent}`,
                zIndex: 5,
              }}>
                <div style={{
                  position: 'absolute', left: -4, top: -4, width: 6, height: 6,
                  borderRadius: '50%', background: C.accent,
                }} />
              </div>
            );
          })()}

          {/* Entry blocks */}
          {columns.map((colEntries, ci) =>
            colEntries.map(entry => {
              const startMin = timeToMinutes(entry.time!);
              const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
              const isDraggingThis = dragState?.entryId === entry.id;
              const top = isDraggingThis ? dragState.currentTop
                : ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
              const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
              const colIdx = isDraggingThis ? dragState.currentColIdx : ci;
              const st = STATUS[entry.status] || STATUS.todo;
              const isEntryDone = entry.status === 'done' || entry.status === 'cancelled';

              return (
                <div key={entry.id}
                  style={{
                    position: 'absolute',
                    top,
                    left: `calc(${TIME_LABEL_WIDTH}px + ${colIdx} * ${colWidth} + 3px)`,
                    width: `calc(${colWidth} - 6px)`,
                    height,
                    background: isDraggingThis ? `${statusColor(entry.status)}40` : statusColor(entry.status) + '20',
                    borderLeft: `3px solid ${statusColor(entry.status)}`,
                    borderRadius: '0 4px 4px 0',
                    padding: '2px 4px',
                    cursor: 'grab',
                    overflow: 'hidden',
                    zIndex: isDraggingThis ? 15 : 3,
                    opacity: isEntryDone ? 0.5 : 1,
                    transition: isDraggingThis ? 'none' : 'top 0.2s, left 0.2s',
                    touchAction: 'none',
                  }}
                  onTouchStart={e => handleTouchStart(e, entry)}
                  onMouseDown={e => handleMouseDown(e, entry)}
                  onClick={() => { if (!didDragMove.current) onEdit(entry); }}
                >
                  <div style={{
                    fontSize: 10, fontWeight: 600,
                    color: isEntryDone ? C.textMuted : C.textPrimary,
                    textDecoration: isEntryDone ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{entry.text}</div>
                  {height > 24 && (
                    <div style={{ fontSize: 8, color: C.textMuted }}>
                      {entry.time}{entry.endTime ? `-${entry.endTime}` : ''}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Drag ghost */}
          {dragState && (
            <div style={{
              position: 'absolute',
              top: dragState.currentTop,
              left: `calc(${TIME_LABEL_WIDTH}px + ${dragState.currentColIdx} * ${colWidth} + 3px)`,
              width: `calc(${colWidth} - 6px)`,
              height: dragState.currentHeight,
              background: `${C.blue}25`,
              borderLeft: `3px solid ${C.blue}`,
              borderRadius: '0 4px 4px 0',
              padding: '2px 6px',
              zIndex: 20,
              opacity: 0.7,
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.blue }}>
                {minutesToTime(snapMinutes(START_HOUR * 60 + (dragState.currentTop / HOUR_HEIGHT) * 60))}
                {' → '}
                {dateStrs[dragState.currentColIdx]?.slice(5)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
