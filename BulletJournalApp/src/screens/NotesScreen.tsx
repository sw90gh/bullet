import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { PRIORITY } from '../utils/constants';
import { Entry, EntryPriority } from '../types';

interface NotesScreenProps {
  entries: Entry[];
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  cycleStatus: (id: string) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
  onPopupChange?: (open: boolean) => void;
}

export function NotesScreen({ entries, onAdd, onEdit, onDelete, cycleStatus, onChangePriority, onPopupChange }: NotesScreenProps) {
  const { styles, C } = useTheme();
  const [search, setSearch] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);
  useEffect(() => { onPopupChange?.(viewingId !== null); }, [viewingId, onPopupChange]);

  const notes = useMemo(() => {
    let list = entries
      .filter(e => e.type === 'note')
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        e.text.toLowerCase().includes(q)
        || (e.memo && e.memo.toLowerCase().includes(q))
        || (e.tags && e.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [entries, search]);

  // Live entry from entries prop (always fresh)
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

  return (
    <div>
      {/* 헤더 */}
      <div style={{ ...styles.sectionHeader as React.CSSProperties, marginTop: 0 }}>
        <span style={styles.sectionTitle}>메모 모아보기</span>
        <span style={{ fontSize: 12, color: C.textMuted }}>{notes.length}개</span>
      </div>

      {/* 검색 + 추가 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          style={{
            ...styles.input, flex: 1, padding: '6px 12px', fontSize: 12,
            height: 32, lineHeight: '32px',
          }}
          placeholder="메모 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button style={{
          ...styles.chip, ...styles.chipActive,
          padding: '6px 14px', fontSize: 12, flexShrink: 0,
        }} onClick={onAdd}>+ 새 메모</button>
      </div>

      {notes.length === 0 ? (
        <div style={styles.emptyState as React.CSSProperties}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>—</div>
          <p style={{ color: C.textMuted, fontSize: 14 }}>
            {search ? '검색 결과가 없습니다' : '메모가 없습니다'}
          </p>
          {!search && (
            <button style={styles.emptyAdd} onClick={onAdd}>+ 새 메모 추가</button>
          )}
        </div>
      ) : (
        grouped.map(([dateKey, dateNotes]) => (
          <div key={dateKey} style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: C.textMuted,
              marginBottom: 4, padding: '0 2px',
            }}>
              {dateKey.replace(/-/g, '.')}
            </div>
            {dateNotes.map(entry => (
              <div key={entry.id} style={{ marginBottom: 4 }}>
                <EntryRow
                  entry={entry}
                  cycleStatus={cycleStatus}
                  onEdit={() => setViewingId(entry.id)}
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
                    onClick={() => setViewingId(entry.id)}
                  >{entry.memo}</div>
                )}
              </div>
            ))}
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
            {/* 뷰어 헤더 */}
            <div style={{
              padding: '14px 20px 10px', borderBottom: `1px solid ${C.borderLight}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {viewingEntry.text}
                </h3>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, display: 'flex', gap: 10 }}>
                  <span>등록 {fmtDate(viewingEntry.createdAt)}</span>
                  {viewingEntry.updatedAt && <span>수정 {fmtDate(viewingEntry.updatedAt)}</span>}
                </div>
              </div>
              <button style={{
                background: 'none', border: 'none', fontSize: 18, color: C.textMuted,
                cursor: 'pointer', padding: '4px 8px', flexShrink: 0,
              }} onClick={() => setViewingId(null)}>✕</button>
            </div>

            {/* 뷰어 본문 */}
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

              {/* 태그 */}
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

              {/* 우선순위 */}
              {viewingEntry.priority && viewingEntry.priority !== 'none' && (
                <div style={{ marginTop: 8, fontSize: 11, color: C.textSecondary }}>
                  우선순위: {PRIORITY[viewingEntry.priority]?.symbol} {PRIORITY[viewingEntry.priority]?.label}
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div style={{
              padding: '12px 20px', paddingBottom: 'env(safe-area-inset-bottom, 12px)',
              borderTop: `1px solid ${C.borderLight}`, flexShrink: 0,
              display: 'flex', gap: 8,
            }}>
              <button style={{
                flex: 1, padding: 12, borderRadius: 10,
                background: C.primary, color: C.headerText,
                border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: '-apple-system, sans-serif',
              }} onClick={() => { const e = viewingEntry; setViewingId(null); onEdit(e); }}>수정</button>
              <button style={{
                padding: 12, borderRadius: 10,
                border: `1.5px solid ${C.accent}`, background: 'transparent',
                color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: '-apple-system, sans-serif',
              }} onClick={() => {
                if (confirm('이 메모를 삭제하시겠습니까?')) {
                  onDelete(viewingEntry.id);
                  setViewingId(null);
                }
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
