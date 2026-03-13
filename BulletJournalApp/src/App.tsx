import React, { useState, useCallback } from 'react';
import { styles } from './styles/theme';
import { Header } from './components/Header';
import { EntryModal } from './components/EntryModal';
import { MigrateModal } from './components/MigrateModal';
import { DeleteConfirm } from './components/DeleteConfirm';
import { DailyScreen } from './screens/DailyScreen';
import { WeeklyScreen } from './screens/WeeklyScreen';
import { MonthlyScreen } from './screens/MonthlyScreen';
import { AnnualScreen } from './screens/AnnualScreen';
import { GanttScreen } from './screens/GanttScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useEntries } from './hooks/useEntries';
import { useGoals } from './hooks/useGoals';
import { useNotionSync } from './hooks/useNotionSync';
import { formatDateKey, pad } from './utils/date';
import { ViewType, ModalState, Entry, Goal } from './types';

export default function App() {
  const [view, setView] = useState<ViewType>('daily');
  const [curDate, setCurDate] = useState(new Date());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [migrateTarget, setMigrateTarget] = useState<{ entry: Entry; type: 'migrated' | 'migrated_up' } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  const handleSyncNotion = async () => {
    const notionEntries = await syncFromNotion();
    if (notionEntries.length > 0) {
      mergeNotionEntries(notionEntries);
    }
  };

  if (!entriesLoaded || !goalsLoaded) {
    return (
      <div style={styles.loadingWrap as React.CSSProperties}>
        <div style={styles.loadingDot}>·</div>
        <p style={{ color: '#6b5d4d', fontSize: 14, marginTop: 8 }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.app as React.CSSProperties}>
      <Header
        curDate={curDate}
        view={view}
        nav={nav}
        goToday={goToday}
        onSettings={() => setShowSettings(true)}
        notionConnected={isConnected}
        syncing={syncing}
      />

      {/* View Tabs */}
      <div style={styles.tabBar as React.CSSProperties}>
        {([
          { key: 'daily' as ViewType, label: '일간' },
          { key: 'weekly' as ViewType, label: '주간' },
          { key: 'monthly' as ViewType, label: '월간' },
          { key: 'annual' as ViewType, label: '연간' },
          { key: 'gantt' as ViewType, label: '간트' },
        ]).map(t => (
          <button key={t.key}
            style={{ ...styles.tab, ...(view === t.key ? styles.tabActive : {}) }}
            onClick={() => setView(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main style={styles.main}>
        {view === 'daily' && (
          <DailyScreen
            date={curDate}
            entries={entries}
            cycleStatus={cycleStatus}
            onAdd={() => setModal({ mode: 'add', scope: 'daily', date: formatDateKey(curDate) })}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            onDelete={(id) => setDeleteConfirm(id)}
            onMigrate={(e) => setMigrateTarget({ entry: e, type: 'migrated' })}
            onMigrateUp={(e) => setMigrateTarget({ entry: e, type: 'migrated_up' })}
          />
        )}

        {view === 'weekly' && (
          <WeeklyScreen
            date={curDate}
            entries={entries}
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
            entries={entries}
            goals={goals}
            cycleStatus={cycleStatus}
            onAddEntry={() => setModal({ mode: 'add', scope: 'monthly', date: `${curY}-${pad(curM + 1)}` })}
            onAddGoal={() => setModal({ mode: 'add-goal', scope: 'goal', year: curY, month: curM })}
            onEditGoal={(g) => setModal({ mode: 'edit-goal', goal: g })}
            onDeleteGoal={(id) => setDeleteConfirm('goal-' + id)}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
            onDayTap={(d) => { setCurDate(new Date(curY, curM, d)); setView('daily'); }}
          />
        )}

        {view === 'annual' && (
          <AnnualScreen
            year={curY}
            goals={goals}
            entries={entries}
            onAdd={() => setModal({ mode: 'add-goal', scope: 'goal', year: curY })}
            onEdit={(g) => setModal({ mode: 'edit-goal', goal: g })}
            onMonthTap={(m) => { setCurDate(new Date(curY, m, 1)); setView('monthly'); }}
          />
        )}

        {view === 'gantt' && (
          <GanttScreen
            year={curY}
            month={curM}
            entries={entries}
            onEdit={(e) => setModal({ mode: 'edit', entry: e })}
          />
        )}
      </main>

      {/* FAB */}
      {view !== 'gantt' && (
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
        />
      )}
    </div>
  );
}
