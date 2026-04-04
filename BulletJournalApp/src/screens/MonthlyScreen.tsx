import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { DailySummary } from '../components/DailySummary';
import { getDaysInMonth, pad, getTodayStr } from '../utils/date';
import { Entry, EntryPriority } from '../types';
import { STATUS } from '../utils/constants';
import { GoogleCalendarEvent } from '../hooks/useGoogleCalendar';

interface MonthlyScreenProps {
  year: number;
  month: number;
  entries: Entry[];
  cycleStatus: (id: string) => void;
  onAddEntry: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: Entry) => void;
  onMigrateUp?: (entry: Entry) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  onDayTap: (d: number) => void;
  onToggleGoalDone: (id: string) => void;
  onPopupChange?: (open: boolean) => void;
  gcalEvents?: GoogleCalendarEvent[];
}

export function MonthlyScreen({
  year, month, entries, cycleStatus,
  onAddEntry, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, onDayTap, onToggleGoalDone, onPopupChange, gcalEvents = []
}: MonthlyScreenProps) {
  const { styles, C } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  useEffect(() => { onPopupChange?.(selectedDay !== null); }, [selectedDay, onPopupChange]);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${pad(month + 1)}`;
  const allMonthEntries = entries.filter(e => e.date?.startsWith(monthKey) && e.type !== 'goal-yearly' && e.type !== 'goal-monthly')
    .sort((a, b) => {
      const po: Record<string, number> = { 'urgent-important': 0, urgent: 1, important: 2, none: 3 };
      if (po[a.priority || 'none'] !== po[b.priority || 'none'])
        return po[a.priority || 'none'] - po[b.priority || 'none'];
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  const monthEntries = showAll ? allMonthEntries : allMonthEntries.filter(e => e.status === 'todo' || e.status === 'progress');
  const todayStr = getTodayStr();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* 월간 요약 */}
      <DailySummary entries={entries} label="이번 달" filterFn={(e) => {
        return !!e.date && e.date.startsWith(monthKey) && e.type !== 'goal-yearly' && e.type !== 'goal-monthly';
      }} />

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button style={{
          ...styles.chip, flex: 1, textAlign: 'center',
          ...(showAll ? {} : styles.chipActive),
        }} onClick={() => setShowAll(false)}>
          미완료 ({allMonthEntries.filter(e => e.status === 'todo' || e.status === 'progress').length})
        </button>
        <button style={{
          ...styles.chip, flex: 1, textAlign: 'center',
          ...(showAll ? styles.chipActive : {}),
        }} onClick={() => setShowAll(true)}>
          전체 ({allMonthEntries.length})
        </button>
      </div>

      {/* Calendar */}
      <div style={{ ...styles.miniCal, marginBottom: 0 }}>
        <div style={styles.miniCalHeader as React.CSSProperties}>
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} style={{ ...styles.miniCalDow, color: d === '일' || d === '토' ? C.accent : C.textSecondary }}>{d}</div>
          ))}
        </div>
        <div style={styles.miniCalGrid as React.CSSProperties}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ ...styles.miniCalCell as React.CSSProperties, padding: '6px 1px' }} />;
            const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
            const dayItems = monthEntries.filter(e => e.date === dateStr);
            const dayGcal = gcalEvents.filter(e => e.date?.trim().startsWith(dateStr));
            const allItems: { text: string; color: string }[] = [
              ...dayItems.map(e => ({
                text: e.text,
                color: (STATUS[e.status] || STATUS.todo).color,
              })),
              ...dayGcal.map(ge => ({ text: ge.summary, color: '#4285f4' })),
            ];
            const isT = dateStr === todayStr;
            const MAX_SHOW = 3;
            return (
              <div key={i} style={{ ...styles.miniCalCell as React.CSSProperties, cursor: 'pointer', padding: '6px 1px' }}
                onClick={() => setSelectedDay(d)}>
                <span style={{
                  ...styles.miniCalNum, fontSize: 14,
                  ...(isT ? styles.miniCalToday : {}),
                } as React.CSSProperties}>{d}</span>
                {allItems.length > 0 && (
                  <div style={{ marginTop: 2 }}>
                    {allItems.slice(0, MAX_SHOW).map((item, j) => (
                      <div key={j} style={{
                        fontSize: 8, color: item.color, lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: '100%', padding: '0 1px',
                      }}>{item.text.slice(0, 5)}</div>
                    ))}
                    {allItems.length > MAX_SHOW && (
                      <div style={{ fontSize: 7, color: C.blue }}>+{allItems.length - MAX_SHOW}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 날짜 팝업 */}
      {selectedDay && (() => {
        const dayStr = `${year}-${pad(month + 1)}-${pad(selectedDay)}`;
        const dayDate = new Date(year, month, selectedDay);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayItems = monthEntries.filter(e => e.date === dayStr);
        const isT = dayStr === todayStr;
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }} onClick={() => setSelectedDay(null)}>
            <div style={{
              background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430,
              maxHeight: '60vh', overflow: 'auto', padding: '0 20px 24px',
              paddingBottom: 'env(safe-area-inset-bottom, 24px)',
            }} onClick={e => e.stopPropagation()}>
              <div style={{
                padding: '14px 0 10px', borderBottom: `1px solid ${C.borderLight}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  color: isT ? C.accent : C.textPrimary,
                }}>
                  {month + 1}/{selectedDay} ({days[dayDate.getDay()]})
                  {isT ? ' · 오늘' : ''}
                  <span style={{ fontWeight: 400, color: C.textMuted, marginLeft: 8, fontSize: 12 }}>
                    {dayItems.length}건
                  </span>
                </span>
                <button style={{
                  background: 'none', border: 'none', fontSize: 16, color: C.textMuted,
                  cursor: 'pointer', padding: 4,
                }} onClick={() => setSelectedDay(null)}>✕</button>
              </div>
              <div style={{ padding: '8px 0' }}>
                {dayItems.length === 0 ? (
                  <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', padding: 20 }}>항목이 없습니다</p>
                ) : (
                  dayItems.map(entry => (
                    <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
                      onEdit={() => { setSelectedDay(null); onEdit(entry); }}
                      onDelete={() => onDelete(entry.id)}
                      onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
                      onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
                      onChangePriority={onChangePriority} />
                  ))
                )}
                {/* 구글 캘린더 일정 */}
                {gcalEvents.filter(ge => ge.date?.trim().startsWith(dayStr)).map(ge => (
                  <div key={`gcal-${ge.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 4px', borderBottom: `1px solid ${C.borderLight}`,
                    cursor: ge.htmlLink ? 'pointer' : 'default',
                  }} onClick={() => { if (ge.htmlLink) window.open(ge.htmlLink, '_blank'); }}>
                    <span style={{ fontSize: 10, color: '#4285f4', fontWeight: 700, width: 16, textAlign: 'center' }}>G</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#4285f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ge.summary}
                      </div>
                      <div style={{ fontSize: 10, color: '#4285f488' }}>
                        {ge.allDay ? '종일' : `${ge.startTime}${ge.endTime ? ` - ${ge.endTime}` : ''}`}
                      </div>
                    </div>
                  </div>
                ))}
                <button style={{
                  width: '100%', marginTop: 8, padding: 10, borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: 'transparent',
                  color: C.textSecondary, fontSize: 12, cursor: 'pointer',
                  fontFamily: '-apple-system, sans-serif',
                }} onClick={() => { setSelectedDay(null); onDayTap(selectedDay); }}>
                  일간으로 이동 →
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
