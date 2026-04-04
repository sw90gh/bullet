import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { STATUS, TYPES, PRIORITY, STATUS_LABEL_BY_TYPE } from '../utils/constants';
import { Entry, EntryPriority } from '../types';

interface EntryRowProps {
  entry: Entry;
  cycleStatus: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMigrate?: () => void;
  onMigrateUp?: () => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  compact?: boolean;
  goalProgress?: { done: number; total: number; target: number }; // 목표 진척도
}

type SwipeDir = 'none' | 'left' | 'right';

export function EntryRow({ entry, cycleStatus, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, compact, goalProgress }: EntryRowProps) {
  const { styles, C, isDark, statusColor } = useTheme();
  const [swipeDir, _setSwipeDir] = useState<SwipeDir>('none');
  const swipeDirRef = useRef<SwipeDir>('none');
  const setSwipeDir = (dir: SwipeDir) => { swipeDirRef.current = dir; _setSwipeDir(dir); };
  const st = STATUS[entry.status] || STATUS.todo;
  const pr = PRIORITY[entry.priority] || PRIORITY.none;
  const isStrike = ('strike' in st && st.strike) || entry.status === 'done';

  const entryRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const isDragging = useRef(false);
  const justClosedSwipe = useRef(false);
  const lastCycledAt = useRef<number>(0); // 마지막 상태 순환 시각 (ms)
  const touchHandled = useRef(false); // 터치 후 합성 마우스 이벤트 무시용

  // Close swipe when clicking/tapping outside this entry
  useEffect(() => {
    if (swipeDir === 'none') return;
    const handler = (e: Event) => {
      if (entryRef.current && !entryRef.current.contains(e.target as Node)) {
        setSwipeDir('none');
      }
    };
    document.addEventListener('touchstart', handler, true);
    document.addEventListener('mousedown', handler, true);
    return () => {
      document.removeEventListener('touchstart', handler, true);
      document.removeEventListener('mousedown', handler, true);
    };
  }, [swipeDir]);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Unified pointer start (touch + mouse)
  const handlePointerStart = useCallback((clientX: number, clientY: number, target: HTMLElement) => {
    if (target.tagName === 'BUTTON') return;
    pointerStart.current = { x: clientX, y: clientY, time: Date.now() };
    isDragging.current = false;
    didLongPress.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onEdit();
    }, 500);
  }, [onEdit, clearLongPress]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!pointerStart.current) return;
    const dx = Math.abs(clientX - pointerStart.current.x);
    const dy = Math.abs(clientY - pointerStart.current.y);
    if (dx > 10 || dy > 10) {
      clearLongPress();
      isDragging.current = true;
    }
  }, [clearLongPress]);

  const handlePointerEnd = useCallback((clientX: number) => {
    clearLongPress();
    if (!pointerStart.current || didLongPress.current) {
      pointerStart.current = null;
      return;
    }
    const diff = clientX - pointerStart.current.x;
    const currentSwipe = swipeDirRef.current; // ref로 최신 값 참조
    if (diff < -60) setSwipeDir('left');
    else if (diff > 60) setSwipeDir(currentSwipe === 'none' ? 'right' : 'none');
    else if (Math.abs(diff) < 10 && !isDragging.current) {
      if (currentSwipe !== 'none') {
        // 스와이프 닫기만 — 상태 변경 안 함
        setSwipeDir('none');
      } else {
        // 스와이프 없는 상태에서 탭
        if (entry.type === 'note') {
          // 메모는 바로 수정 모달 열기
          onEdit();
        } else {
          // 상태 순환 (600ms 내 중복 호출 방지)
          const now = Date.now();
          if (now - lastCycledAt.current > 600) {
            lastCycledAt.current = now;
            cycleStatus(entry.id);
          }
        }
      }
    }
    pointerStart.current = null;
  }, [clearLongPress, cycleStatus, entry.id]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchHandled.current = true;
    handlePointerStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    handlePointerEnd(e.changedTouches[0].clientX);
    // 합성 마우스 이벤트 무시 (600ms)
    setTimeout(() => { touchHandled.current = false; }, 600);
  };

  // Mouse handlers (합성 마우스 이벤트 필터링)
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || touchHandled.current) return;
    handlePointerStart(e.clientX, e.clientY, e.target as HTMLElement);

    const onMouseMove = (ev: MouseEvent) => {
      handlePointerMove(ev.clientX, ev.clientY);
    };
    const onMouseUp = (ev: MouseEvent) => {
      handlePointerEnd(ev.clientX);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const priorityBtnStyle = (key: string, active: boolean): React.CSSProperties => ({
    flex: 1, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    fontFamily: '-apple-system, sans-serif',
    background: active ? C.primary : key === 'urgent-important' ? '#8b1a1a' : key === 'urgent' ? C.accent : key === 'important' ? C.amber : C.textMuted,
    color: isDark ? '#1a1a1a' : 'white',
  });

  // 스와이프 버튼 영역 (compact / full 공통)
  const swipeButtons = (
    <>
      {/* 좌측: 우선순위 버튼 (좌→우 스와이프) */}
      {onChangePriority && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 220,
          display: 'flex', transition: 'opacity 0.2s',
          opacity: swipeDir === 'right' ? 1 : 0,
          pointerEvents: swipeDir === 'right' ? 'auto' : 'none',
        }}>
          {(['none', 'important', 'urgent', 'urgent-important'] as EntryPriority[]).map(key => {
            const p = PRIORITY[key];
            return (
              <button key={key}
                style={priorityBtnStyle(key, entry.priority === key)}
                onTouchEnd={(e) => { e.stopPropagation(); onChangePriority(entry.id, key); setSwipeDir('none'); }}
                onClick={() => { onChangePriority(entry.id, key); setSwipeDir('none'); }}>
                {p.symbol ? p.symbol + ' ' : ''}{p.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 우측: 액션 버튼 (우→좌 스와이프) */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 200,
        display: 'flex', transition: 'opacity 0.2s',
        opacity: swipeDir === 'left' ? 1 : 0,
        pointerEvents: swipeDir === 'left' ? 'auto' : 'none',
      }}>
        {onMigrate && entry.status !== 'migrated' && entry.status !== 'migrated_up' && (
          <button style={{ flex: 1, background: '#c0883f', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif' }}
            onTouchEnd={(e) => { e.stopPropagation(); onMigrate(); setSwipeDir('none'); }}
            onClick={() => { onMigrate(); setSwipeDir('none'); }}>이관 →</button>
        )}
        {onMigrateUp && entry.status !== 'migrated' && entry.status !== 'migrated_up' && (
          <button style={{ flex: 1, background: '#3a7ca5', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif' }}
            onTouchEnd={(e) => { e.stopPropagation(); onMigrateUp(); setSwipeDir('none'); }}
            onClick={() => { onMigrateUp(); setSwipeDir('none'); }}>상위 ←</button>
        )}
        <button style={{ flex: 1, background: '#6b5d4d', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif' }}
          onTouchEnd={(e) => { e.stopPropagation(); onEdit(); setSwipeDir('none'); }}
          onClick={() => { onEdit(); setSwipeDir('none'); }}>수정</button>
        <button style={{ flex: 1, background: '#c0583f', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif' }}
          onTouchEnd={(e) => { e.stopPropagation(); onDelete(); setSwipeDir('none'); }}
          onClick={() => { onDelete(); setSwipeDir('none'); }}>삭제</button>
      </div>
    </>
  );

  if (compact) {
    return (
      <div ref={entryRef} style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, marginBottom: 2 }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onContextMenu={(e) => { e.preventDefault(); onEdit(); }}>
        {swipeButtons}
        <div style={{
          ...styles.weekEntry as React.CSSProperties,
          transform: swipeDir === 'left' ? 'translateX(-200px)' : swipeDir === 'right' ? 'translateX(220px)' : 'translateX(0)',
          transition: 'transform 0.25s ease',
          userSelect: 'none',
        }}
        >
          {pr.symbol ? <span style={{ color: entry.priority === 'urgent-important' ? '#8b1a1a' : entry.priority === 'urgent' ? C.accent : C.amber, fontSize: 11, marginRight: 2 }}>{pr.symbol}</span> : null}
          {entry.type === 'event' ? (
            <span style={{ color: C.accent, fontSize: 12, marginRight: 6 }}>○</span>
          ) : entry.type === 'goal-yearly' ? (
            <span style={{ color: C.blue, fontSize: 13, fontWeight: 800, marginRight: 6 }}>◎</span>
          ) : (
            <span style={{
              color: statusColor(entry.status), fontSize: 14, fontWeight: 800, marginRight: 6,
              textDecoration: ('strike' in st && st.strike) ? 'line-through' : 'none',
            }}>{st.symbol}</span>
          )}
          <span style={{
            fontSize: 13, color: isStrike ? C.textMuted : C.textPrimary,
            textDecoration: isStrike ? 'line-through' : 'none',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{entry.text}</span>
          {entry.time && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 4 }}>{entry.time}</span>}
        </div>
      </div>
    );
  }

  return (
    <div ref={entryRef} style={styles.entryOuter as React.CSSProperties}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onContextMenu={(e) => { e.preventDefault(); onEdit(); }}>
      {swipeButtons}

      {/* 메인 콘텐츠 */}
      <div style={{
        ...styles.entryRow as React.CSSProperties,
        transform: swipeDir === 'left' ? 'translateX(-200px)' : swipeDir === 'right' ? 'translateX(220px)' : 'translateX(0)',
        transition: 'transform 0.25s ease',
        userSelect: 'none',
      }}
      >
        {pr.symbol ? <span style={{ ...styles.prMark, color: entry.priority === 'urgent-important' ? '#8b1a1a' : entry.priority === 'urgent' ? C.accent : C.amber }}>{pr.symbol}</span> : null}
        {entry.type === 'event' ? (
          <span style={{ ...styles.entrySym, color: C.accent, fontSize: 18 }}>○</span>
        ) : entry.type === 'goal-yearly' ? (
          <span style={{ ...styles.entrySym, color: C.blue, fontSize: 18 }}>◎</span>
        ) : entry.type === 'note' ? (
          <span style={{ ...styles.entrySym, color: C.textSecondary, fontSize: 16 }}>—</span>
        ) : (
          <span style={{
            ...styles.entrySym,
            color: statusColor(entry.status),
            textDecoration: ('strike' in st && st.strike) ? 'line-through' : 'none',
            fontSize: entry.status === 'done' ? 20 : 22,
            fontWeight: 800,
          }}>{st.symbol}</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            ...styles.entryText,
            textDecoration: isStrike ? 'line-through' : 'none',
            color: isStrike ? C.textMuted : C.textPrimary,
          }}>{entry.text}</span>
          {entry.time && <span style={styles.timeTag}>{entry.time}</span>}
          {(entry.migrateCount || 0) >= 1 && (
            <span style={{
              fontSize: 9, fontWeight: 700, marginLeft: 4,
              padding: '1px 5px', borderRadius: 3,
              background: (entry.migrateCount || 0) >= 3 ? `${C.accent}20` : `${C.amber}20`,
              color: (entry.migrateCount || 0) >= 3 ? C.accent : C.amber,
            }}>{(entry.migrateCount || 0) === 1 ? '이관됨' : `${entry.migrateCount}회 이관${(entry.migrateCount || 0) >= 3 ? '!' : ''}`}</span>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div style={{ marginTop: 2 }}>
              {entry.tags.map((tag, i) => (
                <span key={i} style={{
                  fontSize: 10, color: C.blue, background: `${C.blue}10`,
                  padding: '1px 5px', borderRadius: 3, marginRight: 3,
                }}>#{tag}</span>
              ))}
            </div>
          )}
          {entry.memo && (
            <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.memo}
            </div>
          )}
          {entry.subtasks && entry.subtasks.length > 0 && (
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>☑ {entry.subtasks.filter(s => s.done).length}/{entry.subtasks.length}</span>
              <div style={{
                flex: 1, maxWidth: 60, height: 3, borderRadius: 2, background: C.borderLight, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: C.green,
                  width: `${(entry.subtasks.filter(s => s.done).length / entry.subtasks.length) * 100}%`,
                }} />
              </div>
            </div>
          )}
          {goalProgress && (
            <div style={{ fontSize: 10, color: C.blue, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{goalProgress.done}/{goalProgress.target || goalProgress.total}</span>
              <div style={{
                flex: 1, maxWidth: 80, height: 4, borderRadius: 2, background: C.borderLight, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: C.blue,
                  width: `${goalProgress.target > 0 ? Math.min(100, (goalProgress.done / goalProgress.target) * 100) : (goalProgress.total > 0 ? (goalProgress.done / goalProgress.total) * 100 : 0)}%`,
                }} />
              </div>
              {goalProgress.target > 0 && (
                <span>{Math.round((goalProgress.done / goalProgress.target) * 100)}%</span>
              )}
            </div>
          )}
        </div>
        <span style={{ ...styles.statusBadge, background: statusColor(entry.status) + '18', color: statusColor(entry.status) }}>
          {STATUS_LABEL_BY_TYPE[entry.type]?.[entry.status] || st.label}
        </span>
      </div>
    </div>
  );
}
