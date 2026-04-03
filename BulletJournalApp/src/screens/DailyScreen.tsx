import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { DailySummary } from '../components/DailySummary';
import { formatDateKey, getTodayStr, daysBetween } from '../utils/date';
import { STATUS, TYPE_COLORS, STATUS_LABEL_BY_TYPE } from '../utils/constants';
import { Entry, EntryPriority } from '../types';
import { GoogleCalendarEvent } from '../hooks/useGoogleCalendar';

interface DailyScreenProps {
  date: Date;
  entries: Entry[];
  allEntries: Entry[];
  cycleStatus: (id: string) => void;
  onAdd: () => void;
  onAddAtTime?: (time: string) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  onUpdateEntry?: (id: string, updates: Partial<Entry>) => void;
  gcalEvents?: GoogleCalendarEvent[];
}

const HOUR_HEIGHT = 52;
const START_HOUR = 0;
const END_HOUR = 23;
const SNAP_MINUTES = 15;
const TOTAL_MINUTES = (END_HOUR - START_HOUR + 1) * 60;

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

export function DailyScreen({ date, entries, allEntries, cycleStatus, onAdd, onAddAtTime, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, onUpdateEntry, gcalEvents = [] }: DailyScreenProps) {
  const { styles, isDark, C, statusColor } = useTheme();
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [placePanel, setPlacePanel] = useState<string | null>(null); // 시간 문자열 or null
  const dateStr = formatDateKey(date);
  const todayStr = getTodayStr();
  const dayEntries = entries
    .filter(e => e.date === dateStr)
    .sort((a, b) => {
      // 우선순위 정렬 (긴급→중요→없음), 같으면 생성순
      const po: Record<string, number> = { 'urgent-important': 0, urgent: 1, important: 2, none: 3 };
      if (po[a.priority || 'none'] !== po[b.priority || 'none'])
        return po[a.priority || 'none'] - po[b.priority || 'none'];
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  const isToday = dateStr === todayStr;

  // 밀린 항목: 오늘보다 이전 날짜인데 미완료인 항목
  const overdueEntries = isToday ? allEntries.filter(e => {
    if (!e.date || e.date >= todayStr) return false;
    if (e.status === 'done' || e.status === 'cancelled' || e.status === 'migrated' || e.status === 'migrated_up') return false;
    return true;
  }).sort((a, b) => {
    const mc = (b.migrateCount || 0) - (a.migrateCount || 0);
    if (mc !== 0) return mc;
    return a.date.localeCompare(b.date);
  }) : [];

  const timedEntries = dayEntries.filter(e => e.time);
  const untimedToday = dayEntries.filter(e => !e.time);
  // 밀린 항목도 미배치 대상에 포함 (시간 유무 관계없이 — 과거 시간표 항목도 포함)
  const untimedEntries = isToday
    ? [...untimedToday, ...overdueEntries]
    : untimedToday;

  // Memoized overlap layout calculation
  const timedLayout = useMemo(() => {
    const sorted = [...timedEntries].sort((a, b) => timeToMinutes(a.time!) - timeToMinutes(b.time!));
    const layout: { entry: Entry; col: number; totalCols: number }[] = [];
    const active: { entry: Entry; endMin: number; col: number }[] = [];

    sorted.forEach(entry => {
      const startMin = timeToMinutes(entry.time!);
      const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
      const overlapping = active.filter(a => a.endMin > startMin);
      const usedCols = new Set(overlapping.map(a => a.col));
      let col = 0;
      while (usedCols.has(col)) col++;
      active.push({ entry, endMin, col });
      layout.push({ entry, col, totalCols: 0 });
    });

    layout.forEach(item => {
      const startMin = timeToMinutes(item.entry.time!);
      const endMin = item.entry.endTime ? timeToMinutes(item.entry.endTime) : startMin + 60;
      let maxCol = item.col;
      layout.forEach(other => {
        const otherStart = timeToMinutes(other.entry.time!);
        const otherEnd = other.entry.endTime ? timeToMinutes(other.entry.endTime) : otherStart + 60;
        if (otherStart < endMin && otherEnd > startMin) {
          maxCol = Math.max(maxCol, other.col);
        }
      });
      item.totalCols = maxCol + 1;
    });

    return layout;
  }, [timedEntries]);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  const urgentEntries = isToday ? allEntries.filter(e => {
    if (!e.endDate) return false;
    if (e.status === 'done' || e.status === 'cancelled' || e.status === 'migrated' || e.status === 'migrated_up') return false;
    return daysBetween(todayStr, e.endDate) <= 3;
  }).sort((a, b) => daysBetween(todayStr, a.endDate!) - daysBetween(todayStr, b.endDate!)) : [];

  const getDdayLabel = (endDate: string) => {
    const d = daysBetween(todayStr, endDate);
    if (d < 0) return { label: `D+${Math.abs(d)}`, color: '#c0583f', bg: '#c0583f15' };
    if (d === 0) return { label: 'D-Day', color: '#c0883f', bg: '#c0883f15' };
    return { label: `D-${d}`, color: d === 1 ? '#c0883f' : '#3a7ca5', bg: d === 1 ? '#c0883f10' : '#3a7ca510' };
  };

  // === Drag state ===
  const timelineWrapperRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const didDragMove = useRef(false);
  const autoScrollRAF = useRef<number>(0);
  const autoScrollSpeed = useRef(0);
  const lastTouchY = useRef(0);
  const dragStateRef = useRef<typeof dragState>(null);
  const pendingDragRef = useRef<{
    type: 'move' | 'resize' | 'place';
    entry: Entry;
    startY: number;
    mode: 'move' | 'resize' | 'place';
  } | null>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | 'place';
    entryId: string;
    startY: number;
    origMinutes: number;
    origEndMinutes: number;
    currentTop: number;
    currentHeight: number;
  } | null>(null);

  // Keep ref in sync with state so rAF loop can read latest values
  dragStateRef.current = dragState;

  // Find the scrollable parent (<main>) once
  const getScrollParent = useCallback((): HTMLElement | null => {
    let el = timelineRef.current?.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  // Calculate ghost position from finger's clientY (works for all drag types)
  const updateGhostFromClientY = useCallback((clientY: number) => {
    const ds = dragStateRef.current;
    if (!ds) return;

    if (ds.type === 'place') {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const y = clientY - rect.top;
      const minutes = yToMinutes(y);
      const newTop = ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      setDragState(prev => prev ? { ...prev, currentTop: newTop, origMinutes: minutes, origEndMinutes: minutes + 60 } : null);
    } else if (ds.type === 'move') {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const y = clientY - rect.top;
      const minutes = yToMinutes(y);
      const newTop = ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      setDragState(prev => prev ? { ...prev, currentTop: newTop } : null);
    } else if (ds.type === 'resize') {
      const deltaY = clientY - ds.startY;
      const deltaMinutes = snapMinutes((deltaY / HOUR_HEIGHT) * 60);
      const newEnd = Math.max(ds.origMinutes + 15, Math.min((END_HOUR + 1) * 60, ds.origEndMinutes + deltaMinutes));
      const newHeight = Math.max(24, ((newEnd - ds.origMinutes) / 60) * HOUR_HEIGHT - 2);
      setDragState(prev => prev ? { ...prev, currentHeight: newHeight } : null);
    }
  }, []);

  // Auto-scroll loop: scrolls AND updates ghost position each frame
  const startAutoScroll = useCallback(() => {
    const tick = () => {
      const scroller = getScrollParent();
      if (!scroller || autoScrollSpeed.current === 0) {
        autoScrollRAF.current = 0;
        return;
      }
      scroller.scrollTop += autoScrollSpeed.current;
      // Update ghost position since scroll moved the timeline under the finger
      updateGhostFromClientY(lastTouchY.current);
      autoScrollRAF.current = requestAnimationFrame(tick);
    };
    if (!autoScrollRAF.current) {
      autoScrollRAF.current = requestAnimationFrame(tick);
    }
  }, [getScrollParent, updateGhostFromClientY]);

  const stopAutoScroll = useCallback(() => {
    autoScrollSpeed.current = 0;
    if (autoScrollRAF.current) {
      cancelAnimationFrame(autoScrollRAF.current);
      autoScrollRAF.current = 0;
    }
  }, []);

  const getTimelineY = useCallback((clientY: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    return clientY - rect.top;
  }, []);

  const LONG_PRESS_MS = 350; // 롱프레스 후 드래그 시작
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragReadyRef = useRef(false); // 롱프레스 완료 → 드래그 가능

  // 터치: 롱프레스 후 드래그 가능 (짧은 터치+이동은 스크롤)
  const handleEntryTouchStart = useCallback((e: React.TouchEvent, entry: Entry, mode: 'move' | 'resize') => {
    if (!onUpdateEntry) return;
    didDragMove.current = false;
    dragReadyRef.current = false;
    const touch = e.touches[0];
    pendingDragRef.current = { type: mode, entry, startY: touch.clientY, mode };

    // 롱프레스 타이머
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (!pendingDragRef.current) return;
      dragReadyRef.current = true;
      // 진동 피드백 (지원 시)
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  }, [onUpdateEntry]);

  // Mouse: move a timed entry (PC)
  const handleEntryMouseDown = useCallback((e: React.MouseEvent, entry: Entry, mode: 'move' | 'resize') => {
    if (!onUpdateEntry) return;
    e.stopPropagation();
    didDragMove.current = false;
    const startMin = timeToMinutes(entry.time!);
    const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
    const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(24, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
    setDragState({
      type: mode,
      entryId: entry.id,
      startY: e.clientY,
      origMinutes: startMin,
      origEndMinutes: endMin,
      currentTop: top,
      currentHeight: height,
    });
  }, [onUpdateEntry]);

  // Mouse: place an untimed entry (PC)
  const handleUntimedMouseDown = useCallback((e: React.MouseEvent, entry: Entry) => {
    if (!onUpdateEntry) return;
    e.stopPropagation();
    didDragMove.current = false;
    setDragState({
      type: 'place',
      entryId: entry.id,
      startY: e.clientY,
      origMinutes: START_HOUR * 60,
      origEndMinutes: START_HOUR * 60 + 60,
      currentTop: -999,
      currentHeight: HOUR_HEIGHT - 2,
    });
  }, [onUpdateEntry]);

  // Drag: place an untimed entry onto timeline
  const handleUntimedTouchStart = useCallback((e: React.TouchEvent, entry: Entry) => {
    if (!onUpdateEntry) return;
    didDragMove.current = false;
    dragReadyRef.current = false;
    const touch = e.touches[0];
    pendingDragRef.current = { type: 'place', entry, startY: touch.clientY, mode: 'place' };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (!pendingDragRef.current) return;
      dragReadyRef.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  }, [onUpdateEntry]);

  // Use refs for handlers so the native listener always sees latest state
  const handleTouchMoveRef = useRef<(e: TouchEvent) => void>(() => {});
  const handleTouchEndRef = useRef<() => void>(() => {});

  handleTouchMoveRef.current = (e: TouchEvent) => {
    const touch = e.touches[0];

    // pending 상태: 롱프레스 완료 전에 이동하면 스크롤로 취급 → pending 취소
    if (pendingDragRef.current && !dragStateRef.current) {
      if (!dragReadyRef.current) {
        // 롱프레스 전에 이동 → 스크롤이므로 pending 취소
        const deltaY = Math.abs(touch.clientY - pendingDragRef.current.startY);
        if (deltaY > 8) {
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

      if (pending.mode === 'place') {
        setDragState({
          type: 'place',
          entryId: entry.id,
          startY: pending.startY,
          origMinutes: START_HOUR * 60,
          origEndMinutes: START_HOUR * 60 + 60,
          currentTop: -999,
          currentHeight: HOUR_HEIGHT - 2,
        });
      } else {
        const startMin = timeToMinutes(entry.time!);
        const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
        const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
        const height = Math.max(24, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
        setDragState({
          type: pending.mode,
          entryId: entry.id,
          startY: pending.startY,
          origMinutes: startMin,
          origEndMinutes: endMin,
          currentTop: top,
          currentHeight: height,
        });
      }
      pendingDragRef.current = null;
      lastTouchY.current = touch.clientY;
      return;
    }

    if (!dragStateRef.current) return;
    e.preventDefault();
    lastTouchY.current = touch.clientY;
    const deltaY = touch.clientY - dragStateRef.current.startY;
    if (Math.abs(deltaY) > 5) didDragMove.current = true;

    // Auto-scroll when finger is near top/bottom edge of viewport
    const scroller = getScrollParent();
    if (scroller) {
      const edgeZone = 60;
      const maxSpeed = 8;
      const screenBottom = window.innerHeight;
      const screenTop = 0;
      if (touch.clientY > screenBottom - edgeZone) {
        const ratio = Math.min(1, (touch.clientY - (screenBottom - edgeZone)) / edgeZone);
        autoScrollSpeed.current = ratio * maxSpeed;
        startAutoScroll();
      } else if (touch.clientY < screenTop + edgeZone) {
        const ratio = Math.min(1, ((screenTop + edgeZone) - touch.clientY) / edgeZone);
        autoScrollSpeed.current = -ratio * maxSpeed;
        startAutoScroll();
      } else {
        stopAutoScroll();
      }
    }

    updateGhostFromClientY(touch.clientY);
  };

  handleTouchEndRef.current = () => {
    stopAutoScroll();
    pendingDragRef.current = null;
    dragReadyRef.current = false;
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    const ds = dragStateRef.current;
    if (!ds || !onUpdateEntry) {
      setDragState(null);
      didDragMove.current = false;
      return;
    }

    if (didDragMove.current && ds.currentTop >= 0) {
      if (ds.type === 'move' || ds.type === 'place') {
        const newStartMin = snapMinutes(START_HOUR * 60 + (ds.currentTop / HOUR_HEIGHT) * 60);
        const duration = ds.origEndMinutes - ds.origMinutes;
        const newEndMin = newStartMin + duration;
        const updates: Partial<Entry> = {
          time: minutesToTime(newStartMin),
          endTime: minutesToTime(newEndMin),
        };
        // 밀린 항목이면 date를 오늘로 변경 + originalDate 보관
        const draggedEntry = entries.find(e => e.id === ds.entryId) || allEntries.find(e => e.id === ds.entryId);
        if (draggedEntry && draggedEntry.date < dateStr) {
          updates.originalDate = draggedEntry.originalDate || draggedEntry.date;
          updates.date = dateStr;
        }
        onUpdateEntry(ds.entryId, updates);
      } else if (ds.type === 'resize') {
        const newEndMin = snapMinutes(ds.origMinutes + ((ds.currentHeight + 2) / HOUR_HEIGHT) * 60);
        onUpdateEntry(ds.entryId, {
          endTime: minutesToTime(Math.max(ds.origMinutes + 15, newEndMin)),
        });
      }
    }

    didDragMove.current = false;
    setDragState(null);
  };

  // Register non-passive touch listeners on the timeline wrapper
  useEffect(() => {
    const el = timelineWrapperRef.current;
    if (!el) return;
    const onTouchMoveNative = (e: TouchEvent) => handleTouchMoveRef.current(e);
    const onTouchEndNative = () => handleTouchEndRef.current();
    el.addEventListener('touchmove', onTouchMoveNative, { passive: false });
    el.addEventListener('touchend', onTouchEndNative);
    return () => {
      el.removeEventListener('touchmove', onTouchMoveNative);
      el.removeEventListener('touchend', onTouchEndNative);
    };
  }, [viewMode]);

  // Register mouse listeners when drag starts, remove when drag ends
  useEffect(() => {
    if (!dragState) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current) return;
      e.preventDefault();
      lastTouchY.current = e.clientY;
      const deltaY = e.clientY - dragStateRef.current.startY;
      if (Math.abs(deltaY) > 5) didDragMove.current = true;
      updateGhostFromClientY(e.clientY);
    };
    const onMouseUp = () => {
      handleTouchEndRef.current();
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, updateGhostFromClientY]);

  // Auto-scroll to current time (today) or 6am (other days) when switching to timeline view
  useEffect(() => {
    if (viewMode !== 'timeline') return;
    const timer = setTimeout(() => {
      const scroller = timelineWrapperRef.current?.closest('[style*="overflow"]') as HTMLElement
        || timelineWrapperRef.current?.parentElement?.parentElement;
      if (scroller) {
        const defaultTop = (6 * HOUR_HEIGHT) - 4; // 6시 위치
        const targetTop = isToday ? Math.max(0, nowTop - 100) : defaultTop;
        scroller.scrollTop = targetTop;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <DailySummary entries={allEntries} label={isToday ? '오늘' : `${date.getMonth() + 1}/${date.getDate()}`} filterFn={(e) => e.date === dateStr && e.type !== 'goal-yearly' && e.type !== 'goal-monthly'} />

      {/* 뷰 모드 토글 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button style={{
          flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer',
          border: `1px solid ${C.border}`, fontFamily: '-apple-system, sans-serif',
          background: viewMode === 'list' ? C.primary : C.bgWhite,
          color: viewMode === 'list' ? C.headerText : C.textSecondary,
        }} onClick={() => setViewMode('list')}>목록</button>
        <button style={{
          flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer',
          border: `1px solid ${C.border}`, fontFamily: '-apple-system, sans-serif',
          background: viewMode === 'timeline' ? C.primary : C.bgWhite,
          color: viewMode === 'timeline' ? C.headerText : C.textSecondary,
        }} onClick={() => setViewMode('timeline')}>시간표</button>
      </div>

      {/* 밀린 항목 (목록 모드에서만 표시) */}
      {viewMode === 'list' && overdueEntries.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: C.accent,
            padding: '6px 2px 4px', borderBottom: `1px solid ${C.accent}40`,
            marginBottom: 4,
          }}>
            밀린 항목 ({overdueEntries.length}건)
          </div>
          {overdueEntries.map(entry => (
            <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
              onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
              onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
              onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
              onChangePriority={onChangePriority} />
          ))}
        </div>
      )}

      {/* 마감 임박 (목록 모드에서만 표시) */}
      {viewMode === 'list' && urgentEntries.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: C.amber,
            padding: '6px 2px 4px', borderBottom: `1px solid ${C.amber}40`,
            marginBottom: 4,
          }}>
            마감 임박 ({urgentEntries.length}건)
          </div>
          {urgentEntries.map(entry => {
            const dday = getDdayLabel(entry.endDate!);
            return (
              <div key={entry.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 2px 2px',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: dday.color,
                    background: dday.bg, padding: '2px 6px', borderRadius: 4,
                    flexShrink: 0, minWidth: 36, textAlign: 'center',
                  }}>{dday.label}</span>
                  <span style={{ fontSize: 10, color: C.textMuted }}>~{entry.endDate?.slice(5)}</span>
                </div>
                <EntryRow entry={entry} cycleStatus={cycleStatus}
                  onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
                  onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
                  onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
                  onChangePriority={onChangePriority} />
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' ? (
        dayEntries.length === 0 ? (
          <div style={styles.emptyState as React.CSSProperties}>
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>·</div>
            <p style={{ color: C.textMuted, fontSize: 14 }}>기록이 없습니다</p>
            <button style={styles.emptyAdd} onClick={onAdd}>+ 새 항목 추가</button>
          </div>
        ) : (
          <div>
            {dayEntries.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                cycleStatus={cycleStatus}
                onEdit={() => onEdit(entry)}
                onDelete={() => onDelete(entry.id)}
                onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
                onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
                onChangePriority={onChangePriority}
              />
            ))}
            {/* 구글 캘린더 일정 (목록 모드) */}
            {gcalEvents.filter(e => e.date?.trim().startsWith(dateStr)).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#4285f4',
                  padding: '6px 2px 4px', borderBottom: '1px solid #4285f430',
                  marginBottom: 4,
                }}>
                  Google Calendar ({gcalEvents.filter(e => e.date?.trim().startsWith(dateStr)).length}건)
                </div>
                {gcalEvents.filter(e => e.date?.trim().startsWith(dateStr)).map(ge => (
                  <div key={`gcal-${ge.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 4px', borderBottom: `1px solid ${C.borderLight}`,
                    cursor: ge.htmlLink ? 'pointer' : 'default',
                  }} onClick={() => { if (ge.htmlLink) window.open(ge.htmlLink, '_blank'); }}>
                    <span style={{ fontSize: 10, color: '#4285f4', fontWeight: 700, width: 16, textAlign: 'center' }}>G</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ge.summary}
                      </div>
                      <div style={{ fontSize: 10, color: '#4285f488' }}>
                        {ge.allDay ? '종일' : `${ge.startTime}${ge.endTime ? ` - ${ge.endTime}` : ''}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        /* 타임라인 모드 */
        <div ref={timelineWrapperRef} style={{
          background: C.bgWhite, borderRadius: 14, overflow: 'hidden',
          boxShadow: `0 1px 3px ${C.cardShadow}`,
          touchAction: dragState ? 'none' : 'auto',
          userSelect: 'none', WebkitUserSelect: 'none',
        } as React.CSSProperties}>
          {/* 종일 일정 */}
          {(() => {
            const localAllDay = dayEntries.filter(e => e.allDay);
            const gcalAllDay = gcalEvents.filter(e => e.date?.trim().startsWith(dateStr) && e.allDay);
            if (localAllDay.length === 0 && gcalAllDay.length === 0) return null;
            return (
              <div style={{ padding: '6px 12px', borderBottom: `2px solid ${C.borderLight}`, background: `${C.blue}06` }}>
                <div style={{ fontSize: 10, color: C.blue, marginBottom: 3, fontWeight: 600 }}>종일</div>
                {localAllDay.map(entry => {
                  const st = STATUS[entry.status] || STATUS.todo;
                  return (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}
                      onClick={() => onEdit(entry)}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: statusColor(entry.status), width: 16, textAlign: 'center' }}>{st.symbol}</span>
                      <span style={{ fontSize: 12, color: C.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.text}</span>
                    </div>
                  );
                })}
                {gcalAllDay.map(ge => (
                  <div key={`gcal-ad-${ge.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: ge.htmlLink ? 'pointer' : 'default' }}
                    onClick={() => { if (ge.htmlLink) window.open(ge.htmlLink, '_blank'); }}>
                    <span style={{ fontSize: 10, color: '#4285f4', fontWeight: 700, width: 16, textAlign: 'center' }}>G</span>
                    <span style={{ fontSize: 12, color: '#4285f4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ge.summary}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* 시간 미지정 항목 - 드래그 가능 */}
          {untimedEntries.length > 0 && (
            <div style={{ padding: '8px 12px', borderBottom: `2px solid ${C.borderLight}` }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>
                시간 미지정 (끌어서 시간표에 배치)
              </div>
              {untimedEntries.map(entry => {
                const st = STATUS[entry.status] || STATUS.todo;
                const isDragging = dragState?.entryId === entry.id;
                const isOverdue = entry.date < dateStr;
                return (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 4px',
                    cursor: 'grab', borderRadius: 6,
                    background: isDragging ? `${C.blue}15` : isOverdue ? `${C.accent}08` : 'transparent',
                    border: `1px dashed ${isDragging ? C.blue : isOverdue ? `${C.accent}30` : 'transparent'}`,
                    marginBottom: 2, transition: 'background 0.15s',
                    touchAction: isDragging ? 'none' : 'auto',
                  }}
                  onTouchStart={e => handleUntimedTouchStart(e, entry)}
                  onMouseDown={e => handleUntimedMouseDown(e, entry)}
                  onClick={() => { if (!dragState && !didDragMove.current) onEdit(entry); }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: statusColor(entry.status), width: 16, textAlign: 'center' }}>{st.symbol}</span>
                    <span style={{
                      fontSize: 12, color: C.textPrimary, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{entry.text}</span>
                    {isOverdue && (
                      <span style={{
                        fontSize: 8, color: C.accent, background: `${C.accent}15`,
                        padding: '1px 4px', borderRadius: 3, flexShrink: 0,
                      }}>{entry.date.slice(5)}</span>
                    )}
                    <span style={{ fontSize: 10, color: C.textMuted }}>⠿</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 타임라인 그리드 */}
          <div ref={timelineRef} style={{ position: 'relative', marginLeft: 44, marginRight: 8 }}>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
              const hour = START_HOUR + i;
              return (
                <div key={hour} style={{
                  height: HOUR_HEIGHT, borderBottom: `1px solid ${C.borderLight}`,
                  position: 'relative', cursor: 'pointer',
                }}
                  onClick={() => {
                    if (!dragState && !didDragMove.current) {
                      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                      if (untimedEntries.length > 0) {
                        setPlacePanel(timeStr);
                      } else if (onAddAtTime) {
                        onAddAtTime(timeStr);
                      }
                    }
                  }}
                >
                  <span style={{
                    position: 'absolute', left: -44, top: -7, fontSize: 10, color: C.textMuted,
                    width: 36, textAlign: 'right',
                  }}>
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                  <div style={{
                    position: 'absolute', top: HOUR_HEIGHT / 2, left: 0, right: 0,
                    borderBottom: `1px dashed ${C.borderLight}`,
                  }} />
                </div>
              );
            })}

            {/* 현재 시간 인디케이터 */}
            {isToday && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60 && (
              <div style={{
                position: 'absolute', left: -8, right: 0, top: nowTop,
                borderTop: `2px solid ${C.accent}`, zIndex: 10,
              }}>
                <div style={{
                  position: 'absolute', left: -6, top: -5, width: 8, height: 8,
                  borderRadius: '50%', background: C.accent,
                }} />
              </div>
            )}

            {/* 드래그 중 고스트 표시 */}
            {dragState && dragState.currentTop >= 0 && (
              <div style={{
                position: 'absolute', left: 4, right: 4,
                top: dragState.currentTop,
                height: dragState.currentHeight,
                background: `${C.blue}30`,
                borderLeft: `3px solid ${C.blue}`,
                borderRadius: '0 6px 6px 0',
                padding: '3px 8px',
                zIndex: 20,
                opacity: 0.8,
                pointerEvents: 'none',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.blue }}>
                  {minutesToTime(snapMinutes(START_HOUR * 60 + (dragState.currentTop / HOUR_HEIGHT) * 60))}
                  {' - '}
                  {minutesToTime(snapMinutes(START_HOUR * 60 + ((dragState.currentTop + dragState.currentHeight + 2) / HOUR_HEIGHT) * 60))}
                </div>
              </div>
            )}

            {/* 시간 지정 항목 블록 - 겹침 계산 (memoized) */}
            {timedLayout.map(({ entry, col, totalCols }) => {
                const startMin = timeToMinutes(entry.time!);
                const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
                const isDraggingThis = dragState?.entryId === entry.id;
                const top = isDraggingThis && dragState.type === 'move'
                  ? dragState.currentTop
                  : ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                const height = isDraggingThis && dragState.type === 'resize'
                  ? dragState.currentHeight
                  : Math.max(24, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
                const typeColor = (isDark ? TYPE_COLORS[entry.type]?.dark : TYPE_COLORS[entry.type]?.light) || C.textPrimary;
                const stColor = statusColor(entry.status);
                const st = STATUS[entry.status] || STATUS.todo;
                const statusLabel = STATUS_LABEL_BY_TYPE[entry.type]?.[entry.status] || st.label;
                const isEntryDone = entry.status === 'done' || entry.status === 'cancelled';

                const leftPct = col * 12;
                const widthPct = 100 - leftPct;

                return (
                  <div key={entry.id}
                    style={{
                      position: 'absolute',
                      left: totalCols > 1 ? `calc(4px + ${leftPct}%)` : 4,
                      right: 4,
                      width: totalCols > 1 ? `calc(${widthPct}% - 8px)` : undefined,
                      top, height,
                      background: isDraggingThis ? `${typeColor}40` : typeColor + '15',
                      borderLeft: `3px solid ${typeColor}`,
                      borderRadius: '0 6px 6px 0',
                      padding: '3px 6px',
                      cursor: 'grab',
                      overflow: 'hidden',
                      zIndex: isDraggingThis ? 15 : 5 + col,
                      opacity: isEntryDone ? 0.6 : 1,
                      transition: isDraggingThis ? 'none' : 'top 0.2s, height 0.2s',
                      touchAction: isDraggingThis ? 'none' : 'auto',
                    }}
                    onTouchStart={e => handleEntryTouchStart(e, entry, 'move')}
                    onMouseDown={e => handleEntryMouseDown(e, entry, 'move')}
                    onClick={() => { if (!dragState && !didDragMove.current) onEdit(entry); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3, flexShrink: 0,
                        background: stColor + '18', color: stColor,
                      }}>{statusLabel}</span>
                      <div style={{
                        fontSize: 11, fontWeight: 600, flex: 1, minWidth: 0,
                        color: isEntryDone ? C.textMuted : C.textPrimary,
                        textDecoration: isEntryDone ? 'line-through' : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{entry.text}</div>
                      {!isDraggingThis && (
                        <>
                        {/* 상태 순환 버튼 */}
                        <button style={{
                          background: `${stColor}18`, border: 'none', fontSize: 11, color: stColor,
                          cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1,
                          minWidth: 24, minHeight: 24, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => { e.stopPropagation(); cycleStatus(entry.id); }}
                        onClick={(e) => { e.stopPropagation(); cycleStatus(entry.id); }}
                        >↻</button>
                        {/* 시간 해제 버튼 */}
                        {onUpdateEntry && (
                        <button style={{
                          background: `${C.textMuted}18`, border: 'none', fontSize: 12, color: C.textMuted,
                          cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1,
                          minWidth: 24, minHeight: 24, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                          const revert: Partial<Entry> = { time: undefined, endTime: undefined };
                          if (entry.originalDate) { revert.date = entry.originalDate; revert.originalDate = undefined; }
                          onUpdateEntry(entry.id, revert);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const revert: Partial<Entry> = { time: undefined, endTime: undefined };
                          if (entry.originalDate) { revert.date = entry.originalDate; revert.originalDate = undefined; }
                          onUpdateEntry(entry.id, revert);
                        }}
                        >✕</button>
                        )}
                        </>
                      )}
                    </div>
                    {height > 36 && entry.subtasks && entry.subtasks.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: C.textMuted }}>
                          ☑ {entry.subtasks.filter(s => s.done).length}/{entry.subtasks.length}
                        </span>
                        <div style={{ flex: 1, maxWidth: 40, height: 3, borderRadius: 2, background: C.borderLight, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 2, background: C.green,
                            width: `${(entry.subtasks.filter(s => s.done).length / entry.subtasks.length) * 100}%`,
                          }} />
                        </div>
                      </div>
                    )}
                    {/* 하단 리사이즈 핸들 */}
                    <div
                      style={{
                        position: 'absolute', left: 0, right: 0, bottom: 0, height: 12,
                        cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        touchAction: dragState ? 'none' : 'auto',
                      }}
                      onTouchStart={e => {
                        e.stopPropagation();
                        handleEntryTouchStart(e, entry, 'resize');
                      }}
                      onMouseDown={e => {
                        e.stopPropagation();
                        handleEntryMouseDown(e, entry, 'resize');
                      }}
                    >
                      <div style={{
                        width: 24, height: 3, borderRadius: 2,
                        background: C.textMuted, opacity: 0.4,
                      }} />
                    </div>
                  </div>
                );
              })}

            {/* 구글 캘린더 일정 (읽기 전용) */}
            {gcalEvents.filter(e => e.date?.trim().startsWith(dateStr) && e.startTime).map(ge => {
              const gStartMin = ge.startTime ? parseInt(ge.startTime.split(':')[0]) * 60 + parseInt(ge.startTime.split(':')[1]) : 0;
              const gEndMin = ge.endTime ? parseInt(ge.endTime.split(':')[0]) * 60 + parseInt(ge.endTime.split(':')[1]) : gStartMin + 60;
              const gTop = ((gStartMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
              const gHeight = Math.max(20, ((gEndMin - gStartMin) / 60) * HOUR_HEIGHT - 2);
              return (
                <div key={`gcal-${ge.id}`} style={{
                  position: 'absolute', left: 4, right: 4, top: gTop, height: gHeight,
                  background: '#4285f415', borderLeft: '3px solid #4285f4',
                  borderRadius: '0 6px 6px 0', padding: '3px 8px',
                  overflow: 'hidden', zIndex: 2, opacity: 0.85,
                  cursor: ge.htmlLink ? 'pointer' : 'default',
                }}
                onClick={() => { if (ge.htmlLink) window.open(ge.htmlLink, '_blank'); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 8, color: '#4285f4' }}>G</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: '#4285f4',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>{ge.summary}</span>
                  </div>
                  {gHeight > 28 && (
                    <div style={{ fontSize: 9, color: '#4285f488' }}>
                      {ge.startTime}{ge.endTime ? ` - ${ge.endTime}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 시간 배치 선택 패널 */}
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
                    {placePanel}에 배치
                  </span>
                  <button style={{
                    background: 'none', border: 'none', fontSize: 16, color: C.textMuted,
                    cursor: 'pointer', padding: 4,
                  }} onClick={() => setPlacePanel(null)}>✕</button>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {untimedEntries.map(entry => {
                    const st = STATUS[entry.status] || STATUS.todo;
                    const isOverdue = entry.date < dateStr;
                    return (
                      <div key={entry.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 4px', borderBottom: `1px solid ${C.borderLight}`,
                        cursor: 'pointer',
                        background: isOverdue ? `${C.accent}06` : 'transparent',
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (onUpdateEntry) {
                          const endHour = parseInt(placePanel.split(':')[0]) + 1;
                          const updates: Partial<Entry> = {
                            time: placePanel,
                            endTime: `${Math.min(23, endHour).toString().padStart(2, '0')}:00`,
                          };
                          if (entry.date !== dateStr) {
                            updates.originalDate = entry.originalDate || entry.date;
                            updates.date = dateStr;
                          }
                          onUpdateEntry(entry.id, updates);
                        }
                        setPlacePanel(null);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onUpdateEntry) {
                          const endHour = parseInt(placePanel.split(':')[0]) + 1;
                          const updates: Partial<Entry> = {
                            time: placePanel,
                            endTime: `${Math.min(23, endHour).toString().padStart(2, '0')}:00`,
                          };
                          if (entry.date !== dateStr) {
                            updates.originalDate = entry.originalDate || entry.date;
                            updates.date = dateStr;
                          }
                          onUpdateEntry(entry.id, updates);
                        }
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
                          <span style={{
                            fontSize: 9, color: C.accent, background: `${C.accent}15`,
                            padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                          }}>밀림 {entry.date.slice(5)}</span>
                        )}
                      </div>
                    );
                  })}
                  <button style={{
                    width: '100%', marginTop: 8, padding: 12, borderRadius: 10,
                    border: `1.5px dashed ${C.border}`, background: 'transparent',
                    color: C.textSecondary, fontSize: 13, cursor: 'pointer',
                    fontFamily: '-apple-system, sans-serif',
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const time = placePanel;
                    setPlacePanel(null);
                    if (onAddAtTime) onAddAtTime(time);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const time = placePanel;
                    setPlacePanel(null);
                    if (onAddAtTime) onAddAtTime(time);
                  }}>+ 새 항목 추가</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
