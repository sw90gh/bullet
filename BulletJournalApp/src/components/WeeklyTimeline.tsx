import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { STATUS, TYPE_COLORS, STATUS_LABEL_BY_TYPE } from '../utils/constants';
import { formatDateKey, getTodayStr } from '../utils/date';
import { Entry } from '../types';
import { GoogleCalendarEvent } from '../hooks/useGoogleCalendar';

interface WeeklyTimelineProps {
  dates: Date[];
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onUpdateEntry: (id: string, updates: Partial<Entry>) => void;
  cycleStatus: (id: string) => void;
  gcalEvents?: GoogleCalendarEvent[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPopupChange?: (open: boolean) => void;
}

const HOUR_HEIGHT = 44;
const START_HOUR = 0;
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

export function WeeklyTimeline({ dates, entries, onEdit, onUpdateEntry, cycleStatus, gcalEvents = [], onSwipeLeft, onSwipeRight, onPopupChange }: WeeklyTimelineProps) {
  const { C, isDark, statusColor } = useTheme();
  const todayStr = getTodayStr();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [untimedOpen, setUntimedOpen] = useState(false);
  const [gridHeight, setGridHeight] = useState(0);

  const dateStrs = useMemo(() => dates.map(d => formatDateKey(d)), [dates]);
  const firstDateStr = dateStrs[0] || todayStr;

  // 날짜별 시간 지정 항목
  const columns = useMemo(() => {
    return dateStrs.map(ds => {
      return entries
        .filter(e => e.date === ds && e.time)
        .sort((a, b) => timeToMinutes(a.time!) - timeToMinutes(b.time!));
    });
  }, [entries, dateStrs]);

  // 미배치 항목 (밀린 항목은 오늘 포함 뷰에서만 표시)
  const todayInView = dateStrs.includes(todayStr);
  const untimedEntries = useMemo(() => {
    const untimed = entries.filter(e => {
      if (e.type === 'note') return false;
      if (!dateStrs.includes(e.date)) {
        // 3일 범위 밖 → 밀린 항목으로만 포함 (오늘이 뷰에 포함된 경우만)
        if (!todayInView) return false;
        if (!e.date || e.date >= todayStr) return false;
        if (e.status === 'done' || e.status === 'cancelled' || e.status === 'migrated' || e.status === 'migrated_up') return false;
        return true;
      }
      // 3일 범위 내 시간 미지정
      return !e.time;
    });
    return untimed.sort((a, b) => {
      const aOverdue = a.date < todayStr ? 0 : 1;
      const bOverdue = b.date < todayStr ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return a.date.localeCompare(b.date);
    });
  }, [entries, dateStrs, todayStr, todayInView]);

  // 겹침 그룹 계산: 각 칼럼별로 겹치는 항목을 그룹화, 대표 1건만 표시
  const overlapGroups = useMemo(() => {
    return columns.map(colEntries => {
      const groups: { entries: Entry[]; startMin: number; endMin: number }[] = [];
      colEntries.forEach(entry => {
        const startMin = timeToMinutes(entry.time!);
        const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
        // 기존 그룹과 겹치는지 확인
        const existing = groups.find(g => startMin < g.endMin && endMin > g.startMin);
        if (existing) {
          existing.entries.push(entry);
          existing.startMin = Math.min(existing.startMin, startMin);
          existing.endMin = Math.max(existing.endMin, endMin);
        } else {
          groups.push({ entries: [entry], startMin, endMin });
        }
      });
      return groups;
    });
  }, [columns]);

  const colWidth = `calc((100% - ${TIME_LABEL_WIDTH}px) / 3)`;

  // Place panel state
  const [placePanel, setPlacePanel] = useState<{ time: string; colIdx: number } | null>(null);
  const [overlapPopup, setOverlapPopup] = useState<{ entries: Entry[]; colIdx: number; time: string } | null>(null);
  useEffect(() => { onPopupChange?.(overlapPopup !== null || placePanel !== null); }, [overlapPopup, placePanel, onPopupChange]);

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
  const LONG_PRESS_MS = 350;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragReadyRef = useRef(false);

  // Horizontal swipe detection for 3-day navigation
  const swipeStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const swipeHandled = useRef(false);

  const handleSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    swipeHandled.current = false;
  }, []);

  const handleSwipeTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeHandled.current || !swipeStartRef.current || dragStateRef.current || didDragMove.current) return;
    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartRef.current.y);
    const dt = Date.now() - swipeStartRef.current.t;
    if (dt < 500 && Math.abs(dx) > 60 && Math.abs(dx) > dy * 1.5) {
      swipeHandled.current = true;
      if (dx < 0 && onSwipeLeft) onSwipeLeft();
      if (dx > 0 && onSwipeRight) onSwipeRight();
    }
    swipeStartRef.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  const handleTouchStart = useCallback((e: React.TouchEvent, entry: Entry) => {
    didDragMove.current = false;
    dragReadyRef.current = false;
    const touch = e.touches[0];
    pendingDragRef.current = { entry, startY: touch.clientY, startX: touch.clientX };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (!pendingDragRef.current) return;
      dragReadyRef.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  }, []);

  const getColIdxFromX = useCallback((clientX: number): number => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left - TIME_LABEL_WIDTH;
    const colW = (rect.width - TIME_LABEL_WIDTH) / 3;
    return Math.max(0, Math.min(2, Math.floor(x / colW)));
  }, []);

  // Shared drop logic
  const handleDrop = useCallback((ds: typeof dragState) => {
    if (!ds) return;
    if (!didDragMove.current) return;

    const newStartMin = snapMinutes(START_HOUR * 60 + (ds.currentTop / HOUR_HEIGHT) * 60);
    const duration = ds.origEndMinutes - ds.origMinutes;
    const newEndMin = newStartMin + duration;
    const newDate = dateStrs[ds.currentColIdx] || ds.origDateStr;

    const updates: Partial<Entry> = {
      time: minutesToTime(newStartMin),
      endTime: minutesToTime(newEndMin),
    };
    if (newDate !== ds.origDateStr) {
      const draggedEntry = entries.find(e => e.id === ds.entryId);
      if (draggedEntry) {
        updates.originalDate = draggedEntry.originalDate || draggedEntry.date;
      }
      updates.date = newDate;
    }
    onUpdateEntry(ds.entryId, updates);
  }, [dateStrs, entries, onUpdateEntry]);

  const handleTouchMoveRef = useRef<(e: TouchEvent) => void>(() => {});
  const handleTouchEndRef = useRef<() => void>(() => {});

  handleTouchMoveRef.current = (e: TouchEvent) => {
    const touch = e.touches[0];

    if (pendingDragRef.current && !dragStateRef.current) {
      if (!dragReadyRef.current) {
        // 롱프레스 전에 이동 → 스크롤이므로 pending 취소
        const dy = Math.abs(touch.clientY - pendingDragRef.current.startY);
        const dx = Math.abs(touch.clientX - pendingDragRef.current.startX);
        if (dy > 8 || dx > 8) {
          pendingDragRef.current = null;
          if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
        }
        return; // 스크롤 허용
      }

      // 롱프레스 완료 → 드래그 시작
      const pending = pendingDragRef.current;
      const entry = pending.entry;
      e.preventDefault();
      didDragMove.current = true;

      const startMin = entry.time ? timeToMinutes(entry.time) : START_HOUR * 60;
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
    dragReadyRef.current = false;
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    const ds = dragStateRef.current;
    if (!ds) { setDragState(null); return; }
    handleDrop(ds);
    setDragState(null);
  };

  // Mouse handlers (PC)
  const handleMouseDown = useCallback((e: React.MouseEvent, entry: Entry) => {
    if (e.button !== 0) return;
    didDragMove.current = false;

    const startMin = entry.time ? timeToMinutes(entry.time) : START_HOUR * 60;
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
      handleDrop(dragStateRef.current);
      setDragState(null);
    };

    setDragState(state);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [dateStrs, handleDrop]);

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

  // Measure grid scroll height
  useEffect(() => {
    const measure = () => {
      const el = gridScrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setGridHeight(Math.max(200, window.innerHeight - rect.top - 12));
    };
    const timer = setTimeout(measure, 30);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(timer); window.removeEventListener('resize', measure); };
  }, [untimedOpen]);

  // Auto-scroll to 6am or current time
  useEffect(() => {
    const timer = setTimeout(() => {
      const scroller = gridScrollRef.current;
      if (!scroller) return;
      const defaultTop = (6 * HOUR_HEIGHT) - 4;
      const targetTop = dateStrs.includes(todayStr) ? Math.max(0, nowTop - 80) : defaultTop;
      scroller.scrollTop = targetTop;
    }, 80);
    return () => clearTimeout(timer);
  }, [dateStrs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✕ 해제 핸들러
  const handleUnassign = useCallback((entry: Entry) => {
    const revert: Partial<Entry> = { time: undefined, endTime: undefined };
    if (entry.originalDate) { revert.date = entry.originalDate; revert.originalDate = undefined; }
    onUpdateEntry(entry.id, revert);
  }, [onUpdateEntry]);

  return (
    <div ref={containerRef} style={{
      background: C.bgWhite, borderRadius: 14, overflow: 'hidden',
      boxShadow: `0 1px 3px ${C.cardShadow}`,
      userSelect: 'none', WebkitUserSelect: 'none',
      touchAction: dragState ? 'none' : 'auto',
    } as React.CSSProperties}>

      {/* 종일 일정 */}
      {(() => {
        const allDayLocal = entries.filter(e => e.allDay && dateStrs.includes(e.date));
        const allDayGcal = gcalEvents.filter(ge => ge.allDay && dateStrs.some(ds => ge.date?.trim().startsWith(ds)));
        if (allDayLocal.length === 0 && allDayGcal.length === 0) return null;
        return (
          <div style={{ padding: '6px 12px', borderBottom: `2px solid ${C.borderLight}`, background: `${C.blue}06` }}>
            <div style={{ fontSize: 10, color: C.blue, marginBottom: 3, fontWeight: 600 }}>종일</div>
            {allDayLocal.map(entry => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0', cursor: 'pointer' }}
                onClick={() => onEdit(entry)}>
                <span style={{ fontSize: 9, color: statusColor(entry.status), fontWeight: 800 }}>
                  {(STATUS[entry.status] || STATUS.todo).symbol}
                </span>
                <span style={{ fontSize: 10, color: C.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.text}</span>
                <span style={{ fontSize: 8, color: C.textMuted }}>{entry.date.slice(5)}</span>
              </div>
            ))}
            {allDayGcal.map(ge => (
              <div key={`gcal-ad-${ge.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0', cursor: ge.htmlLink ? 'pointer' : 'default' }}
                onClick={() => { if (ge.htmlLink) window.open(ge.htmlLink, '_blank'); }}>
                <span style={{ fontSize: 9, color: '#4285f4', fontWeight: 700 }}>G</span>
                <span style={{ fontSize: 10, color: '#4285f4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ge.summary}</span>
                <span style={{ fontSize: 8, color: '#4285f488' }}>{ge.date.slice(5)}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* 미배치 항목 — 접기/펼치기 */}
      {untimedEntries.length > 0 && (
        <div style={{ borderBottom: `2px solid ${C.borderLight}` }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 12px', cursor: 'pointer',
          }} onClick={() => setUntimedOpen(!untimedOpen)}>
            <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>
              시간 미지정 ({untimedEntries.length}건)
            </span>
            <span style={{ fontSize: 10, color: C.textMuted, transition: 'transform 0.2s', display: 'inline-block', transform: untimedOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
          </div>
          {untimedOpen && <div style={{ padding: '0 12px 8px' }}>
          {untimedEntries.map(entry => {
            const st = STATUS[entry.status] || STATUS.todo;
            const isOverdue = entry.date < todayStr;
            const isDragging = dragState?.entryId === entry.id;
            return (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 4px',
                cursor: 'grab', borderRadius: 6,
                background: isDragging ? `${C.blue}15` : isOverdue ? `${C.accent}08` : 'transparent',
                border: `1px dashed ${isDragging ? C.blue : isOverdue ? `${C.accent}30` : 'transparent'}`,
                marginBottom: 2, touchAction: 'none',
              }}
              onTouchStart={e => handleTouchStart(e, entry)}
              onMouseDown={e => handleMouseDown(e, entry)}
              onClick={() => { if (!dragState && !didDragMove.current) onEdit(entry); }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: statusColor(entry.status), width: 14, textAlign: 'center' }}>{st.symbol}</span>
                <span style={{ fontSize: 11, color: C.textPrimary, flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.text}</span>
                {isOverdue && (
                  <span style={{ fontSize: 8, color: C.accent, background: `${C.accent}15`,
                    padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>{entry.date.slice(5)}</span>
                )}
                <span style={{ fontSize: 9, color: C.textMuted }}>⠿</span>
              </div>
            );
          })}
          </div>}
        </div>
      )}

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

        {/* Time grid — scrollable + horizontal swipe */}
        <div ref={gridScrollRef} style={{
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          height: gridHeight > 0 ? gridHeight : '60vh',
        } as React.CSSProperties}
          onTouchStart={handleSwipeTouchStart}
          onTouchEnd={handleSwipeTouchEnd}
        >
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
                    flex: 1, borderLeft: `1px solid ${C.borderLight}`,
                    position: 'relative', cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (!dragState && !didDragMove.current) {
                      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                      if (untimedEntries.length > 0) {
                        setPlacePanel({ time: timeStr, colIdx: ci });
                      }
                    }
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
                position: 'absolute', top: nowTop,
                left: `calc(${TIME_LABEL_WIDTH}px + ${todayColIdx} * ${colWidth})`,
                width: colWidth, borderTop: `2px solid ${C.accent}`, zIndex: 5,
              }}>
                <div style={{
                  position: 'absolute', left: -4, top: -4, width: 6, height: 6,
                  borderRadius: '50%', background: C.accent,
                }} />
              </div>
            );
          })()}

          {/* Entry blocks — 겹침 그룹: 대표 1건 + +N 뱃지 */}
          {overlapGroups.map((groups, ci) =>
            groups.map((group, gi) => {
              const entry = group.entries[0];
              const extraCount = group.entries.length - 1;
              const startMin = timeToMinutes(entry.time!);
              const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
              const isDraggingThis = dragState?.entryId === entry.id;
              const top = isDraggingThis ? dragState.currentTop
                : ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
              const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
              const colIdx = isDraggingThis ? dragState.currentColIdx : ci;
              const typeColor = (isDark ? TYPE_COLORS[entry.type]?.dark : TYPE_COLORS[entry.type]?.light) || C.textPrimary;
              const stColor = statusColor(entry.status);
              const st = STATUS[entry.status] || STATUS.todo;
              const statusLabel = STATUS_LABEL_BY_TYPE[entry.type]?.[entry.status] || st.label;
              const isEntryDone = entry.status === 'done' || entry.status === 'cancelled';

              return (
                <div key={`g-${ci}-${gi}`}
                  style={{
                    position: 'absolute', top,
                    left: `calc(${TIME_LABEL_WIDTH}px + ${colIdx} * ${colWidth} + 3px)`,
                    width: `calc(${colWidth} - 6px)`, height,
                    background: isDraggingThis ? `${typeColor}40` : typeColor + '15',
                    borderLeft: `3px solid ${typeColor}`,
                    borderRadius: '0 4px 4px 0',
                    padding: '2px 3px', cursor: 'grab', overflow: 'hidden',
                    zIndex: isDraggingThis ? 15 : 3,
                    opacity: isEntryDone ? 0.5 : 1,
                    transition: isDraggingThis ? 'none' : 'top 0.2s, left 0.2s',
                    touchAction: 'none',
                  }}
                  onTouchStart={e => extraCount === 0 ? handleTouchStart(e, entry) : undefined}
                  onMouseDown={e => extraCount === 0 ? handleMouseDown(e, entry) : undefined}
                  onClick={() => {
                    if (!didDragMove.current) {
                      if (extraCount > 0) {
                        setOverlapPopup({ entries: group.entries, colIdx: ci, time: entry.time! });
                      } else {
                        onEdit(entry);
                      }
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {height > 22 && (
                      <span style={{
                        fontSize: 7, fontWeight: 700, padding: '0px 3px', borderRadius: 2, flexShrink: 0,
                        background: stColor + '18', color: stColor,
                      }}>{statusLabel}</span>
                    )}
                    <div style={{
                      fontSize: 9, fontWeight: 600, flex: 1, minWidth: 0,
                      color: isEntryDone ? C.textMuted : C.textPrimary,
                      textDecoration: isEntryDone ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{entry.text}</div>
                    {extraCount > 0 && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: 'white', background: C.blue,
                        borderRadius: 6, padding: '1px 4px', flexShrink: 0, lineHeight: 1.2,
                      }}>+{extraCount}</span>
                    )}
                    {/* ↻ 상태 순환 + ✕ 시간 해제 (단일 항목만) */}
                    {extraCount === 0 && !isDraggingThis && (
                      <>
                      <button style={{
                        background: `${stColor}18`, border: 'none', fontSize: 9, color: stColor,
                        cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1,
                        minWidth: 18, minHeight: 18, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onTouchStart={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                      onTouchEnd={e => { e.stopPropagation(); cycleStatus(entry.id); }}
                      onClick={e => { e.stopPropagation(); cycleStatus(entry.id); }}
                      >↻</button>
                      <button style={{
                        background: `${C.textMuted}18`, border: 'none', fontSize: 10, color: C.textMuted,
                        cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1,
                        minWidth: 18, minHeight: 18, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onTouchStart={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                      onTouchEnd={e => { e.stopPropagation(); handleUnassign(entry); }}
                      onClick={e => { e.stopPropagation(); handleUnassign(entry); }}
                      >✕</button>
                      </>
                    )}
                  </div>
                  {height > 24 && extraCount === 0 && (
                    <div style={{ fontSize: 8, color: C.textMuted }}>
                      {entry.time}{entry.endTime ? `-${entry.endTime}` : ''}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Google Calendar events */}
          {dateStrs.map((ds, ci) =>
            gcalEvents.filter(ge => ge.date?.trim().startsWith(ds) && ge.startTime).map(ge => {
              const gStart = parseInt(ge.startTime!.split(':')[0]) * 60 + parseInt(ge.startTime!.split(':')[1]);
              const gEnd = ge.endTime ? parseInt(ge.endTime.split(':')[0]) * 60 + parseInt(ge.endTime.split(':')[1]) : gStart + 60;
              const gTop = ((gStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
              const gHeight = Math.max(16, ((gEnd - gStart) / 60) * HOUR_HEIGHT - 2);
              return (
                <div key={`gcal-${ge.id}-${ci}`} style={{
                  position: 'absolute', top: gTop,
                  left: `calc(${TIME_LABEL_WIDTH}px + ${ci} * ${colWidth} + 3px)`,
                  width: `calc(${colWidth} - 6px)`, height: gHeight,
                  background: '#4285f415', borderLeft: '3px solid #4285f4',
                  borderRadius: '0 4px 4px 0', padding: '1px 3px',
                  overflow: 'hidden', zIndex: 2, opacity: 0.85,
                  cursor: ge.htmlLink ? 'pointer' : 'default',
                }} onClick={() => { if (ge.htmlLink) window.open(ge.htmlLink, '_blank'); }}>
                  <div style={{ fontSize: 8, color: '#4285f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    G {ge.summary}
                  </div>
                </div>
              );
            })
          )}

          {/* Drag ghost */}
          {dragState && (
            <div style={{
              position: 'absolute', top: dragState.currentTop,
              left: `calc(${TIME_LABEL_WIDTH}px + ${dragState.currentColIdx} * ${colWidth} + 3px)`,
              width: `calc(${colWidth} - 6px)`, height: dragState.currentHeight,
              background: `${C.blue}25`, borderLeft: `3px solid ${C.blue}`,
              borderRadius: '0 4px 4px 0', padding: '2px 6px',
              zIndex: 20, opacity: 0.7, pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.blue }}>
                {minutesToTime(snapMinutes(START_HOUR * 60 + (dragState.currentTop / HOUR_HEIGHT) * 60))}
                {' → '}{dateStrs[dragState.currentColIdx]?.slice(5)}
              </div>
            </div>
          )}
        </div>
        </div>{/* /gridScrollRef */}
      </div>

      {/* 배치 선택 패널 */}
      {placePanel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setPlacePanel(null)}>
          <div style={{
            background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430,
            maxHeight: '50vh', overflow: 'auto', padding: '0 20px 24px',
            paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '14px 0 10px', borderBottom: `1px solid ${C.borderLight}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
                {dateStrs[placePanel.colIdx]?.slice(5)} {placePanel.time}에 배치
              </span>
              <button style={{
                background: 'none', border: 'none', fontSize: 16, color: C.textMuted,
                cursor: 'pointer', padding: 4,
              }} onClick={() => setPlacePanel(null)}>✕</button>
            </div>
            <div style={{ padding: '8px 0' }}>
              {untimedEntries.map(entry => {
                const st = STATUS[entry.status] || STATUS.todo;
                const isOverdue = entry.date < todayStr;
                return (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 4px', borderBottom: `1px solid ${C.borderLight}`,
                    cursor: 'pointer', background: isOverdue ? `${C.accent}06` : 'transparent',
                  }} onClick={() => {
                    const targetDate = dateStrs[placePanel.colIdx];
                    const endHour = parseInt(placePanel.time.split(':')[0]) + 1;
                    const updates: Partial<Entry> = {
                      time: placePanel.time,
                      endTime: `${Math.min(23, endHour).toString().padStart(2, '0')}:00`,
                    };
                    if (entry.date !== targetDate) {
                      updates.originalDate = entry.originalDate || entry.date;
                      updates.date = targetDate;
                    }
                    onUpdateEntry(entry.id, updates);
                    setPlacePanel(null);
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: statusColor(entry.status), width: 18, textAlign: 'center' }}>
                      {st.symbol}
                    </span>
                    <span style={{ fontSize: 13, color: C.textPrimary, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.text}
                    </span>
                    {isOverdue && (
                      <span style={{ fontSize: 9, color: C.accent, background: `${C.accent}15`,
                        padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>밀림 {entry.date.slice(5)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 겹침 항목 팝업 */}
      {overlapPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setOverlapPopup(null)}>
          <div style={{
            background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430,
            maxHeight: '50vh', overflow: 'auto', padding: '0 20px 24px',
            paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '14px 0 10px', borderBottom: `1px solid ${C.borderLight}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
                {dateStrs[overlapPopup.colIdx]?.slice(5)} {overlapPopup.time} 항목 ({overlapPopup.entries.length}건)
              </span>
              <button style={{
                background: 'none', border: 'none', fontSize: 16, color: C.textMuted,
                cursor: 'pointer', padding: 4,
              }} onClick={() => setOverlapPopup(null)}>✕</button>
            </div>
            <div style={{ padding: '8px 0' }}>
              {overlapPopup.entries.map(entry => {
                const st = STATUS[entry.status] || STATUS.todo;
                const stLabel = STATUS_LABEL_BY_TYPE[entry.type]?.[entry.status] || st.label;
                return (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 4px', borderBottom: `1px solid ${C.borderLight}`,
                    cursor: 'pointer',
                  }} onClick={() => { setOverlapPopup(null); onEdit(entry); }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: statusColor(entry.status), width: 18, textAlign: 'center' }}>
                      {st.symbol}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.text}
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>
                        {entry.time}{entry.endTime ? ` - ${entry.endTime}` : ''} · {stLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
