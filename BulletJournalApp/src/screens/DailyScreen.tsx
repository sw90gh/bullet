import React, { useState, useRef, useCallback } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { DailySummary } from '../components/DailySummary';
import { formatDateKey, getTodayStr, daysBetween } from '../utils/date';
import { STATUS } from '../utils/constants';
import { Entry, EntryPriority } from '../types';

interface DailyScreenProps {
  date: Date;
  entries: Entry[];
  allEntries: Entry[];
  cycleStatus: (id: string) => void;
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  onUpdateEntry?: (id: string, updates: Partial<Entry>) => void;
}

const HOUR_HEIGHT = 52;
const START_HOUR = 6;
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

export function DailyScreen({ date, entries, allEntries, cycleStatus, onAdd, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, onUpdateEntry }: DailyScreenProps) {
  const { styles, isDark, C } = useTheme();
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const dateStr = formatDateKey(date);
  const todayStr = getTodayStr();
  const dayEntries = entries
    .filter(e => e.date === dateStr)
    .sort((a, b) => {
      const po: Record<string, number> = { urgent: 0, important: 1, none: 2 };
      if (po[a.priority || 'none'] !== po[b.priority || 'none'])
        return po[a.priority || 'none'] - po[b.priority || 'none'];
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  const isToday = dateStr === todayStr;

  const timedEntries = dayEntries.filter(e => e.time);
  const untimedEntries = dayEntries.filter(e => !e.time);

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
  const timelineRef = useRef<HTMLDivElement>(null);
  const didDragMove = useRef(false);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | 'place';
    entryId: string;
    startY: number;
    origMinutes: number;
    origEndMinutes: number;
    currentTop: number;
    currentHeight: number;
  } | null>(null);

  const getTimelineY = useCallback((clientY: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    return clientY - rect.top;
  }, []);

  // Drag: move a timed entry
  const handleEntryTouchStart = useCallback((e: React.TouchEvent, entry: Entry, mode: 'move' | 'resize') => {
    if (!onUpdateEntry) return;
    e.stopPropagation();
    didDragMove.current = false;
    const touch = e.touches[0];
    const startMin = timeToMinutes(entry.time!);
    const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
    const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(24, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
    setDragState({
      type: mode,
      entryId: entry.id,
      startY: touch.clientY,
      origMinutes: startMin,
      origEndMinutes: endMin,
      currentTop: top,
      currentHeight: height,
    });
  }, [onUpdateEntry]);

  // Drag: place an untimed entry onto timeline
  const handleUntimedTouchStart = useCallback((e: React.TouchEvent, entry: Entry) => {
    if (!onUpdateEntry) return;
    e.stopPropagation();
    didDragMove.current = false;
    const touch = e.touches[0];
    const y = getTimelineY(touch.clientY);
    const minutes = yToMinutes(y);
    const top = ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    setDragState({
      type: 'place',
      entryId: entry.id,
      startY: touch.clientY,
      origMinutes: minutes,
      origEndMinutes: minutes + 60,
      currentTop: top,
      currentHeight: HOUR_HEIGHT - 2,
    });
  }, [onUpdateEntry, getTimelineY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState) return;
    e.preventDefault();
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragState.startY;
    if (Math.abs(deltaY) > 5) didDragMove.current = true;
    const deltaMinutes = snapMinutes((deltaY / HOUR_HEIGHT) * 60);

    if (dragState.type === 'move' || dragState.type === 'place') {
      const newStart = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 15, dragState.origMinutes + deltaMinutes));
      const duration = dragState.origEndMinutes - dragState.origMinutes;
      const newTop = ((newStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      setDragState(prev => prev ? { ...prev, currentTop: newTop } : null);
    } else if (dragState.type === 'resize') {
      const newEnd = Math.max(dragState.origMinutes + 15, Math.min((END_HOUR + 1) * 60, dragState.origEndMinutes + deltaMinutes));
      const newHeight = Math.max(24, ((newEnd - dragState.origMinutes) / 60) * HOUR_HEIGHT - 2);
      setDragState(prev => prev ? { ...prev, currentHeight: newHeight } : null);
    }
  }, [dragState]);

  const handleTouchEnd = useCallback(() => {
    if (!dragState || !onUpdateEntry) {
      setDragState(null);
      return;
    }

    // Only save if actually dragged (moved > 5px)
    if (didDragMove.current) {
      if (dragState.type === 'move' || dragState.type === 'place') {
        const newStartMin = snapMinutes(START_HOUR * 60 + (dragState.currentTop / HOUR_HEIGHT) * 60);
        const duration = dragState.origEndMinutes - dragState.origMinutes;
        const newEndMin = newStartMin + duration;
        onUpdateEntry(dragState.entryId, {
          time: minutesToTime(newStartMin),
          endTime: minutesToTime(newEndMin),
        });
      } else if (dragState.type === 'resize') {
        const newEndMin = snapMinutes(dragState.origMinutes + ((dragState.currentHeight + 2) / HOUR_HEIGHT) * 60);
        onUpdateEntry(dragState.entryId, {
          endTime: minutesToTime(Math.max(dragState.origMinutes + 15, newEndMin)),
        });
      }
    }

    setDragState(null);
  }, [dragState, onUpdateEntry]);

  return (
    <div>
      {isToday && <div style={styles.todayBadge}>TODAY</div>}

      <DailySummary date={date} entries={allEntries} />

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

      {/* 마감 임박 */}
      {urgentEntries.length > 0 && (
        <div style={{
          background: C.bgWhite, borderRadius: 12, padding: '10px 14px', marginBottom: 10,
          boxShadow: `0 1px 3px ${C.cardShadow}`, border: `1px solid ${C.accent}20`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 6 }}>
            ⏰ 마감 임박 ({urgentEntries.length})
          </div>
          {urgentEntries.map(entry => {
            const dday = getDdayLabel(entry.endDate!);
            return (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', padding: '5px 0',
                borderBottom: `1px solid ${C.borderLight}`, cursor: 'pointer',
              }} onClick={() => onEdit(entry)}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: dday.color,
                  background: dday.bg, padding: '2px 6px', borderRadius: 4,
                  marginRight: 8, flexShrink: 0, minWidth: 36, textAlign: 'center',
                }}>{dday.label}</span>
                <span style={{
                  fontSize: 12, color: C.textPrimary, flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{entry.text}</span>
                <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>~{entry.endDate?.slice(5)}</span>
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
          </div>
        )
      ) : (
        /* 타임라인 모드 */
        <div style={{
          background: C.bgWhite, borderRadius: 14, overflow: 'hidden',
          boxShadow: `0 1px 3px ${C.cardShadow}`,
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        >
          {/* 시간 미지정 항목 - 드래그 가능 */}
          {untimedEntries.length > 0 && (
            <div style={{ padding: '8px 12px', borderBottom: `2px solid ${C.borderLight}` }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>
                시간 미지정 (끌어서 시간표에 배치)
              </div>
              {untimedEntries.map(entry => {
                const st = STATUS[entry.status] || STATUS.todo;
                const isDragging = dragState?.entryId === entry.id;
                return (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 4px',
                    cursor: 'grab', borderRadius: 6,
                    background: isDragging ? `${C.blue}15` : 'transparent',
                    border: `1px dashed ${isDragging ? C.blue : 'transparent'}`,
                    marginBottom: 2, transition: 'background 0.15s',
                  }}
                  onTouchStart={e => handleUntimedTouchStart(e, entry)}
                  onClick={() => { if (!dragState && !didDragMove.current) onEdit(entry); }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: st.color, width: 16, textAlign: 'center' }}>{st.symbol}</span>
                    <span style={{
                      fontSize: 12, color: C.textPrimary, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{entry.text}</span>
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
                  position: 'relative',
                }}>
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
            {dragState && (
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

            {/* 시간 지정 항목 블록 - 겹침 계산 */}
            {(() => {
              // Sort by start time for overlap calculation
              const sorted = [...timedEntries].sort((a, b) => timeToMinutes(a.time!) - timeToMinutes(b.time!));
              // Calculate overlap groups: each entry gets a column index and total columns
              const layout: { entry: Entry; col: number; totalCols: number }[] = [];
              const active: { entry: Entry; endMin: number; col: number }[] = [];

              sorted.forEach(entry => {
                const startMin = timeToMinutes(entry.time!);
                const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
                // Remove entries that have ended
                const overlapping = active.filter(a => a.endMin > startMin);
                const usedCols = new Set(overlapping.map(a => a.col));
                let col = 0;
                while (usedCols.has(col)) col++;
                active.push({ entry, endMin, col });
                layout.push({ entry, col, totalCols: 0 });
              });

              // Calculate totalCols for each group
              layout.forEach((item, i) => {
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

              return layout.map(({ entry, col, totalCols }) => {
                const startMin = timeToMinutes(entry.time!);
                const endMin = entry.endTime ? timeToMinutes(entry.endTime) : startMin + 60;
                const isDraggingThis = dragState?.entryId === entry.id;
                const top = isDraggingThis && dragState.type === 'move'
                  ? dragState.currentTop
                  : ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                const height = isDraggingThis && dragState.type === 'resize'
                  ? dragState.currentHeight
                  : Math.max(24, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
                const st = STATUS[entry.status] || STATUS.todo;
                const isEntryDone = entry.status === 'done' || entry.status === 'cancelled';

                // Overlap layout: each column takes proportional width, later columns overlap earlier ones
                // Each overlapping entry shifts 12% to the right
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
                      background: isDraggingThis ? `${st.color}40` : st.color + '20',
                      borderLeft: `3px solid ${st.color}`,
                      borderRadius: '0 6px 6px 0',
                      padding: '3px 8px',
                      cursor: 'grab',
                      overflow: 'hidden',
                      zIndex: isDraggingThis ? 15 : 5 + col,
                      opacity: isEntryDone ? 0.6 : 1,
                      transition: isDraggingThis ? 'none' : 'top 0.2s, height 0.2s',
                      touchAction: 'none',
                    }}
                    onTouchStart={e => handleEntryTouchStart(e, entry, 'move')}
                    onClick={() => { if (!dragState && !didDragMove.current) onEdit(entry); }}
                  >
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: isEntryDone ? C.textMuted : C.textPrimary,
                      textDecoration: isEntryDone ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{entry.text}</div>
                    {height > 30 && (
                      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>
                        {entry.time}{entry.endTime ? ` - ${entry.endTime}` : ''}
                      </div>
                    )}
                    {/* 하단 리사이즈 핸들 */}
                    <div
                      style={{
                        position: 'absolute', left: 0, right: 0, bottom: 0, height: 12,
                        cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        touchAction: 'none',
                      }}
                      onTouchStart={e => {
                        e.stopPropagation();
                        handleEntryTouchStart(e, entry, 'resize');
                      }}
                    >
                      <div style={{
                        width: 24, height: 3, borderRadius: 2,
                        background: C.textMuted, opacity: 0.4,
                      }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
