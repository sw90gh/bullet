import React, { useState } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { DailySummary } from '../components/DailySummary';
import { getDaysInMonth, pad, getTodayStr } from '../utils/date';
import { Entry, EntryPriority } from '../types';
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
  gcalEvents?: GoogleCalendarEvent[];
}

export function MonthlyScreen({
  year, month, entries, cycleStatus,
  onAddEntry, onEdit, onDelete, onMigrate, onMigrateUp, onChangePriority, onDayTap, onToggleGoalDone, gcalEvents = []
}: MonthlyScreenProps) {
  const { styles, C } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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

      {/* Mini Calendar */}
      <div style={styles.miniCal}>
        <div style={styles.miniCalHeader as React.CSSProperties}>
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} style={{ ...styles.miniCalDow, color: d === '일' || d === '토' ? C.accent : C.textSecondary }}>{d}</div>
          ))}
        </div>
        <div style={styles.miniCalGrid as React.CSSProperties}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={styles.miniCalCell as React.CSSProperties} />;
            const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
            const dayItems = monthEntries.filter(e => e.date === dateStr);
            const dayGcal = gcalEvents.filter(e => e.date?.trim().startsWith(dateStr));
            const totalCount = dayItems.length + dayGcal.length;
            const isT = dateStr === todayStr;
            return (
              <div key={i} style={{ ...styles.miniCalCell as React.CSSProperties, cursor: 'pointer', padding: '4px 1px' }}
                onClick={() => setSelectedDay(d)}>
                <span style={{
                  ...styles.miniCalNum,
                  ...(isT ? styles.miniCalToday : {}),
                } as React.CSSProperties}>{d}</span>
                {totalCount > 0 && (
                  <div style={{ marginTop: 1 }}>
                    <div style={{
                      fontSize: 7, color: dayGcal.length > 0 && dayItems.length === 0 ? '#4285f4' : C.textMuted, lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '100%', padding: '0 1px',
                    }}>{dayItems.length > 0 ? dayItems[0].text.slice(0, 4) : dayGcal[0]?.summary.slice(0, 4)}</div>
                    {totalCount > 1 && (
                      <div style={{ fontSize: 6, color: C.blue }}>+{totalCount - 1}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 밀린 항목 */}
      {(() => {
        const overdue = entries.filter(e => {
          if (!e.date || e.date >= todayStr) return false;
          if (e.type === 'goal-yearly' || e.type === 'goal-monthly') return false;
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
                onChangePriority={onChangePriority} />
            ))}
          </div>
        );
      })()}

      {/* Monthly Tasks */}
      <div style={styles.sectionHeader as React.CSSProperties}>
        <span style={styles.sectionTitle}>이번 달 할 일</span>
        <button style={styles.sectionAdd as React.CSSProperties} onClick={onAddEntry}>+</button>
      </div>
      {monthEntries.length === 0 ? (
        <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', padding: 20 }}>등록된 항목이 없습니다</p>
      ) : (
        monthEntries.slice(0, 30).map(entry => (
          <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
            onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)}
            onMigrate={onMigrate ? () => onMigrate(entry) : undefined}
            onMigrateUp={onMigrateUp ? () => onMigrateUp(entry) : undefined}
            onChangePriority={onChangePriority} />
        ))
      )}

      {/* 날짜 팝업 */}
      {selectedDay && (() => {
        const dayStr = `${year}-${pad(month + 1)}-${pad(selectedDay)}`;
        const dayDate = new Date(year, month, selectedDay);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayItems = allMonthEntries.filter(e => e.date === dayStr);
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
