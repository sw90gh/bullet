import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { DailySummary } from '../components/DailySummary';
import { WeeklyTimeline } from '../components/WeeklyTimeline';
import { DAYS_KR } from '../utils/constants';
import { getWeekDates, formatDateKey, getTodayStr } from '../utils/date';
import { Entry, EntryPriority } from '../types';
import { GoogleCalendarEvent } from '../hooks/useGoogleCalendar';

interface WeeklyScreenProps {
  date: Date;
  entries: Entry[];
  cycleStatus: (id: string) => void;
  onAdd: (dateStr: string) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  onUpdateEntry?: (id: string, updates: Partial<Entry>) => void;
  setCurDate: (d: Date) => void;
  setView: (v: string) => void;
  gcalEvents?: GoogleCalendarEvent[];
  onPopupChange?: (open: boolean) => void;
}

export function WeeklyScreen({ date, entries, cycleStatus, onAdd, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, onUpdateEntry, setCurDate, setView, gcalEvents = [], onPopupChange }: WeeklyScreenProps) {
  const { styles, C } = useTheme();
  const weekDates = getWeekDates(date.getFullYear(), date.getMonth(), date.getDate());
  const todayStr = getTodayStr();
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // 3일 뷰: 현재 날짜 기준 어제-오늘-내일 (또는 주 내에서 3일)
  const [timelineOffset, setTimelineOffset] = useState(() => {
    // 오늘이 포함된 주에서 오늘 기준 3일 시작 인덱스
    const todayIdx = weekDates.findIndex(d => formatDateKey(d) === todayStr);
    return Math.max(0, Math.min(4, todayIdx >= 0 ? todayIdx - 1 : 0));
  });

  // date prop 변경 시 offset 리셋 (오늘 버튼, 주간 네비)
  // date.getTime()을 키로 사용하여 같은 날이라도 새 Date 객체면 리셋
  const dateTs = date.getTime();
  useEffect(() => {
    const dateStr = formatDateKey(date);
    const idx = weekDates.findIndex(d => formatDateKey(d) === dateStr);
    if (idx >= 0) {
      setTimelineOffset(Math.max(0, Math.min(4, idx - 1)));
    }
  }, [dateTs]); // eslint-disable-line react-hooks/exhaustive-deps

  const timelineDates = useMemo(() => {
    return weekDates.slice(timelineOffset, timelineOffset + 3);
  }, [weekDates, timelineOffset]);

  // Measure available height for content scroll area
  useEffect(() => {
    const measure = () => {
      const el = contentScrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setContentHeight(Math.max(200, window.innerHeight - rect.top - 12));
    };
    const timer = setTimeout(measure, 30);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(timer); window.removeEventListener('resize', measure); };
  }, [viewMode]);

  return (
    <div>
      {/* 주간 요약 */}
      <DailySummary entries={entries} label="이번 주" filterFn={(e) => {
        const ds = e.date;
        if (!ds) return false;
        const first = formatDateKey(weekDates[0]);
        const last = formatDateKey(weekDates[6]);
        return ds >= first && ds <= last && e.type !== 'goal-yearly' && e.type !== 'goal-monthly';
      }} />

      {/* 뷰 모드 토글 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button style={{
          ...styles.chip, flex: 1, textAlign: 'center',
          ...(viewMode === 'list' ? styles.chipActive : {}),
        }} onClick={() => setViewMode('list')}>목록</button>
        <button style={{
          ...styles.chip, flex: 1, textAlign: 'center',
          ...(viewMode === 'timeline' ? styles.chipActive : {}),
        }} onClick={() => setViewMode('timeline')}>시간표</button>
      </div>

      <div ref={contentScrollRef} style={{
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        height: contentHeight > 0 ? contentHeight : '60vh',
        paddingBottom: 70,
      } as React.CSSProperties}>

      {/* 밀린 항목 (목록 모드에서만) */}
      {viewMode === 'list' && (() => {
        const overdue = entries.filter(e => {
          if (e.type === 'note') return false;
          if (!e.date || e.date >= todayStr) return false;
          if (e.status === 'done' || e.status === 'cancelled' || e.status === 'migrated' || e.status === 'migrated_up') return false;
          return true;
        }).sort((a, b) => {
          const mc = (b.migrateCount || 0) - (a.migrateCount || 0);
          if (mc !== 0) return mc;
          return a.date.localeCompare(b.date);
        });
        if (overdue.length === 0) return null;
        return (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.accent,
              padding: '6px 2px 4px', borderBottom: `1px solid ${C.accent}40`,
              marginBottom: 4,
            }}>
              밀린 항목 ({overdue.length}건)
            </div>
            {overdue.map(entry => (
              <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
                onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
                onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
                onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
                onChangePriority={onChangePriority}
                />
            ))}
          </div>
        );
      })()}

      {viewMode === 'list' ? (
        // 구분선형 목록 뷰
        <div>
          {weekDates.map(wd => {
            const dateStr = formatDateKey(wd);
            const dayEntries = entries.filter(e => e.date === dateStr).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            const isT = dateStr === todayStr;
            const isWeekend = wd.getDay() === 0 || wd.getDay() === 6;

            return (
              <div key={dateStr} style={{ marginBottom: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 2px 4px', borderBottom: `1px solid ${isT ? C.accent + '40' : C.borderLight}`,
                  marginBottom: 4, cursor: 'pointer',
                }} onClick={() => { setCurDate(wd); setView('daily'); }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: isT ? C.accent : isWeekend ? `${C.accent}88` : C.textSecondary,
                  }}>{DAYS_KR[wd.getDay()]}</span>
                  <span style={{
                    fontSize: 12, fontWeight: isT ? 700 : 500,
                    color: isT ? C.accent : C.textPrimary,
                    ...(isT ? {
                      background: C.accent, color: 'white', borderRadius: '50%',
                      width: 20, height: 20, display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 11,
                    } : {}),
                  } as React.CSSProperties}>{wd.getDate()}</span>
                  <span style={{ fontSize: 11, color: C.textMuted }}>
                    {dayEntries.length > 0 ? `${dayEntries.length}건` : ''}
                  </span>
                  <div style={{ flex: 1 }} />
                  <button style={{
                    background: 'none', border: `1px solid ${C.border}`, color: C.textMuted,
                    width: 20, height: 20, borderRadius: '50%', fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    fontFamily: '-apple-system, sans-serif',
                  }} onClick={(e) => { e.stopPropagation(); onAdd(dateStr); }}>+</button>
                </div>
                {dayEntries.length === 0 ? (
                  <p style={{ fontSize: 11, color: C.textLight, padding: '2px 4px', fontStyle: 'italic' }}>비어 있음</p>
                ) : (
                  dayEntries.map(entry => (
                    <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
                      onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
                      onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
                      onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
                      onChangePriority={onChangePriority}
                      />
                  ))
                )}
                {/* 구글 캘린더 일정 */}
                {gcalEvents.filter(e => e.date?.trim().startsWith(dateStr)).map(ge => (
                  <div key={`gcal-${ge.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 4px',
                    cursor: ge.htmlLink ? 'pointer' : 'default',
                  }} onClick={() => { if (ge.htmlLink) window.open(ge.htmlLink, '_blank'); }}>
                    <span style={{ fontSize: 10, color: '#4285f4', fontWeight: 700, width: 14, textAlign: 'center' }}>G</span>
                    <span style={{ fontSize: 12, color: '#4285f4', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ge.summary}</span>
                    <span style={{ fontSize: 9, color: '#4285f488' }}>{ge.allDay ? '종일' : ge.startTime}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        // 시간표 뷰
        <div>
          {/* 3일 네비게이션 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <button
              style={{
                background: 'none', border: 'none', fontSize: 20, color: C.textSecondary,
                cursor: 'pointer', padding: '4px 8px', opacity: timelineOffset > 0 ? 1 : 0.3,
              }}
              onClick={() => setTimelineOffset(Math.max(0, timelineOffset - 1))}
              disabled={timelineOffset <= 0}
            >‹</button>
            <span style={{ fontSize: 12, color: C.textSecondary, minWidth: 120, textAlign: 'center' }}>
              {timelineDates[0] && `${timelineDates[0].getMonth() + 1}/${timelineDates[0].getDate()}`}
              {' - '}
              {timelineDates[2] && `${timelineDates[2].getMonth() + 1}/${timelineDates[2].getDate()}`}
            </span>
            <button
              style={{
                background: 'none', border: 'none', fontSize: 20, color: C.textSecondary,
                cursor: 'pointer', padding: '4px 8px', opacity: timelineOffset < 4 ? 1 : 0.3,
              }}
              onClick={() => setTimelineOffset(Math.min(4, timelineOffset + 1))}
              disabled={timelineOffset >= 4}
            >›</button>
          </div>

          {onUpdateEntry && (
            <WeeklyTimeline
              dates={timelineDates}
              entries={entries}
              onEdit={onEdit}
              onUpdateEntry={onUpdateEntry}
              cycleStatus={cycleStatus}
              gcalEvents={gcalEvents}
              onSwipeLeft={() => setTimelineOffset(Math.min(4, timelineOffset + 1))}
              onSwipeRight={() => setTimelineOffset(Math.max(0, timelineOffset - 1))}
              onPopupChange={onPopupChange}
            />
          )}
        </div>
      )}
      </div>{/* /contentScrollRef */}
    </div>
  );
}
