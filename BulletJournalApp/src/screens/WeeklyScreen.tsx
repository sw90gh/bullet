import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { WeeklyTimeline } from '../components/WeeklyTimeline';
import { DAYS_KR } from '../utils/constants';
import { getWeekDates, formatDateKey, getTodayStr } from '../utils/date';
import { Entry, EntryPriority } from '../types';

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
}

export function WeeklyScreen({ date, entries, cycleStatus, onAdd, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, onUpdateEntry, setCurDate, setView }: WeeklyScreenProps) {
  const { styles, C } = useTheme();
  const weekDates = getWeekDates(date.getFullYear(), date.getMonth(), date.getDate());
  const todayStr = getTodayStr();
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

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

  return (
    <div>
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

      {/* 밀린 항목 */}
      {(() => {
        const overdue = entries.filter(e => {
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
                compact />
            ))}
          </div>
        );
      })()}

      {viewMode === 'list' ? (
        // 기존 목록 뷰
        <div>
          {weekDates.map(wd => {
            const dateStr = formatDateKey(wd);
            const dayEntries = entries.filter(e => e.date === dateStr).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            const isT = dateStr === todayStr;
            const isWeekend = wd.getDay() === 0 || wd.getDay() === 6;

            return (
              <div key={dateStr} style={{ ...styles.weekDay, ...(isT ? styles.weekDayToday : {}) } as React.CSSProperties}>
                <div style={styles.weekDayHeader as React.CSSProperties}
                  onClick={() => { setCurDate(wd); setView('daily'); }}>
                  <span style={{
                    ...styles.weekDayName,
                    color: isWeekend ? C.accent : C.textPrimary,
                  }}>{DAYS_KR[wd.getDay()]}</span>
                  <span style={{
                    ...styles.weekDayNum,
                    ...(isT ? styles.weekDayNumToday : {}),
                  } as React.CSSProperties}>{wd.getDate()}</span>
                  <div style={{ flex: 1 }} />
                  <button style={styles.weekAddBtn as React.CSSProperties}
                    onClick={(e) => { e.stopPropagation(); onAdd(dateStr); }}>+</button>
                </div>
                {dayEntries.length === 0 ? (
                  <p style={{ fontSize: 12, color: C.textLight, padding: '4px 0 0 28px', fontStyle: 'italic' }}>비어 있음</p>
                ) : (
                  dayEntries.map(entry => (
                    <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
                      onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
                      onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
                      onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
                      onChangePriority={onChangePriority}
                      compact />
                  ))
                )}
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
              onClick={() => setTimelineOffset(Math.max(0, timelineOffset - 3))}
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
              onClick={() => setTimelineOffset(Math.min(4, timelineOffset + 3))}
              disabled={timelineOffset >= 4}
            >›</button>
          </div>

          {onUpdateEntry && (
            <WeeklyTimeline
              dates={timelineDates}
              entries={entries}
              onEdit={onEdit}
              onUpdateEntry={onUpdateEntry}
            />
          )}
        </div>
      )}
    </div>
  );
}
