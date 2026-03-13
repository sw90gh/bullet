import { useState, useEffect, useCallback, useRef } from "react";

/* ─── helpers ─── */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const pad = (n) => String(n).padStart(2, "0");
const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const today = new Date();
const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getWeekNumber(d) {
  const dt = new Date(d);
  dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const week1 = new Date(dt.getFullYear(), 0, 4);
  return 1 + Math.round(((dt - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
function getWeekDates(y, m, d) {
  const dt = new Date(y, m, d);
  const day = dt.getDay();
  const mon = new Date(dt);
  mon.setDate(dt.getDate() - ((day + 6) % 7));
  return Array.from({length:7}, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd;
  });
}
function formatDateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

/* ─── status & type configs ─── */
const STATUS = {
  todo:       { symbol: "·", label: "할 일", color: "#2c2416" },
  done:       { symbol: "×", label: "완료", color: "#4a8c3f" },
  progress:   { symbol: "/", label: "진행 중", color: "#c0883f" },
  migrated:   { symbol: ">", label: "이관 →", color: "#3a7ca5" },
  migrated_up:{ symbol: "<", label: "상위 이관", color: "#3a7ca5" },
  cancelled:  { symbol: "·", label: "취소", color: "#b8a99a", strike: true },
};
const TYPES = {
  task:  { symbol: "·", label: "할 일" },
  event: { symbol: "○", label: "일정" },
  note:  { symbol: "—", label: "메모" },
};
const PRIORITY = {
  none: { symbol: "", label: "없음" },
  important: { symbol: "★", label: "중요" },
  urgent: { symbol: "!", label: "긴급" },
};

/* ─── storage helpers ─── */
async function loadData(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
}
async function saveData(key, value) {
  try { await window.storage.set(key, JSON.stringify(value)); } catch(e) { console.error(e); }
}

/* ══════════════════════════════════════════ */
/*                MAIN APP                    */
/* ══════════════════════════════════════════ */
export default function BulletJournalApp() {
  const [view, setView] = useState("daily");
  const [entries, setEntries] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // navigation state
  const [curDate, setCurDate] = useState(new Date());
  const curY = curDate.getFullYear();
  const curM = curDate.getMonth();
  const curD = curDate.getDate();

  // modal
  const [modal, setModal] = useState(null); // {mode:'add'|'edit', entry?, scope, date?}
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  /* load */
  useEffect(() => {
    (async () => {
      const e = await loadData("bujo-entries", []);
      const g = await loadData("bujo-goals", []);
      setEntries(e);
      setGoals(g);
      setLoaded(true);
    })();
  }, []);

  /* save */
  useEffect(() => {
    if (!loaded) return;
    saveData("bujo-entries", entries);
  }, [entries, loaded]);
  useEffect(() => {
    if (!loaded) return;
    saveData("bujo-goals", goals);
  }, [goals, loaded]);

  /* entry CRUD */
  const addEntry = (entry) => setEntries(prev => [...prev, { id: uid(), createdAt: Date.now(), ...entry }]);
  const updateEntry = (id, updates) => setEntries(prev => prev.map(e => e.id === id ? {...e, ...updates} : e));
  const deleteEntry = (id) => setEntries(prev => prev.filter(e => e.id !== id));
  const addGoal = (goal) => setGoals(prev => [...prev, { id: uid(), ...goal }]);
  const updateGoal = (id, updates) => setGoals(prev => prev.map(g => g.id === id ? {...g, ...updates} : g));
  const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  /* cycle status */
  const cycleStatus = (id) => {
    const order = ["todo", "progress", "done", "migrated", "cancelled"];
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const idx = order.indexOf(e.status);
      const next = order[(idx + 1) % order.length];
      return { ...e, status: next };
    }));
  };

  /* navigation */
  const goToday = () => setCurDate(new Date());
  const nav = (dir) => {
    const d = new Date(curDate);
    if (view === "daily") d.setDate(d.getDate() + dir);
    else if (view === "weekly") d.setDate(d.getDate() + dir * 7);
    else if (view === "monthly") d.setMonth(d.getMonth() + dir);
    else if (view === "annual") d.setFullYear(d.getFullYear() + dir);
    setCurDate(d);
  };

  if (!loaded) return (
    <div style={styles.loadingWrap}>
      <div style={styles.loadingDot}>·</div>
      <p style={{color:'#6b5d4d', fontSize:14, marginTop:8}}>불러오는 중...</p>
    </div>
  );

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.logo}>B · J</h1>
          <button style={styles.todayBtn} onClick={goToday}>오늘</button>
        </div>
        <NavBar curDate={curDate} view={view} nav={nav} />
      </header>

      {/* View Tabs */}
      <div style={styles.tabBar}>
        {[
          {key:"daily", label:"일간"},
          {key:"weekly", label:"주간"},
          {key:"monthly", label:"월간"},
          {key:"annual", label:"연간"},
        ].map(t => (
          <button key={t.key}
            style={{...styles.tab, ...(view===t.key ? styles.tabActive : {})}}
            onClick={() => setView(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main style={styles.main}>
        {view === "daily" && <DailyView date={curDate} entries={entries} cycleStatus={cycleStatus}
          onAdd={() => setModal({mode:'add', scope:'daily', date: formatDateKey(curDate)})}
          onEdit={(e) => setModal({mode:'edit', entry: e})}
          onDelete={(id) => setDeleteConfirm(id)} />}

        {view === "weekly" && <WeeklyView date={curDate} entries={entries} cycleStatus={cycleStatus}
          onAdd={(dateStr) => setModal({mode:'add', scope:'daily', date: dateStr})}
          onEdit={(e) => setModal({mode:'edit', entry: e})}
          setCurDate={setCurDate} setView={setView} />}

        {view === "monthly" && <MonthlyView year={curY} month={curM} entries={entries} goals={goals}
          cycleStatus={cycleStatus}
          onAddEntry={() => setModal({mode:'add', scope:'monthly', date: `${curY}-${pad(curM+1)}`})}
          onAddGoal={() => setModal({mode:'add', scope:'goal', year: curY, month: curM})}
          onEditGoal={(g) => setModal({mode:'edit-goal', goal: g})}
          onDeleteGoal={(id) => setDeleteConfirm('goal-'+id)}
          onEdit={(e) => setModal({mode:'edit', entry: e})}
          onDayTap={(d) => { setCurDate(new Date(curY, curM, d)); setView("daily"); }} />}

        {view === "annual" && <AnnualView year={curY} goals={goals} entries={entries}
          onAdd={() => setModal({mode:'add', scope:'goal', year: curY})}
          onEdit={(g) => setModal({mode:'edit-goal', goal: g})}
          onMonthTap={(m) => { setCurDate(new Date(curY, m, 1)); setView("monthly"); }} />}
      </main>

      {/* FAB */}
      <button style={styles.fab} onClick={() => {
        if (view === "annual") setModal({mode:'add', scope:'goal', year: curY});
        else if (view === "monthly") setModal({mode:'add', scope:'daily', date: formatDateKey(curDate)});
        else setModal({mode:'add', scope:'daily', date: formatDateKey(curDate)});
      }}>+</button>

      {/* Modal */}
      {modal && <EntryModal modal={modal} onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal.mode === 'add') addEntry(data);
          else if (modal.mode === 'edit') updateEntry(modal.entry.id, data);
          else if (modal.mode === 'add' && modal.scope === 'goal') addGoal(data);
          else if (modal.mode === 'edit-goal') updateGoal(modal.goal.id, data);
          setModal(null);
        }}
        onSaveGoal={(data) => {
          if (modal.mode === 'edit-goal') updateGoal(modal.goal.id, data);
          else addGoal(data);
          setModal(null);
        }}
      />}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={styles.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p style={{fontSize:15, color:'#2c2416', marginBottom:16}}>정말 삭제할까요?</p>
            <div style={{display:'flex', gap:10}}>
              <button style={styles.confirmCancel} onClick={() => setDeleteConfirm(null)}>취소</button>
              <button style={styles.confirmDelete} onClick={() => {
                if (typeof deleteConfirm === 'string' && deleteConfirm.startsWith('goal-')) {
                  deleteGoal(deleteConfirm.replace('goal-',''));
                } else {
                  deleteEntry(deleteConfirm);
                }
                setDeleteConfirm(null);
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── NavBar ─── */
function NavBar({ curDate, view, nav }) {
  const y = curDate.getFullYear();
  const m = curDate.getMonth();
  const d = curDate.getDate();
  const dow = DAYS_KR[curDate.getDay()];

  let label = "";
  if (view === "daily") label = `${m+1}월 ${d}일 ${dow}요일`;
  else if (view === "weekly") label = `${m+1}월 ${getWeekNumber(curDate)}주차`;
  else if (view === "monthly") label = `${y}년 ${m+1}월`;
  else label = `${y}년`;

  return (
    <div style={styles.navBar}>
      <button style={styles.navBtn} onClick={() => nav(-1)}>‹</button>
      <span style={styles.navLabel}>{label}</span>
      <button style={styles.navBtn} onClick={() => nav(1)}>›</button>
    </div>
  );
}

/* ─── DAILY VIEW ─── */
function DailyView({ date, entries, cycleStatus, onAdd, onEdit, onDelete }) {
  const dateStr = formatDateKey(date);
  const dayEntries = entries.filter(e => e.date === dateStr).sort((a,b) => {
    const po = {urgent:0, important:1, none:2};
    if (po[a.priority||'none'] !== po[b.priority||'none']) return po[a.priority||'none'] - po[b.priority||'none'];
    return (a.createdAt||0) - (b.createdAt||0);
  });
  const isToday = dateStr === todayStr;

  return (
    <div>
      {isToday && <div style={styles.todayBadge}>TODAY</div>}
      {dayEntries.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{fontSize:36, marginBottom:8, opacity:0.3}}>·</div>
          <p style={{color:'#b8a99a', fontSize:14}}>기록이 없습니다</p>
          <button style={styles.emptyAdd} onClick={onAdd}>+ 새 항목 추가</button>
        </div>
      ) : (
        <div>
          {dayEntries.map(entry => (
            <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
              onEdit={() => onEdit(entry)} onDelete={() => onDelete(entry.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Entry Row ─── */
function EntryRow({ entry, cycleStatus, onEdit, onDelete }) {
  const [swiped, setSwiped] = useState(false);
  const st = STATUS[entry.status] || STATUS.todo;
  const tp = TYPES[entry.type] || TYPES.task;
  const pr = PRIORITY[entry.priority] || PRIORITY.none;
  const isStrike = st.strike || entry.status === 'done';

  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (diff < -60) setSwiped(true);
    else if (diff > 60) setSwiped(false);
    touchStart.current = null;
  };

  return (
    <div style={styles.entryOuter}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{
        ...styles.entrySwipeBg,
        opacity: swiped ? 1 : 0,
      }}>
        <button style={styles.swipeEdit} onClick={() => { onEdit(); setSwiped(false); }}>수정</button>
        <button style={styles.swipeDelete} onClick={() => { onDelete(); setSwiped(false); }}>삭제</button>
      </div>
      <div style={{
        ...styles.entryRow,
        transform: swiped ? 'translateX(-120px)' : 'translateX(0)',
        transition: 'transform 0.25s ease',
      }}
        onClick={() => !swiped && cycleStatus(entry.id)}
      >
        {/* priority */}
        {pr.symbol ? <span style={{...styles.prMark, color: entry.priority === 'urgent' ? '#c0583f' : '#c0883f'}}>{pr.symbol}</span> : null}
        {/* type symbol for event/note */}
        {entry.type === 'event' ? (
          <span style={{...styles.entrySym, color: '#c0583f', fontSize: 18}}>○</span>
        ) : entry.type === 'note' ? (
          <span style={{...styles.entrySym, color: '#6b5d4d', fontSize: 16}}>—</span>
        ) : (
          <span style={{
            ...styles.entrySym,
            color: st.color,
            textDecoration: st.strike ? 'line-through' : 'none',
            fontSize: entry.status === 'done' ? 20 : 22,
            fontWeight: 800,
          }}>{st.symbol}</span>
        )}
        <div style={{flex:1, minWidth:0}}>
          <span style={{
            ...styles.entryText,
            textDecoration: isStrike ? 'line-through' : 'none',
            color: isStrike ? '#b8a99a' : '#2c2416',
          }}>{entry.text}</span>
          {entry.time && <span style={styles.timeTag}>{entry.time}</span>}
        </div>
        <span style={{...styles.statusBadge, background: st.color + '18', color: st.color}}>
          {st.label}
        </span>
      </div>
    </div>
  );
}

/* ─── WEEKLY VIEW ─── */
function WeeklyView({ date, entries, cycleStatus, onAdd, onEdit, setCurDate, setView }) {
  const weekDates = getWeekDates(date.getFullYear(), date.getMonth(), date.getDate());

  return (
    <div>
      {weekDates.map(wd => {
        const dateStr = formatDateKey(wd);
        const dayEntries = entries.filter(e => e.date === dateStr).sort((a,b) => (a.createdAt||0)-(b.createdAt||0));
        const isT = dateStr === todayStr;
        const isWeekend = wd.getDay() === 0 || wd.getDay() === 6;

        return (
          <div key={dateStr} style={{...styles.weekDay, ...(isT ? styles.weekDayToday : {})}}>
            <div style={styles.weekDayHeader}
              onClick={() => { setCurDate(wd); setView("daily"); }}>
              <span style={{
                ...styles.weekDayName,
                color: isWeekend ? '#c0583f' : '#2c2416',
              }}>{DAYS_KR[wd.getDay()]}</span>
              <span style={{
                ...styles.weekDayNum,
                ...(isT ? styles.weekDayNumToday : {}),
              }}>{wd.getDate()}</span>
              <div style={{flex:1}} />
              <button style={styles.weekAddBtn} onClick={(e) => { e.stopPropagation(); onAdd(dateStr); }}>+</button>
            </div>
            {dayEntries.length === 0 ? (
              <p style={{fontSize:12, color:'#ccc4b8', padding:'4px 0 0 28px', fontStyle:'italic'}}>비어 있음</p>
            ) : (
              dayEntries.map(entry => {
                const st = STATUS[entry.status] || STATUS.todo;
                const pr = PRIORITY[entry.priority] || PRIORITY.none;
                const isStrike = st.strike || entry.status === 'done';
                return (
                  <div key={entry.id} style={styles.weekEntry} onClick={() => cycleStatus(entry.id)}>
                    {pr.symbol ? <span style={{color:'#c0583f', fontSize:11, marginRight:2}}>{pr.symbol}</span> : null}
                    {entry.type === 'event' ? (
                      <span style={{color:'#c0583f', fontSize:12, marginRight:6}}>○</span>
                    ) : (
                      <span style={{color: st.color, fontSize:14, fontWeight:800, marginRight:6,
                        textDecoration: st.strike ? 'line-through' : 'none'}}>{st.symbol}</span>
                    )}
                    <span style={{
                      fontSize:13, color: isStrike ? '#b8a99a' : '#3d3427',
                      textDecoration: isStrike ? 'line-through' : 'none',
                      flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    }}>{entry.text}</span>
                    {entry.time && <span style={{fontSize:11, color:'#b8a99a', marginLeft:4}}>{entry.time}</span>}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── MONTHLY VIEW ─── */
function MonthlyView({ year, month, entries, goals, cycleStatus, onAddEntry, onEdit, onDayTap, onAddGoal, onEditGoal, onDeleteGoal }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${pad(month+1)}`;
  const monthEntries = entries.filter(e => e.date && e.date.startsWith(monthKey));
  const monthGoals = goals.filter(g => (g.year === year && (g.month === month || g.month === undefined || g.month === null)));

  // calendar grid
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Mini Calendar */}
      <div style={styles.miniCal}>
        <div style={styles.miniCalHeader}>
          {["일","월","화","수","목","금","토"].map(d => (
            <div key={d} style={{...styles.miniCalDow, color: d==="일"||d==="토" ? '#c0583f' : '#6b5d4d'}}>{d}</div>
          ))}
        </div>
        <div style={styles.miniCalGrid}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={styles.miniCalCell} />;
            const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
            const hasEntries = monthEntries.some(e => e.date === dateStr);
            const isT = dateStr === todayStr;
            return (
              <div key={i} style={{...styles.miniCalCell, cursor:'pointer'}} onClick={() => onDayTap(d)}>
                <span style={{
                  ...styles.miniCalNum,
                  ...(isT ? styles.miniCalToday : {}),
                }}>{d}</span>
                {hasEntries && <div style={styles.miniCalDot} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Tasks */}
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>이번 달 할 일</span>
        <button style={styles.sectionAdd} onClick={onAddEntry}>+</button>
      </div>
      {monthEntries.length === 0 ? (
        <p style={{fontSize:13, color:'#b8a99a', textAlign:'center', padding:20}}>등록된 항목이 없습니다</p>
      ) : (
        monthEntries.slice(0, 20).map(entry => (
          <EntryRow key={entry.id} entry={entry} cycleStatus={cycleStatus}
            onEdit={() => onEdit(entry)} onDelete={() => {}} />
        ))
      )}

      {/* Monthly Goals */}
      <div style={{...styles.sectionHeader, marginTop: 20}}>
        <span style={styles.sectionTitle}>월간 목표</span>
        <button style={styles.sectionAdd} onClick={onAddGoal}>+</button>
      </div>
      {monthGoals.filter(g => g.month === month).map(g => (
        <div key={g.id} style={styles.goalRow} onClick={() => onEditGoal(g)}>
          <span style={{fontSize:15, color: g.done ? '#4a8c3f' : '#2c2416', marginRight:8,
            fontWeight:700}}>{g.done ? '×' : '·'}</span>
          <span style={{fontSize:14, color: g.done ? '#b8a99a' : '#3d3427', flex:1,
            textDecoration: g.done ? 'line-through' : 'none'}}>{g.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── ANNUAL VIEW ─── */
function AnnualView({ year, goals, entries, onAdd, onEdit, onMonthTap }) {
  const yearGoals = goals.filter(g => g.year === year && (g.month === undefined || g.month === null));

  return (
    <div>
      {/* Year Goals */}
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>{year}년 핵심 목표</span>
        <button style={styles.sectionAdd} onClick={onAdd}>+</button>
      </div>
      {yearGoals.length === 0 ? (
        <p style={{fontSize:13, color:'#b8a99a', textAlign:'center', padding:16}}>연간 목표를 추가해보세요</p>
      ) : (
        yearGoals.map(g => (
          <div key={g.id} style={styles.goalRow} onClick={() => onEdit(g)}>
            <span style={{fontSize:15, color: g.done ? '#4a8c3f' : '#2c2416', marginRight:8, fontWeight:700}}>
              {g.done ? '×' : '·'}
            </span>
            <span style={{fontSize:14, color: g.done ? '#b8a99a' : '#3d3427', flex:1,
              textDecoration: g.done ? 'line-through' : 'none'}}>{g.text}</span>
          </div>
        ))
      )}

      {/* 12 Month Grid */}
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>월별 요약</span>
      </div>
      <div style={styles.monthGrid}>
        {Array.from({length:12}, (_, m) => {
          const mk = `${year}-${pad(m+1)}`;
          const count = entries.filter(e => e.date && e.date.startsWith(mk)).length;
          const doneCount = entries.filter(e => e.date && e.date.startsWith(mk) && e.status === 'done').length;
          const monthGoalCount = goals.filter(g => g.year === year && g.month === m).length;
          const isCur = year === today.getFullYear() && m === today.getMonth();

          return (
            <div key={m} style={{...styles.monthCard, ...(isCur ? styles.monthCardCur : {})}}
              onClick={() => onMonthTap(m)}>
              <div style={styles.monthCardName}>{MONTHS_KR[m]}</div>
              {count > 0 ? (
                <div style={{fontSize:11, color:'#6b5d4d'}}>
                  <span style={{color:'#4a8c3f'}}>{doneCount}</span>/{count} 완료
                </div>
              ) : (
                <div style={{fontSize:11, color:'#ccc4b8'}}>—</div>
              )}
              {monthGoalCount > 0 && (
                <div style={{fontSize:10, color:'#3a7ca5', marginTop:2}}>목표 {monthGoalCount}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ENTRY MODAL ─── */
function EntryModal({ modal, onClose, onSave, onSaveGoal }) {
  const isGoal = modal.scope === 'goal' || modal.mode === 'edit-goal';
  const existing = modal.entry || modal.goal;
  
  const [text, setText] = useState(existing?.text || "");
  const [type, setType] = useState(existing?.type || "task");
  const [status, setStatus] = useState(existing?.status || "todo");
  const [priority, setPriority] = useState(existing?.priority || "none");
  const [date, setDate] = useState(existing?.date || modal.date || todayStr);
  const [time, setTime] = useState(existing?.time || "");
  const [done, setDone] = useState(existing?.done || false);
  const [month, setMonth] = useState(existing?.month ?? (modal.month ?? null));

  const handleSave = () => {
    if (!text.trim()) return;
    if (isGoal) {
      onSaveGoal({ text: text.trim(), year: modal.year || existing?.year || today.getFullYear(), month, done });
    } else {
      onSave({ text: text.trim(), type, status, priority, date, time: time || undefined });
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            {isGoal ? (modal.mode === 'edit-goal' ? '목표 수정' : '목표 추가')
              : (modal.mode === 'edit' ? '항목 수정' : '새 항목')}
          </h3>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          <input style={styles.input} placeholder={isGoal ? "목표를 입력하세요" : "내용을 입력하세요"}
            value={text} onChange={e => setText(e.target.value)}
            autoFocus />

          {isGoal ? (
            <>
              <label style={styles.fieldLabel}>범위</label>
              <div style={styles.chipRow}>
                <button style={{...styles.chip, ...(month === null ? styles.chipActive : {})}}
                  onClick={() => setMonth(null)}>연간</button>
                {MONTHS_KR.map((ml, i) => (
                  <button key={i} style={{...styles.chip, ...(month === i ? styles.chipActive : {})}}
                    onClick={() => setMonth(i)}>{ml}</button>
                ))}
              </div>
              <label style={styles.fieldLabel}>상태</label>
              <div style={styles.chipRow}>
                <button style={{...styles.chip, ...(!done ? styles.chipActive : {})}}
                  onClick={() => setDone(false)}>진행 중</button>
                <button style={{...styles.chip, ...(done ? {...styles.chipActive, background:'#4a8c3f'} : {})}}
                  onClick={() => setDone(true)}>완료</button>
              </div>
            </>
          ) : (
            <>
              <label style={styles.fieldLabel}>유형</label>
              <div style={styles.chipRow}>
                {Object.entries(TYPES).map(([k, v]) => (
                  <button key={k} style={{...styles.chip, ...(type===k ? styles.chipActive : {})}}
                    onClick={() => setType(k)}>
                    <span style={{marginRight:4}}>{v.symbol}</span>{v.label}
                  </button>
                ))}
              </div>

              <label style={styles.fieldLabel}>상태</label>
              <div style={styles.chipRow}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <button key={k} style={{...styles.chip, ...(status===k ? {...styles.chipActive, background: v.color} : {})}}
                    onClick={() => setStatus(k)}>
                    <span style={{marginRight:3}}>{v.symbol}</span>{v.label}
                  </button>
                ))}
              </div>

              <label style={styles.fieldLabel}>우선순위</label>
              <div style={styles.chipRow}>
                {Object.entries(PRIORITY).map(([k, v]) => (
                  <button key={k} style={{...styles.chip, ...(priority===k ? styles.chipActive : {})}}
                    onClick={() => setPriority(k)}>
                    {v.symbol ? <span style={{marginRight:3}}>{v.symbol}</span> : null}{v.label}
                  </button>
                ))}
              </div>

              <div style={{display:'flex', gap:10, marginTop:4}}>
                <div style={{flex:1}}>
                  <label style={styles.fieldLabel}>날짜</label>
                  <input type="date" style={styles.input} value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div style={{flex:1}}>
                  <label style={styles.fieldLabel}>시간 (선택)</label>
                  <input type="time" style={styles.input} value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>
            </>
          )}
        </div>

        <button style={styles.saveBtn} onClick={handleSave}>
          {modal.mode === 'edit' || modal.mode === 'edit-goal' ? '수정 완료' : '추가'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ */
/*                 STYLES                     */
/* ══════════════════════════════════════════ */
const styles = {
  app: {
    maxWidth: 430,
    margin: '0 auto',
    minHeight: '100vh',
    background: '#faf6f0',
    fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
    position: 'relative',
    paddingBottom: 80,
  },
  loadingWrap: {
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    height:'100vh', background:'#faf6f0',
  },
  loadingDot: { fontSize:48, fontWeight:800, color:'#2c2416', animation:'pulse 1.5s infinite' },

  /* header */
  header: {
    background: '#2c2416',
    padding: '14px 20px 0',
    borderRadius: '0 0 20px 20px',
  },
  headerTop: {
    display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8,
  },
  logo: {
    fontSize: 22, fontWeight: 700, color: '#faf6f0', letterSpacing: 4,
    fontFamily: 'Georgia, serif',
  },
  todayBtn: {
    background: 'rgba(250,246,240,0.15)', border:'1px solid rgba(250,246,240,0.25)',
    color:'#faf6f0', fontSize:12, padding:'5px 14px', borderRadius:14,
    fontFamily:'-apple-system, sans-serif', cursor:'pointer',
  },
  navBar: {
    display:'flex', alignItems:'center', justifyContent:'center', gap:16, padding:'10px 0 14px',
  },
  navBtn: {
    background:'none', border:'none', color:'rgba(250,246,240,0.7)',
    fontSize:28, cursor:'pointer', padding:'0 8px', fontWeight:300,
    lineHeight:1,
  },
  navLabel: {
    color:'#faf6f0', fontSize:17, fontWeight:600, minWidth:150, textAlign:'center',
  },

  /* tabs */
  tabBar: {
    display:'flex', padding:'12px 16px 4px', gap:6,
  },
  tab: {
    flex:1, padding:'9px 0', borderRadius:10,
    background:'transparent', border:'1.5px solid #ddd5c9',
    fontSize:13, fontWeight:500, color:'#6b5d4d',
    cursor:'pointer', fontFamily:'-apple-system, "Noto Sans KR", sans-serif',
    transition:'all 0.2s',
  },
  tabActive: {
    background:'#2c2416', borderColor:'#2c2416', color:'#faf6f0',
  },

  /* main */
  main: { padding:'12px 16px' },

  /* today badge */
  todayBadge: {
    display:'inline-block', background:'#c0583f', color:'white',
    fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:8,
    letterSpacing:1.5, marginBottom:12,
  },

  /* empty state */
  emptyState: {
    textAlign:'center', padding:'48px 20px',
  },
  emptyAdd: {
    marginTop:16, background:'none', border:'1.5px dashed #ccc4b8',
    color:'#6b5d4d', fontSize:13, padding:'8px 20px', borderRadius:10,
    cursor:'pointer', fontFamily:'-apple-system, sans-serif',
  },

  /* entry row */
  entryOuter: {
    position:'relative', overflow:'hidden', borderRadius:12, marginBottom:6,
  },
  entrySwipeBg: {
    position:'absolute', right:0, top:0, bottom:0, width:120,
    display:'flex', transition:'opacity 0.2s',
  },
  swipeEdit: {
    flex:1, background:'#3a7ca5', color:'white', border:'none', fontSize:13,
    fontWeight:600, cursor:'pointer', fontFamily:'-apple-system, sans-serif',
  },
  swipeDelete: {
    flex:1, background:'#c0583f', color:'white', border:'none', fontSize:13,
    fontWeight:600, cursor:'pointer', fontFamily:'-apple-system, sans-serif',
  },
  entryRow: {
    display:'flex', alignItems:'center', gap:8,
    background:'white', padding:'12px 14px', borderRadius:12,
    boxShadow:'0 1px 3px rgba(44,36,22,0.06)',
    cursor:'pointer', position:'relative', zIndex:1,
  },
  prMark: { fontSize:14, fontWeight:700, flexShrink:0 },
  entrySym: { fontSize:22, fontWeight:800, width:20, textAlign:'center', flexShrink:0, lineHeight:1 },
  entryText: { fontSize:14, lineHeight:1.5 },
  timeTag: {
    display:'inline-block', fontSize:11, color:'#b8a99a', marginLeft:6,
    background:'#f5f0e8', padding:'1px 6px', borderRadius:4,
  },
  statusBadge: {
    fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:6,
    whiteSpace:'nowrap', flexShrink:0,
  },

  /* weekly */
  weekDay: {
    marginBottom:4, background:'white', borderRadius:12,
    padding:'10px 14px', boxShadow:'0 1px 3px rgba(44,36,22,0.05)',
  },
  weekDayToday: { borderLeft:'3px solid #c0583f' },
  weekDayHeader: {
    display:'flex', alignItems:'center', gap:8, marginBottom:4, cursor:'pointer',
  },
  weekDayName: { fontSize:14, fontWeight:700 },
  weekDayNum: {
    fontSize:13, color:'#6b5d4d', fontWeight:500,
  },
  weekDayNumToday: {
    background:'#c0583f', color:'white', borderRadius:'50%',
    width:22, height:22, display:'inline-flex', alignItems:'center',
    justifyContent:'center', fontSize:12, fontWeight:700,
  },
  weekAddBtn: {
    background:'none', border:'1px solid #ddd5c9', color:'#b8a99a',
    width:24, height:24, borderRadius:'50%', fontSize:16, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1,
    fontFamily:'-apple-system, sans-serif',
  },
  weekEntry: {
    display:'flex', alignItems:'center', padding:'3px 0 3px 28px', cursor:'pointer',
  },

  /* monthly */
  miniCal: {
    background:'white', borderRadius:14, padding:14,
    boxShadow:'0 1px 4px rgba(44,36,22,0.06)', marginBottom:16,
  },
  miniCalHeader: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center', marginBottom:6 },
  miniCalDow: { fontSize:11, fontWeight:600 },
  miniCalGrid: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 },
  miniCalCell: { textAlign:'center', padding:'6px 0', position:'relative' },
  miniCalNum: { fontSize:13, color:'#3d3427' },
  miniCalToday: {
    background:'#c0583f', color:'white', borderRadius:'50%',
    width:26, height:26, display:'inline-flex', alignItems:'center',
    justifyContent:'center', fontWeight:700,
  },
  miniCalDot: {
    width:4, height:4, borderRadius:'50%', background:'#3a7ca5',
    margin:'2px auto 0',
  },

  /* sections */
  sectionHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    marginBottom:10, marginTop:8,
  },
  sectionTitle: { fontSize:15, fontWeight:700, color:'#2c2416' },
  sectionAdd: {
    background:'#2c2416', color:'#faf6f0', border:'none',
    width:28, height:28, borderRadius:'50%', fontSize:18,
    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:'-apple-system, sans-serif', lineHeight:1,
  },

  /* goal row */
  goalRow: {
    display:'flex', alignItems:'center', padding:'10px 14px',
    background:'white', borderRadius:10, marginBottom:4,
    boxShadow:'0 1px 2px rgba(44,36,22,0.04)', cursor:'pointer',
  },

  /* annual month grid */
  monthGrid: {
    display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8,
  },
  monthCard: {
    background:'white', borderRadius:12, padding:'14px 12px',
    textAlign:'center', boxShadow:'0 1px 3px rgba(44,36,22,0.05)',
    cursor:'pointer', transition:'transform 0.15s',
    border:'1.5px solid transparent',
  },
  monthCardCur: { borderColor:'#c0583f' },
  monthCardName: { fontSize:14, fontWeight:700, color:'#2c2416', marginBottom:4 },

  /* fab */
  fab: {
    position:'fixed', bottom:24, right:'calc(50% - 195px)',
    width:52, height:52, borderRadius:'50%',
    background:'#2c2416', color:'#faf6f0', fontSize:28,
    border:'none', boxShadow:'0 4px 14px rgba(44,36,22,0.3)',
    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:'-apple-system, sans-serif', lineHeight:1, zIndex:50,
  },

  /* overlay & modal */
  overlay: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
    zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center',
  },
  modal: {
    background:'#faf6f0', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:430,
    maxHeight:'85vh', overflow:'auto',
    padding:'0 20px 24px',
  },
  modalHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'18px 0 12px', borderBottom:'1px solid #ebe5dc',
    position:'sticky', top:0, background:'#faf6f0', zIndex:1,
  },
  modalTitle: { fontSize:17, fontWeight:700, color:'#2c2416' },
  modalClose: {
    background:'none', border:'none', fontSize:18, color:'#b8a99a',
    cursor:'pointer', padding:4,
  },
  modalBody: { padding:'16px 0' },
  fieldLabel: {
    display:'block', fontSize:12, fontWeight:600, color:'#6b5d4d',
    marginTop:14, marginBottom:6,
  },
  input: {
    width:'100%', padding:'10px 14px', borderRadius:10,
    border:'1.5px solid #ddd5c9', background:'white',
    fontSize:15, color:'#2c2416', outline:'none',
    fontFamily:'-apple-system, "Noto Sans KR", sans-serif',
  },
  chipRow: {
    display:'flex', gap:6, flexWrap:'wrap',
  },
  chip: {
    padding:'6px 12px', borderRadius:8,
    border:'1.5px solid #ddd5c9', background:'white',
    fontSize:12, color:'#6b5d4d', cursor:'pointer',
    fontFamily:'-apple-system, "Noto Sans KR", sans-serif',
    transition:'all 0.15s',
  },
  chipActive: {
    background:'#2c2416', borderColor:'#2c2416', color:'#faf6f0',
  },
  saveBtn: {
    width:'100%', padding:'14px', borderRadius:12,
    background:'#2c2416', color:'#faf6f0', border:'none',
    fontSize:15, fontWeight:600, cursor:'pointer',
    fontFamily:'-apple-system, "Noto Sans KR", sans-serif',
  },

  /* confirm dialog */
  confirmBox: {
    background:'white', borderRadius:16, padding:24,
    textAlign:'center', boxShadow:'0 8px 30px rgba(0,0,0,0.2)',
  },
  confirmCancel: {
    flex:1, padding:'10px 20px', borderRadius:10,
    border:'1.5px solid #ddd5c9', background:'white',
    fontSize:14, color:'#6b5d4d', cursor:'pointer',
    fontFamily:'-apple-system, sans-serif',
  },
  confirmDelete: {
    flex:1, padding:'10px 20px', borderRadius:10,
    border:'none', background:'#c0583f', color:'white',
    fontSize:14, fontWeight:600, cursor:'pointer',
    fontFamily:'-apple-system, sans-serif',
  },
};
