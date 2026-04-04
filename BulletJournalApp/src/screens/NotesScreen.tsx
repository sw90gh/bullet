import React, { useState, useMemo } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { EntryRow } from '../components/EntryRow';
import { Entry, EntryPriority } from '../types';

interface NotesScreenProps {
  entries: Entry[];
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  cycleStatus: (id: string) => void;
  onChangePriority?: (id: string, priority: EntryPriority) => void;
}

export function NotesScreen({ entries, onAdd, onEdit, onDelete, cycleStatus, onChangePriority }: NotesScreenProps) {
  const { styles, C } = useTheme();
  const [search, setSearch] = useState('');

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

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of notes) {
      const key = e.date || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [notes]);

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
                  onEdit={() => onEdit(entry)}
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
                    onClick={() => onEdit(entry)}
                  >{entry.memo}</div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
