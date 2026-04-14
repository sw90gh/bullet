import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { PRIORITY, STATUS } from '../utils/constants';
import { Entry, EntryPriority } from '../types';
import { hasPin, setPin, verifyPin, removePin, isSessionUnlocked, unlockSession, lockSession, getLockedFolders, toggleFolderLock, isFolderLocked } from '../utils/notePin';

interface NotesScreenProps {
  entries: Entry[];
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  cycleStatus: (id: string) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  onUpdateEntry?: (id: string, updates: Partial<Entry>) => void;
  onPopupChange?: (open: boolean) => void;
}

export function NotesScreen({ entries, onAdd, onEdit, onDelete, cycleStatus, onChangePriority, onUpdateEntry, onPopupChange }: NotesScreenProps) {
  const { styles, C, statusColor } = useTheme();
  const [search, setSearch] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>('전체');
  const [pinPopup, setPinPopup] = useState<{ mode: 'verify' | 'set' | 'change'; onSuccess?: () => void } | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [sessionUnlocked, setSessionUnlocked] = useState(isSessionUnlocked());
  const [lockedFolders, setLockedFolders] = useState(getLockedFolders());
  const [folderManage, setFolderManage] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const hasPopup = viewingId !== null || pinPopup !== null || folderManage;
  useEffect(() => { onPopupChange?.(hasPopup); }, [hasPopup, onPopupChange]);

  const allNotes = useMemo(() =>
    entries.filter(e => e.type === 'note').sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)),
    [entries],
  );

  // Unique folder list
  const folders = useMemo(() => {
    const set = new Set<string>();
    allNotes.forEach(e => { if (e.folder) set.add(e.folder); });
    return ['전체', ...Array.from(set).sort()];
  }, [allNotes]);

  // Filtered notes
  const notes = useMemo(() => {
    let list = allNotes;
    if (activeFolder !== '전체') list = list.filter(e => (e.folder || '') === activeFolder);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        e.text.toLowerCase().includes(q)
        || (e.memo && e.memo.toLowerCase().includes(q))
        || (e.tags && e.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [allNotes, activeFolder, search]);

  const viewingEntry = viewingId ? entries.find(e => e.id === viewingId) : null;

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of notes) {
      const key = e.date || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [notes]);

  const fmtDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  // Check if a note is effectively locked
  const isNoteLocked = useCallback((entry: Entry): boolean => {
    if (sessionUnlocked) return false;
    if (entry.locked) return true;
    if (entry.folder && isFolderLocked(entry.folder)) return true;
    return false;
  }, [sessionUnlocked]);

  // Try to view a note — check lock
  const tryView = useCallback((entry: Entry) => {
    if (isNoteLocked(entry)) {
      if (!hasPin()) {
        setPinPopup({ mode: 'set', onSuccess: () => setViewingId(entry.id) });
      } else {
        setPinPopup({ mode: 'verify', onSuccess: () => { unlockSession(); setSessionUnlocked(true); setViewingId(entry.id); } });
      }
    } else {
      setViewingId(entry.id);
    }
  }, [isNoteLocked]);

  // Try to enter a locked folder
  const tryFolder = useCallback((folder: string) => {
    if (folder !== '전체' && isFolderLocked(folder) && !sessionUnlocked) {
      if (!hasPin()) {
        setPinPopup({ mode: 'set', onSuccess: () => { unlockSession(); setSessionUnlocked(true); setActiveFolder(folder); } });
      } else {
        setPinPopup({ mode: 'verify', onSuccess: () => { unlockSession(); setSessionUnlocked(true); setActiveFolder(folder); } });
      }
    } else {
      setActiveFolder(folder);
    }
  }, [sessionUnlocked]);

  // PIN submit
  const handlePinSubmit = useCallback(async () => {
    if (!pinPopup) return;
    setPinError('');
    if (pinPopup.mode === 'verify') {
      if (pinInput.length < 4) { setPinError('4자리 이상 입력하세요'); return; }
      const ok = await verifyPin(pinInput);
      if (ok) {
        pinPopup.onSuccess?.();
        setPinPopup(null); setPinInput('');
      } else {
        setPinError('PIN이 일치하지 않습니다');
      }
    } else if (pinPopup.mode === 'set' || pinPopup.mode === 'change') {
      if (pinInput.length < 4) { setPinError('4자리 이상 입력하세요'); return; }
      if (pinInput !== pinConfirm) { setPinError('PIN이 일치하지 않습니다'); return; }
      await setPin(pinInput);
      unlockSession(); setSessionUnlocked(true);
      pinPopup.onSuccess?.();
      setPinPopup(null); setPinInput(''); setPinConfirm('');
    }
  }, [pinPopup, pinInput, pinConfirm]);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    ...styles.chip, ...(active ? styles.chipActive : {}),
    padding: '4px 10px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0,
  });

  return (
    <div>
      {/* 헤더 */}
      <div style={{ ...styles.sectionHeader as React.CSSProperties, marginTop: 0 }}>
        <span style={styles.sectionTitle}>메모 모아보기</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>{notes.length}개</span>
          {hasPin() && (
            <button style={{
              background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', padding: '2px 4px',
              color: sessionUnlocked ? C.green : C.textMuted,
            }} onClick={() => {
              if (sessionUnlocked) { lockSession(); setSessionUnlocked(false); }
              else setPinPopup({ mode: 'verify', onSuccess: () => { unlockSession(); setSessionUnlocked(true); } });
            }}>{sessionUnlocked ? '🔓' : '🔒'}</button>
          )}
          <button style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
            fontSize: 10, color: C.textSecondary, cursor: 'pointer', padding: '3px 6px',
            fontFamily: '-apple-system, sans-serif',
          }} onClick={() => setFolderManage(true)}>폴더 관리</button>
        </div>
      </div>

      {/* 폴더 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {folders.map(f => (
          <button key={f} style={chipStyle(activeFolder === f)}
            onClick={() => tryFolder(f)}>
            {f !== '전체' && isFolderLocked(f) && !sessionUnlocked ? '🔒 ' : ''}{f}
          </button>
        ))}
      </div>

      {/* 검색 + 추가 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          style={{ ...styles.input, flex: 1, padding: '6px 12px', fontSize: 12, height: 32, lineHeight: '32px' }}
          placeholder="메모 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button style={{ ...styles.chip, ...styles.chipActive, padding: '6px 14px', fontSize: 12, flexShrink: 0 }}
          onClick={onAdd}>+ 새 메모</button>
      </div>

      {notes.length === 0 ? (
        <div style={styles.emptyState as React.CSSProperties}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>—</div>
          <p style={{ color: C.textMuted, fontSize: 14 }}>{search ? '검색 결과가 없습니다' : '메모가 없습니다'}</p>
          {!search && <button style={styles.emptyAdd} onClick={onAdd}>+ 새 메모 추가</button>}
        </div>
      ) : (
        grouped.map(([dateKey, dateNotes]) => (
          <div key={dateKey} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4, padding: '0 2px' }}>
              {dateKey.replace(/-/g, '.')}
            </div>
            {dateNotes.map(entry => {
              const locked = isNoteLocked(entry);
              const maskedEntry = locked ? { ...entry, text: '🔒 잠긴 메모' } : entry;
              return (
                <div key={entry.id} style={{ marginBottom: 4 }}>
                  {locked ? (
                    /* 잠긴 메모: 마스킹된 행, 스와이프 없음 */
                    <div style={{
                      padding: '10px 8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      borderBottom: `1px solid ${C.borderLight}`,
                    }} onClick={() => tryView(entry)}>
                      <span style={{ fontSize: 14 }}>🔒</span>
                      <span style={{ fontSize: 13, color: C.textMuted, fontStyle: 'italic', flex: 1 }}>잠긴 메모</span>
                      {entry.folder && <span style={{ fontSize: 9, color: C.textLight, background: `${C.border}40`, padding: '1px 5px', borderRadius: 4 }}>{entry.folder}</span>}
                    </div>
                  ) : (
                    <>
                    <EntryRow
                      entry={entry}
                      cycleStatus={cycleStatus}
                      onEdit={() => tryView(entry)}
                      onDelete={() => onDelete(entry.id)}
                      onChangePriority={onChangePriority}
                    />
                    {/* 본문 미리보기 */}
                    {entry.memo && (
                      <div style={{
                        fontSize: 11, color: C.textMuted, lineHeight: 1.4,
                        padding: '0 8px 4px', cursor: 'pointer',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                      } as React.CSSProperties}
                        onClick={() => tryView(entry)}
                      >{entry.memo}</div>
                    )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
      <div style={{ height: 70 }} />

      {/* 메모 뷰어 */}
      {viewingEntry && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setViewingId(null)}>
          <div style={{
            background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430,
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '14px 20px 10px', borderBottom: `1px solid ${C.borderLight}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {viewingEntry.text}
                  </h3>
                  {/* 잠금 토글 */}
                  {onUpdateEntry && (
                    <button style={{
                      background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: '2px 4px',
                      color: viewingEntry.locked ? C.amber : C.textMuted, flexShrink: 0,
                    }} onClick={() => {
                      if (!hasPin()) {
                        setPinPopup({ mode: 'set', onSuccess: () => onUpdateEntry(viewingEntry.id, { locked: !viewingEntry.locked }) });
                      } else {
                        onUpdateEntry(viewingEntry.id, { locked: !viewingEntry.locked });
                      }
                    }}>{viewingEntry.locked ? '🔒' : '🔓'}</button>
                  )}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>등록 {fmtDate(viewingEntry.createdAt)}</span>
                  {viewingEntry.updatedAt && <span>수정 {fmtDate(viewingEntry.updatedAt)}</span>}
                  {viewingEntry.folder && <span>폴더: {viewingEntry.folder}</span>}
                </div>
              </div>
              <button style={{
                background: 'none', border: 'none', fontSize: 18, color: C.textMuted,
                cursor: 'pointer', padding: '4px 8px', flexShrink: 0,
              }} onClick={() => setViewingId(null)}>✕</button>
            </div>

            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px 20px',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}>
              {viewingEntry.memo ? (
                <div style={{
                  fontSize: 14, color: C.textPrimary, lineHeight: 1.8,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{viewingEntry.memo}</div>
              ) : (
                <p style={{ fontSize: 13, color: C.textMuted, fontStyle: 'italic' }}>내용이 없습니다</p>
              )}
              {viewingEntry.tags && viewingEntry.tags.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {viewingEntry.tags.map((tag, i) => (
                    <span key={i} style={{
                      fontSize: 11, color: C.blue, background: `${C.blue}10`,
                      padding: '2px 8px', borderRadius: 6, marginRight: 4,
                    }}>#{tag}</span>
                  ))}
                </div>
              )}
              {viewingEntry.priority && viewingEntry.priority !== 'none' && (
                <div style={{ marginTop: 8, fontSize: 11, color: C.textSecondary }}>
                  우선순위: {PRIORITY[viewingEntry.priority]?.symbol} {PRIORITY[viewingEntry.priority]?.label}
                </div>
              )}
              {viewingEntry.linkedNoteIds && viewingEntry.linkedNoteIds.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>연결된 항목</div>
                  {viewingEntry.linkedNoteIds.map(id => {
                    const linked = entries.find(e => e.id === id);
                    if (!linked) return null;
                    const st = STATUS[linked.status] || STATUS.todo;
                    const symbol = linked.type === 'event' ? '○'
                      : linked.type === 'goal-yearly' ? '◎'
                      : st.symbol;
                    const color = linked.type === 'event' ? C.accent
                      : linked.type === 'goal-yearly' ? C.blue
                      : statusColor(linked.status);
                    return (
                      <div key={id} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 8px', marginBottom: 2, borderRadius: 6,
                        background: `${C.blue}06`, border: `1px solid ${C.blue}15`,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color, width: 18, textAlign: 'center' }}>{symbol}</span>
                        <span style={{
                          fontSize: 12, color: C.textPrimary, flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{linked.text}</span>
                        {linked.date && (
                          <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>{linked.date.slice(5)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{
              padding: '12px 20px', paddingBottom: 'env(safe-area-inset-bottom, 12px)',
              borderTop: `1px solid ${C.borderLight}`, flexShrink: 0, display: 'flex', gap: 8,
            }}>
              <button style={{
                flex: 1, padding: 12, borderRadius: 10, background: C.primary, color: C.headerText,
                border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
              }} onClick={() => { const e = viewingEntry; setViewingId(null); onEdit(e); }}>수정</button>
              <button style={{
                padding: 12, borderRadius: 10, border: `1.5px solid ${C.accent}`, background: 'transparent',
                color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
              }} onClick={() => {
                if (confirm('이 메모를 삭제하시겠습니까?')) { onDelete(viewingEntry.id); setViewingId(null); }
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN 입력 팝업 */}
      {pinPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setPinPopup(null); setPinInput(''); setPinConfirm(''); setPinError(''); }}>
          <div style={{
            background: C.bg, borderRadius: 16, padding: 24, width: 280,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 16px', textAlign: 'center' }}>
              {pinPopup.mode === 'set' ? 'PIN 설정' : pinPopup.mode === 'change' ? 'PIN 변경' : 'PIN 입력'}
            </h3>
            <input
              type="password" inputMode="numeric" maxLength={8} autoFocus
              style={{ ...styles.input, width: '100%', padding: '10px 14px', fontSize: 20, textAlign: 'center', letterSpacing: 8, boxSizing: 'border-box' }}
              placeholder="••••"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handlePinSubmit(); }}
            />
            {(pinPopup.mode === 'set' || pinPopup.mode === 'change') && (
              <input
                type="password" inputMode="numeric" maxLength={8}
                style={{ ...styles.input, width: '100%', padding: '10px 14px', fontSize: 20, textAlign: 'center', letterSpacing: 8, marginTop: 8, boxSizing: 'border-box' }}
                placeholder="확인"
                value={pinConfirm}
                onChange={e => { setPinConfirm(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handlePinSubmit(); }}
              />
            )}
            {pinError && <p style={{ fontSize: 12, color: C.accent, textAlign: 'center', margin: '8px 0 0' }}>{pinError}</p>}
            <button style={{
              width: '100%', marginTop: 12, padding: 12, borderRadius: 10,
              background: C.primary, color: C.headerText, border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
            }} onClick={handlePinSubmit}>확인</button>
          </div>
        </div>
      )}

      {/* 폴더 관리 팝업 */}
      {folderManage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setFolderManage(false)}>
          <div style={{
            background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430,
            maxHeight: '60vh', overflow: 'auto', padding: '0 20px 24px',
            paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '14px 0 10px', borderBottom: `1px solid ${C.borderLight}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>폴더 관리</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {hasPin() && (
                  <button style={{
                    background: 'none', border: `1px solid ${C.accent}60`, borderRadius: 6,
                    fontSize: 10, color: C.accent, cursor: 'pointer', padding: '3px 8px',
                    fontFamily: '-apple-system, sans-serif',
                  }} onClick={() => {
                    if (confirm('PIN을 초기화하면 모든 잠금이 해제됩니다.')) {
                      removePin(); setSessionUnlocked(false); setLockedFolders([]);
                    }
                  }}>PIN 초기화</button>
                )}
                <button style={{
                  background: 'none', border: 'none', fontSize: 16, color: C.textMuted, cursor: 'pointer', padding: 4,
                }} onClick={() => setFolderManage(false)}>✕</button>
              </div>
            </div>

            {/* PIN 설정/변경 */}
            <div style={{ padding: '10px 0', borderBottom: `1px solid ${C.borderLight}` }}>
              <button style={{
                ...styles.chip, ...(hasPin() ? {} : styles.chipActive), padding: '6px 12px', fontSize: 12,
              }} onClick={() => setPinPopup({ mode: hasPin() ? 'change' : 'set' })}>
                {hasPin() ? 'PIN 변경' : 'PIN 설정'}
              </button>
            </div>

            {/* 폴더 목록 */}
            <div style={{ padding: '10px 0' }}>
              {folders.filter(f => f !== '전체').length === 0 ? (
                <p style={{ fontSize: 12, color: C.textMuted, padding: 8 }}>폴더가 없습니다</p>
              ) : (
                folders.filter(f => f !== '전체').map(f => {
                  const count = allNotes.filter(e => (e.folder || '') === f).length;
                  const isLocked = lockedFolders.includes(f);
                  return (
                    <div key={f} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 4px', borderBottom: `1px solid ${C.borderLight}`,
                    }}>
                      <span style={{ fontSize: 13, color: C.textPrimary, flex: 1 }}>{f}</span>
                      <span style={{ fontSize: 11, color: C.textMuted }}>{count}개</span>
                      <button style={{
                        background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', padding: '2px 6px',
                        color: isLocked ? C.amber : C.textMuted,
                      }} onClick={() => {
                        if (!hasPin()) {
                          setPinPopup({ mode: 'set', onSuccess: () => setLockedFolders(toggleFolderLock(f)) });
                        } else {
                          setLockedFolders(toggleFolderLock(f));
                        }
                      }}>{isLocked ? '🔒' : '🔓'}</button>
                    </div>
                  );
                })
              )}
            </div>

            {/* 새 폴더 추가 */}
            <div style={{ display: 'flex', gap: 6, paddingTop: 8 }}>
              <input
                style={{ ...styles.input, flex: 1, padding: '8px 12px', fontSize: 13, height: 36, boxSizing: 'border-box' }}
                placeholder="새 폴더 이름..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newFolderName.trim() && onUpdateEntry) {
                    // 빈 메모를 해당 폴더에 생성하지 않고, 폴더만 생성하려면 기존 메모에 할당해야 함
                    // 여기서는 폴더명만 알려줌 — 실제 폴더는 메모에 할당 시 자동 생성
                    setNewFolderName('');
                  }
                }}
              />
              <button style={{
                ...styles.chip, ...styles.chipActive, padding: '6px 12px', fontSize: 12, flexShrink: 0,
              }} onClick={() => {
                if (!newFolderName.trim()) return;
                // 폴더는 메모의 folder 필드로 존재 — 빈 폴더를 미리 만들 수는 없음
                // 대신 사용자에게 안내
                alert(`"${newFolderName.trim()}" 폴더를 사용하려면 메모 수정 시 폴더를 선택하세요.`);
                setNewFolderName('');
              }}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
