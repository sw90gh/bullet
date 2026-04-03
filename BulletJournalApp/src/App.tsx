import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { getStyles } from './styles/theme';
import { COLORS_DARK } from './utils/constants';
import { DarkModeProvider } from './hooks/useDarkModeContext';
import { Header } from './components/Header';
import { EntryModal } from './components/EntryModal';
import { MigrateModal } from './components/MigrateModal';
import { DeleteConfirm } from './components/DeleteConfirm';
import { SearchModal } from './components/SearchModal';
import { AllScreen } from './screens/AllScreen';
import { DailyScreen } from './screens/DailyScreen';
import { WeeklyScreen } from './screens/WeeklyScreen';
import { MonthlyScreen } from './screens/MonthlyScreen';
import { AnnualScreen } from './screens/AnnualScreen';
import { GanttScreen } from './screens/GanttScreen';
import { NotesScreen } from './screens/NotesScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useEntries } from './hooks/useEntries';
import { useAuth } from './hooks/useAuth';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { useNotifications } from './hooks/useNotifications';
import { useGoogleCalendar } from './hooks/useGoogleCalendar';
import { formatDateKey, pad, getTodayStr, daysBetween, uid as genId } from './utils/date';
import { generateRecurringEntries } from './utils/recurring';
import { autoBackup, shouldRemindBackup, shareBackup, markExported, getLastExportTime, migrateGoalsToEntries } from './utils/storage';
import { cleanupFirestoreGoals } from './utils/firestore';
import { ViewType, ModalState, Entry, EntryPriority } from './types';

type DarkModePref = 'system' | 'light' | 'dark';

function useDarkMode() {
  const [pref, setPref] = useState<DarkModePref>(() => {
    return (localStorage.getItem('darkModePref') as DarkModePref) || 'system';
  });
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkModePref', pref);
  }, [pref]);

  const isDark = pref === 'dark' || (pref === 'system' && systemDark);

  useEffect(() => {
    document.body.style.background = isDark ? '#1a1a1a' : '#faf6f0';
  }, [isDark]);

  return { isDark, pref, setPref };
}

export default function App() {
  const { isDark, pref, setPref } = useDarkMode();
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  const [view, setView] = useState<ViewType>('daily');
  const [curDate, setCurDate] = useState(new Date());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [migrateTarget, setMigrateTarget] = useState<{ entry: Entry; type: 'migrated' | 'migrated_up' } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagBarExpanded, setTagBarExpanded] = useState(false);
  const [visibleTagCount, setVisibleTagCount] = useState<number>(999);
  const tagBarRef = useRef<HTMLDivElement>(null);
  const [backupDismissed, setBackupDismissed] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('bujo-notifications') !== 'off');

  const [gcalEnabled, setGcalEnabled] = useState(() => localStorage.getItem('bujo-gcal') !== 'off');

  const { entries, loaded: entriesLoaded, addEntry, updateEntry, deleteEntry, cycleStatus, migrateEntry, migrateUpEntry, setEntries } = useEntries();
  const { user, loading: authLoading, login, logout, error: authError, googleAccessToken } = useAuth();
  const { syncStatus, syncError } = useFirestoreSync(user, entries, setEntries, entriesLoaded);
  useNotifications(entries, notificationsEnabled);
  const { events: gcalEvents, loading: gcalLoading, error: gcalError, refresh: gcalRefresh } = useGoogleCalendar(googleAccessToken, gcalEnabled);

  const toggleGcal = useCallback((on: boolean) => {
    setGcalEnabled(on);
    localStorage.setItem('bujo-gcal', on ? 'on' : 'off');
  }, []);

  const toggleNotifications = useCallback((on: boolean) => {
    setNotificationsEnabled(on);
    localStorage.setItem('bujo-notifications', on ? 'on' : 'off');
  }, []);

  const curY = curDate.getFullYear();
  const curM = curDate.getMonth();

  const goToday = () => setCurDate(new Date());
  const nav = useCallback((dir: number) => {
    setCurDate(prev => {
      const d = new Date(prev);
      if (view === 'daily') d.setDate(d.getDate() + dir);
      else if (view === 'weekly') d.setDate(d.getDate() + dir * 7);
      else if (view === 'monthly' || view === 'gantt') d.setMonth(d.getMonth() + dir);
      else if (view === 'annual') d.setFullYear(d.getFullYear() + dir);
      return d;
    });
  }, [view]);

  const changePriority = useCallback((id: string, priority: EntryPriority) => {
    updateEntry(id, { priority });
  }, [updateEntry]);

  const toggleGoalDone = useCallback((id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) updateEntry(id, { status: entry.status === 'done' ? 'todo' : 'done' });
  }, [entries, updateEntry]);

  const tagCountMap = useMemo(() => {
    const m = new Map<string, number>();
    entries.forEach(e => e.tags?.forEach(t => m.set(t, (m.get(t) || 0) + 1)));
    return m;
  }, [entries]);

  const allTags = useMemo(() => {
    return Array.from(tagCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [tagCountMap]);

  const tagList = useMemo(() => {
    return allTags.map(t => ({ name: t, count: tagCountMap.get(t) || 0 }));
  }, [allTags, tagCountMap]);

  const deleteTag = useCallback((tag: string) => {
    entries.forEach(e => {
      if (e.tags?.includes(tag)) {
        const newTags = e.tags.filter(t => t !== tag);
        updateEntry(e.id, { tags: newTags.length > 0 ? newTags : undefined });
      }
    });
    if (selectedTag === tag) setSelectedTag(null);
  }, [entries, updateEntry, selectedTag]);

  // 태그바 보이는 개수 측정
  useEffect(() => {
    const el = tagBarRef.current;
    if (!el || allTags.length === 0) return;
    const measure = () => {
      const containerWidth = el.clientWidth;
      const children = el.children;
      let count = 0;
      for (let i = 1; i < children.length; i++) { // i=0 is "전체" button
        const child = children[i] as HTMLElement;
        if (child.offsetLeft + child.offsetWidth > containerWidth) break;
        count++;
      }
      setVisibleTagCount(Math.max(1, count));
    };
    // 렌더 후 측정
    setVisibleTagCount(999); // 먼저 전부 렌더
    requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [allTags, view]);

  const filteredEntries = useMemo(() => {
    if (!selectedTag) return entries;
    return entries.filter(e => e.tags?.includes(selectedTag));
  }, [entries, selectedTag]);

  // 마감 임박 개수 (D-3 이내)
  const urgentCount = useMemo(() => {
    const today = getTodayStr();
    return entries.filter(e => {
      if (!e.endDate) return false;
      if (e.status === 'done' || e.status === 'cancelled' || e.status === 'migrated' || e.status === 'migrated_up') return false;
      return daysBetween(today, e.endDate) <= 3;
    }).length;
  }, [entries]);

  // 반복 항목 자동 생성
  useEffect(() => {
    if (!entriesLoaded) return;
    const newEntries = generateRecurringEntries(entries);
    newEntries.forEach(e => addEntry(e));
  }, [entriesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Goal → Entry 마이그레이션 (1회 실행)
  useEffect(() => {
    if (!entriesLoaded) return;
    const migrated = migrateGoalsToEntries();
    if (migrated.length > 0) {
      migrated.forEach(e => addEntry(e));
    }
    // Firestore goals 컬렉션 정리 (로그인 상태)
    if (user) cleanupFirestoreGoals(user.uid);
  }, [entriesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // 자동 백업 (1시간마다)
  useEffect(() => {
    if (!entriesLoaded) return;
    autoBackup();
    const interval = setInterval(autoBackup, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [entriesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entriesLoaded) {
    return (
      <DarkModeProvider isDark={isDark}>
        <div style={styles.loadingWrap as React.CSSProperties}>
          <div style={styles.loadingDot}>·</div>
          <p style={{ color: isDark ? COLORS_DARK.textSecondary : '#6b5d4d', fontSize: 14, marginTop: 8 }}>불러오는 중...</p>
        </div>
      </DarkModeProvider>
    );
  }

  return (
    <DarkModeProvider isDark={isDark}>
    <div style={styles.app as React.CSSProperties}>
      <div style={styles.stickyTop as React.CSSProperties}>
      <Header
        curDate={curDate}
        view={view}
        nav={nav}
        goToday={goToday}
        onSettings={() => setShowSettings(true)}
        urgentCount={urgentCount}
        onSearch={() => setShowSearch(true)}
        syncStatus={user ? syncStatus : undefined}
        syncError={user ? syncError : undefined}
      />

      {/* View Tabs */}
      <div style={styles.tabBar as React.CSSProperties}>
        {([
          { key: 'all' as ViewType, label: '전체' },
          { key: 'daily' as ViewType, label: '일간' },
          { key: 'weekly' as ViewType, label: '주간' },
          { key: 'monthly' as ViewType, label: '월간' },
          { key: 'annual' as ViewType, label: '연간' },
          { key: 'gantt' as ViewType, label: '간트' },
          { key: 'notes' as ViewType, label: '메모' },
          { key: 'stats' as ViewType, label: '통계' },
        ]).map(t => (
          <button key={t.key}
            style={{ ...styles.tab, ...(view === t.key ? styles.tabActive : {}) }}
            onClick={(e) => {
              if (view === t.key) {
                mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                setView(t.key);
              }
              (e.target as HTMLElement).blur();
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tag Filter — 한 줄 + 더보기 팝업 */}
      {allTags.length > 0 && view !== 'annual' && (
        <div style={{ padding: '6px 16px 0', display: 'flex', gap: 4, alignItems: 'center' }}>
          <div ref={tagBarRef} style={{
            display: 'flex', gap: 4, overflow: 'hidden',
            flex: 1, minWidth: 0, maxHeight: 26, alignItems: 'center',
          }}>
            <button
              style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${isDark ? COLORS_DARK.border : '#ddd5c9'}`, whiteSpace: 'nowrap',
                fontFamily: '-apple-system, sans-serif',
                background: selectedTag === null ? (isDark ? COLORS_DARK.primary : '#2c2416') : (isDark ? COLORS_DARK.bgWhite : 'white'),
                color: selectedTag === null ? (isDark ? '#1a1a1a' : 'white') : (isDark ? COLORS_DARK.textSecondary : '#6b5d4d'),
                flexShrink: 0,
              }}
              onClick={() => setSelectedTag(null)}>전체</button>
            {allTags.slice(0, visibleTagCount).map(tag => (
              <button key={tag}
                style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${isDark ? COLORS_DARK.border : '#ddd5c9'}`, whiteSpace: 'nowrap',
                  fontFamily: '-apple-system, sans-serif',
                  background: selectedTag === tag ? (isDark ? COLORS_DARK.blue : '#3a7ca5') : (isDark ? COLORS_DARK.bgWhite : 'white'),
                  color: selectedTag === tag ? 'white' : (isDark ? COLORS_DARK.blue : '#3a7ca5'),
                  flexShrink: 0,
                }}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}>#{tag}</button>
            ))}
          </div>
          {visibleTagCount < allTags.length && (
            <button
              style={{
                padding: '3px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${isDark ? COLORS_DARK.border : '#ddd5c9'}`, whiteSpace: 'nowrap',
                fontFamily: '-apple-system, sans-serif', flexShrink: 0,
                background: isDark ? COLORS_DARK.bgWhite : 'white',
                color: isDark ? COLORS_DARK.textMuted : '#b8a99a',
              }}
              onClick={() => setTagBarExpanded(true)}>+{allTags.length - visibleTagCount}</button>
          )}
        </div>
      )}
      {/* 태그 선택 팝업 */}
      {tagBarExpanded && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setTagBarExpanded(false)}>
          <div style={{
            background: isDark ? COLORS_DARK.bg : '#fff',
            borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430,
            maxHeight: '50vh', overflow: 'auto', padding: '0 20px 24px',
            paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '14px 0 10px', borderBottom: `1px solid ${isDark ? COLORS_DARK.borderLight : '#eee'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? COLORS_DARK.textPrimary : '#2c2416' }}>태그 필터</span>
              <button style={{
                background: 'none', border: 'none', fontSize: 16,
                color: isDark ? COLORS_DARK.textMuted : '#b8a99a', cursor: 'pointer', padding: 4,
              }} onClick={() => setTagBarExpanded(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '12px 0' }}>
              <button
                style={{
                  padding: '6px 14px', borderRadius: 14, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${isDark ? COLORS_DARK.border : '#ddd5c9'}`,
                  fontFamily: '-apple-system, sans-serif',
                  background: selectedTag === null ? (isDark ? COLORS_DARK.primary : '#2c2416') : (isDark ? COLORS_DARK.bgWhite : 'white'),
                  color: selectedTag === null ? (isDark ? '#1a1a1a' : 'white') : (isDark ? COLORS_DARK.textSecondary : '#6b5d4d'),
                }}
                onClick={() => { setSelectedTag(null); setTagBarExpanded(false); }}>전체</button>
              {allTags.map(tag => (
                <button key={tag}
                  style={{
                    padding: '6px 14px', borderRadius: 14, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${isDark ? COLORS_DARK.border : '#ddd5c9'}`,
                    fontFamily: '-apple-system, sans-serif',
                    background: selectedTag === tag ? (isDark ? COLORS_DARK.blue : '#3a7ca5') : (isDark ? COLORS_DARK.bgWhite : 'white'),
                    color: selectedTag === tag ? 'white' : (isDark ? COLORS_DARK.blue : '#3a7ca5'),
                  }}
                  onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setTagBarExpanded(false); }}>#{tag}</button>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>{/* end stickyTop */}

      {/* Backup Reminder Banner */}
      {!backupDismissed && shouldRemindBackup() && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', gap: 8, flexShrink: 0,
          background: isDark ? '#2a2520' : '#fff8ee',
          borderBottom: `1px solid ${isDark ? '#3a3530' : '#e8ddd0'}`,
        }}>
          <span style={{ fontSize: 12, color: isDark ? '#c0a888' : '#6b5d4d', flex: 1 }}>
            📦 백업을 권장합니다{(() => {
              const last = getLastExportTime();
              if (!last) return ' (아직 백업한 적 없음)';
              const days = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
              return ` (${days}일 전 마지막 백업)`;
            })()}
          </span>
          <button style={{
            background: isDark ? '#c0883f' : '#c0883f', color: 'white', border: 'none',
            fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
            cursor: 'pointer', fontFamily: '-apple-system, sans-serif', whiteSpace: 'nowrap',
          }} onClick={async () => {
            const ok = await shareBackup();
            if (ok) setBackupDismissed(true);
          }}>백업하기</button>
          <button style={{
            background: 'none', border: 'none', color: isDark ? '#6b5d4d' : '#b8a99a',
            fontSize: 14, cursor: 'pointer', padding: '2px 4px',
          }} onClick={() => setBackupDismissed(true)}>✕</button>
        </div>
      )}

      {/* Content */}
      <main ref={mainRef} style={styles.main}>
        {view === 'all' && (
          <AllScreen
            entries={filteredEntries}
            cycleStatus={cycleStatus}
            onAdd={() => setModal({ mode: 'add', scope: 'daily', date: formatDateKey(curDate), hideGoalType: true })}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            onDelete={(id) => setDeleteConfirm(id)}
            onMigrate={(e) => setMigrateTarget({ entry: e, type: 'migrated' })}
            onMigrateUp={(e) => setMigrateTarget({ entry: e, type: 'migrated_up' })}
            onChangePriority={changePriority}
          />
        )}

        {view === 'daily' && (
          <DailyScreen
            date={curDate}
            entries={filteredEntries}
            allEntries={entries}
            cycleStatus={cycleStatus}
            onAdd={() => setModal({ mode: 'add', scope: 'daily', date: formatDateKey(curDate), hideGoalType: true })}
            onAddAtTime={(time) => setModal({ mode: 'add', scope: 'daily', date: formatDateKey(curDate), defaultTime: time, hideGoalType: true })}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            onDelete={(id) => setDeleteConfirm(id)}
            onMigrate={(e) => setMigrateTarget({ entry: e, type: 'migrated' })}
            onMigrateUp={(e) => setMigrateTarget({ entry: e, type: 'migrated_up' })}
            onChangePriority={changePriority}
            onUpdateEntry={updateEntry}
            gcalEvents={gcalEvents}
          />
        )}

        {view === 'weekly' && (
          <WeeklyScreen
            date={curDate}
            entries={filteredEntries}
            cycleStatus={cycleStatus}
            onAdd={(dateStr) => setModal({ mode: 'add', scope: 'daily', date: dateStr, hideGoalType: true })}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            onDelete={(id) => setDeleteConfirm(id)}
            onMigrate={(e) => setMigrateTarget({ entry: e, type: 'migrated' })}
            onMigrateUp={(e) => setMigrateTarget({ entry: e, type: 'migrated_up' })}
            onChangePriority={changePriority}
            onUpdateEntry={updateEntry}
            setCurDate={setCurDate}
            setView={(v) => setView(v as ViewType)}
            gcalEvents={gcalEvents}
          />
        )}

        {view === 'monthly' && (
          <MonthlyScreen
            year={curY}
            month={curM}
            entries={filteredEntries}
            cycleStatus={cycleStatus}
            onAddEntry={() => setModal({ mode: 'add', scope: 'monthly', date: `${curY}-${pad(curM + 1)}`, hideGoalType: true })}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            onDelete={(id) => setDeleteConfirm(id)}
            onMigrate={(e) => setMigrateTarget({ entry: e, type: 'migrated' })}
            onMigrateUp={(e) => setMigrateTarget({ entry: e, type: 'migrated_up' })}
            onChangePriority={changePriority}
            onDayTap={(d) => { setCurDate(new Date(curY, curM, d)); setView('daily'); }}
            onToggleGoalDone={toggleGoalDone}
            gcalEvents={gcalEvents}
          />
        )}

        {view === 'annual' && (
          <AnnualScreen
            year={curY}
            entries={filteredEntries}
            cycleStatus={cycleStatus}
            onAdd={() => setModal({ mode: 'add', scope: 'daily', date: `${curY}-01-01`, year: curY } as ModalState & { year: number })}
            onAddGoal={() => setModal({ mode: 'add', scope: 'daily', date: `${curY}-01-01`, defaultType: 'goal-yearly' })}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            onDelete={(id) => setDeleteConfirm(id)}
            onMigrate={(e) => setMigrateTarget({ entry: e, type: 'migrated' })}
            onMigrateUp={(e) => setMigrateTarget({ entry: e, type: 'migrated_up' })}
            onChangePriority={changePriority}
            onMonthTap={(m) => { setCurDate(new Date(curY, m, 1)); setView('monthly'); }}
            onToggleGoalDone={toggleGoalDone}
          />
        )}

        {view === 'gantt' && (
          <GanttScreen
            year={curY}
            month={curM}
            entries={filteredEntries}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
          />
        )}

        {view === 'notes' && (
          <NotesScreen
            entries={filteredEntries}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
          />
        )}

        {view === 'stats' && (
          <StatsScreen
            year={curY}
            month={curM}
            entries={entries}
            isDark={isDark}
          />
        )}
      </main>

      {/* FAB */}
      {view !== 'gantt' && view !== 'stats' && (
        <button style={styles.fab as React.CSSProperties} onClick={() => {
          const defaultType = view === 'annual' ? 'goal-yearly' as const
            : view === 'notes' ? 'note' as const
            : undefined;
          const hideGoalType = view !== 'annual' && view !== 'monthly';
          setModal({ mode: 'add', scope: 'daily', date: formatDateKey(curDate), defaultType, hideGoalType });
        }}>+</button>
      )}

      {/* Modal */}
      {modal && (
        <EntryModal
          modal={modal}
          onClose={() => setModal(null)}
          allTags={allTags}
          allEntries={entries}
          onSaveEntry={(data) => {
            if (modal.mode === 'edit' && modal.entry) {
              updateEntry(modal.entry.id, data);
            } else {
              addEntry(data as Entry);
            }
            setModal(null);
          }}
          onRequestMigrate={(entry) => {
            setModal(null);
            setMigrateTarget({ entry, type: 'migrated' });
          }}
          onDelete={(id) => {
            deleteEntry(id);
            setModal(null);
          }}
          onDuplicate={(data) => {
            addEntry(data as Entry);
            setModal(null);
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <DeleteConfirm
          onCancel={() => setDeleteConfirm(null)}
          onDelete={() => {
            deleteEntry(deleteConfirm);
            setDeleteConfirm(null);
          }}
        />
      )}

      {/* Migrate Modal */}
      {migrateTarget && (
        <MigrateModal
          entry={migrateTarget.entry}
          type={migrateTarget.type}
          onClose={() => setMigrateTarget(null)}
          onMigrate={(targetDate) => {
            migrateEntry(migrateTarget.entry.id, targetDate);
            setMigrateTarget(null);
          }}
          onMigrateUp={(goalText, year, _month, goalDate) => {
            const goalId = genId();
            migrateUpEntry(migrateTarget.entry.id);
            updateEntry(migrateTarget.entry.id, { linkedGoalId: goalId });
            addEntry({
              id: goalId,
              text: goalText,
              type: 'goal-yearly',
              status: 'todo',
              priority: 'none',
              date: goalDate || `${year}-12-31`,
              linkedEntryId: migrateTarget.entry.id,
              createdAt: Date.now(),
            } as Entry);
            setMigrateTarget(null);
          }}
        />
      )}

      {/* Search */}
      {showSearch && (
        <SearchModal
          entries={entries}
          onClose={() => setShowSearch(false)}
          onEdit={(e) => { setModal({ mode: 'edit', entry: e }); setShowSearch(false); }}
          cycleStatus={cycleStatus}
          onDelete={(id) => deleteEntry(id)}
        />
      )}

      {/* Settings */}
      {showSettings && (
        <SettingsScreen
          onClose={() => setShowSettings(false)}
          tagList={tagList}
          onDeleteTag={deleteTag}
          isDark={isDark}
          darkModePref={pref}
          onDarkModeChange={setPref}
          user={user}
          authLoading={authLoading}
          onLogin={login}
          onLogout={logout}
          syncStatus={syncStatus}
          syncError={syncError}
          authError={authError}
          notificationsEnabled={notificationsEnabled}
          onNotificationsChange={toggleNotifications}
          gcalEnabled={gcalEnabled}
          onGcalChange={toggleGcal}
          gcalLoading={gcalLoading}
          gcalError={gcalError}
          onGcalRefresh={gcalRefresh}
        />
      )}
    </div>
    </DarkModeProvider>
  );
}
