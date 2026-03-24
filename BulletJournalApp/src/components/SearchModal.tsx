import React, { useState, useMemo } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { STATUS, PRIORITY, STATUS_LABEL_BY_TYPE } from '../utils/constants';
import { Entry } from '../types';

interface SearchModalProps {
  entries: Entry[];
  onClose: () => void;
  onEdit: (entry: Entry) => void;
  cycleStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function SearchModal({ entries, onClose, onEdit, cycleStatus, onDelete }: SearchModalProps) {
  const { styles, C, statusColor } = useTheme();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return entries.filter(e =>
      e.text.toLowerCase().includes(q) ||
      e.memo?.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    ).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
  }, [entries, query]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{
        ...styles.modal,
        borderRadius: '20px 20px 0 0',
        maxHeight: '90vh',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '14px 0 8px', borderBottom: `1px solid ${C.borderLight}`,
          position: 'sticky', top: 0, background: C.bg, zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔍</span>
            <input
              style={{
                ...styles.input,
                flex: 1, padding: '8px 12px', fontSize: 14,
              }}
              placeholder="검색어를 입력하세요"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <button style={styles.modalClose} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ padding: '8px 0', maxHeight: '70vh', overflowY: 'auto' }}>
          {query.trim() && results.length === 0 && (
            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, padding: 20 }}>
              검색 결과가 없습니다
            </p>
          )}
          {results.map(entry => {
            const st = STATUS[entry.status] || STATUS.todo;
            const pr = PRIORITY[entry.priority] || PRIORITY.none;
            const statusLabel = STATUS_LABEL_BY_TYPE[entry.type]?.[entry.status] || st.label;
            return (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 4px', borderBottom: `1px solid ${C.borderLight}`,
              }}>
                {/* 상태 심볼 — 탭하면 상태 순환 */}
                <span style={{
                  fontSize: 14, fontWeight: 800, color: statusColor(entry.status),
                  width: 24, textAlign: 'center', flexShrink: 0, cursor: 'pointer',
                  padding: '4px 0',
                }} onClick={() => cycleStatus?.(entry.id)}>{st.symbol}</span>
                {/* 본문 — 탭하면 수정 */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => { onEdit(entry); onClose(); }}>
                  <div style={{
                    fontSize: 13, color: C.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textDecoration: entry.status === 'done' || entry.status === 'cancelled' ? 'line-through' : 'none',
                  }}>
                    {pr.symbol && <span style={{ color: C.accent, marginRight: 3 }}>{pr.symbol}</span>}
                    {entry.text}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>
                    {entry.date?.replace(/-/g, '.')}
                    {entry.tags && entry.tags.length > 0 && (
                      <span style={{ marginLeft: 6, color: C.blue }}>
                        {entry.tags.map(t => `#${t}`).join(' ')}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: 9, color: statusColor(entry.status), background: statusColor(entry.status) + '18',
                  padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                }}>{statusLabel}</span>
                {/* 삭제 버튼 */}
                {onDelete && (
                  <button style={{
                    background: 'none', border: 'none', fontSize: 12, color: C.textMuted,
                    cursor: 'pointer', padding: '4px', flexShrink: 0,
                  }} onClick={() => {
                    if (confirm('삭제하시겠습니까?')) onDelete(entry.id);
                  }}>✕</button>
                )}
              </div>
            );
          })}
          {!query.trim() && (
            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, padding: 20 }}>
              제목, 메모, 태그로 검색할 수 있습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
