import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { getStyles } from './styles/theme';
import { COLORS_DARK } from './utils/constants';
import { DarkModeProvider } from './hooks/useDarkModeContext';
import { Header } from './components/Header';
import { EntryModal } from './components/EntryModal';
import { MigrateModal } from './components/MigrateModal';
import { DeleteConfirm } from './components/DeleteConfirm';
import { SearchModal } from './components/SearchModal';
import { DailyScreen } from './screens/DailyScreen';
import { WeeklyScreen } from './screens/WeeklyScreen';
import { MonthlyScreen } from './screens/MonthlyScreen';
import { AnnualScreen } from './screens/AnnualScreen';
import { GanttScreen } from './screens/GanttScreen';
import { NotesScreen } from './screens/NotesScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useEntries } from './hooks/useEntries';
import { useGoals } from './hooks/useGoals';
import { useNotionSync } from './hooks/useNotionSync';
import { formatDateKey, pad, getTodayStr, daysBetween } from './utils/date';
import { generateRecurringEntries } from './utils/recurring';
import { autoBackup } from './utils/storage';
import { ViewType, ModalState, Entry, Goal, EntryPriority } from './types';

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

  const { entries, loaded: entriesLoaded, addEntry, updateEntry, deleteEntry, cycleStatus, migrateEntry, migrateUpEntry, mergeNotionEntries } = useEntries();
  const { goals, loaded: goalsLoaded, addGoal, updateGoal, deleteGoal } = useGoals();
  const { config, syncing, lastError, connect, disconnect, syncFromNotion, isConnected } = useNotionSync();

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
    const goal = goals.find(g => g.id === id);
    if (goal) updateGoal(id, { done: !goal.done });
  }, [goals, updateGoal]);

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

  // 자동 백업 (1시간마다)
  useEffect(() => {
    if (!entriesLoaded || !goalsLoaded) return;
    autoBackup();
    const interval = setInterval(autoBackup, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [entriesLoaded, goalsLoaded, entries, goals]);

  const handleSyncNotion = async () => {
    const notionEntries = await syncFromNotion();
    if (notionEntries.length > 0) {
      mergeNotionEntries(notionEntries);
    }
  };

  if (!entriesLoaded || !goalsLoaded) {
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
        notionConnected={isConnected}
        syncing={syncing}
        urgentCount={urgentCount}
        onSearch={() => setShowSearch(true)}
      />

      {/* View Tabs */}
      <div style={styles.tabBar as React.CSSProperties}>
        {([
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
            onClick={() => setView(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && view !== 'annual' && (
        <div style={{
          padding: '6px 16px 0',
        }}>
          <div style={{
            display: 'flex', gap: 4, flexWrap: tagBarExpanded ? 'wrap' : 'nowrap',
            overflow: tagBarExpanded ? 'visible' : 'hidden',
            maxHeight: tagBarExpanded ? 'none' : 28,
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
            {allTags.map(tag => (
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
            {allTags.length > 4 && (
              <button
                style={{
                  padding: '3px 8px', borderRadius: 12, fontSize: 10, cursor: 'pointer',
                  border: 'none', background: 'transparent', color: isDark ? COLORS_DARK.textMuted : '#b8a99a',
                  fontFamily: '-apple-system, sans-serif', flexShrink: 0,
                }}
                onClick={() => setTagBarExpanded(!tagBarExpanded)}>
                {tagBarExpanded ? '접기 ▲' : `+${allTags.length - 4} ▼`}
              </button>
            )}
          </div>
        </div>
      )}
      </div>{/* end stickyTop */}

      {/* Content */}
      <main style={styles.main}>
        {view === 'daily' && (
          <DailyScreen
            date={curDate}
            entries={filteredEntries}
            allEntries={entries}
            cycleStatus={cycleStatus}
            onAdd={() => setModal({ mode: 'add', scope: 'daily', date: formatDateKey(curDate) })}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            onDelete={(id) => setDeleteConfirm(id)}
            onMigrate={(e) => setMigrateTarget({ entry: e, type: 'migrated' })}
            onMigrateUp={(e) => setMigrateTarget({ entry: e, type: 'migrated_up' })}
            onChangePriority={changePriority}
          />
        )}

        {view === 'weekly' && (
          <WeeklyScreen
            date={curDate}
            entries={filteredEntries}
            cycleStatus={cycleStatus}
            onAdd={(dateStr) => setModal({ mode: 'add', scope: 'daily', date: dateStr })}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            setCurDate={setCurDate}
            setView={(v) => setView(v as ViewType)}
          />
        )}

        {view === 'monthly' && (
          <MonthlyScreen
            year={curY}
            month={curM}
            entries={filteredEntries}
            goals={goals}
            cycleStatus={cycleStatus}
            onAddEntry={() => setModal({ mode: 'add', scope: 'monthly', date: `${curY}-${pad(curM + 1)}` })}
            onAddGoal={() => setModal({ mode: 'add-goal', scope: 'goal', year: curY, month: curM })}
            onEditGoal={(g) => setModal({ mode: 'edit-goal', goal: g })}
            onDeleteGoal={(id) => setDeleteConfirm('goal-' + id)}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            onDayTap={(d) => { setCurDate(new Date(curY, curM, d)); setView('daily'); }}
            onToggleGoalDone={toggleGoalDone}
          />
        )}

        {view === 'annual' && (
          <AnnualScreen
            year={curY}
            goals={goals}
            entries={filteredEntries}
            onAdd={() => setModal({ mode: 'add-goal', scope: 'goal', year: curY })}
            onEdit={(g) => setModal({ mode: 'edit-goal', goal: g })}
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
            goals={goals}
            isDark={isDark}
          />
        )}
      </main>

      {/* FAB */}
      {view !== 'gantt' && view !== 'stats' && (
        <button style={styles.fab as React.CSSProperties} onClick={() => {
          if (view === 'annual') setModal({ mode: 'add-goal', scope: 'goal', year: curY });
          else setModal({ mode: 'add', scope: 'daily', date: formatDateKey(curDate) });
        }}>+</button>
      )}

      {/* Modal */}
      {modal && (
        <EntryModal
          modal={modal}
          onClose={() => setModal(null)}
          allTags={allTags}
          onSaveEntry={(data) => {
            if (modal.mode === 'edit' && modal.entry) {
              updateEntry(modal.entry.id, data);
            } else {
              addEntry(data as Entry);
            }
            setModal(null);
          }}
          onSaveGoal={(data) => {
            if (modal.mode === 'edit-goal' && modal.goal) {
              updateGoal(modal.goal.id, data);
            } else {
              addGoal(data);
            }
            setModal(null);
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <DeleteConfirm
          onCancel={() => setDeleteConfirm(null)}
          onDelete={() => {
            if (deleteConfirm.startsWith('goal-')) {
              deleteGoal(deleteConfirm.replace('goal-', ''));
            } else {
              deleteEntry(deleteConfirm);
            }
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
          onMigrateUp={(goalText, year, month) => {
            migrateUpEntry(migrateTarget.entry.id);
            addGoal({ text: goalText, year, month, done: false });
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
        />
      )}

      {/* Settings */}
      {showSettings && (
        <SettingsScreen
          onClose={() => setShowSettings(false)}
          notionConfig={config}
          onNotionConnect={connect}
          onNotionDisconnect={disconnect}
          onNotionSync={handleSyncNotion}
          syncing={syncing}
          lastError={lastError}
          tagList={tagList}
          onDeleteTag={deleteTag}
          isDark={isDark}
          darkModePref={pref}
          onDarkModeChange={setPref}
        />
      )}
    </div>
    </DarkModeProvider>
  );
}
