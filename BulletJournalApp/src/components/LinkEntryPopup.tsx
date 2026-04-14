import React, { useState, useMemo } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { Entry } from '../types';
import { STATUS } from '../utils/constants';

interface LinkEntryPopupProps {
  entries: Entry[];           // 연결 가능한 항목 목록
  alreadyLinked: string[];    // 이미 연결된 ID
  mode: 'note' | 'entry';    // 메모 연결 / 항목 연결
  onLink: (id: string) => void;
  onClose: () => void;
}

export function LinkEntryPopup({ entries, alreadyLinked, mode, onLink, onClose }: LinkEntryPopupProps) {
  const { C, statusColor } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const available = entries.filter(e => !alreadyLinked.includes(e.id));
    if (!search.trim()) return available;
    const q = search.trim().toLowerCase();
    return available.filter(e =>
      e.text.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q)) ||
      (e.memo && e.memo.toLowerCase().includes(q))
    );
  }, [entries, alreadyLinked, search]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430,
        maxHeight: '55vh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
      }} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{
          padding: '14px 20px 10px', borderBottom: `1px solid ${C.borderLight}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
            {mode === 'note' ? '메모 연결' : '항목 연결'}
          </span>
          <button style={{
            background: 'none', border: 'none', fontSize: 16, color: C.textMuted,
            cursor: 'pointer', padding: 4,
          }} onClick={onClose}>✕</button>
        </div>

        {/* 검색 */}
        <div style={{ padding: '10px 20px 6px', flexShrink: 0 }}>
          <input
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.bgWhite,
              fontSize: 13, color: C.textPrimary, outline: 'none',
              fontFamily: '-apple-system, sans-serif',
              boxSizing: 'border-box',
            }}
            placeholder="검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* 목록 */}
        <div style={{ overflow: 'auto', padding: '0 20px 16px', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: C.textMuted }}>
              {search ? '검색 결과 없음' : '연결 가능한 항목 없음'}
            </div>
          ) : filtered.map(entry => {
            const st = STATUS[entry.status] || STATUS.todo;
            const symbol = entry.type === 'note' ? '—'
              : entry.type === 'event' ? '○'
              : entry.type === 'goal-yearly' ? '◎'
              : st.symbol;
            const color = entry.type === 'note' ? C.textSecondary
              : entry.type === 'event' ? C.accent
              : entry.type === 'goal-yearly' ? C.blue
              : statusColor(entry.status);

            return (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 4px', borderBottom: `1px solid ${C.borderLight}`,
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color, width: 18, textAlign: 'center' }}>
                  {symbol}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: C.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{entry.text}</div>
                  {entry.date && (
                    <span style={{ fontSize: 10, color: C.textMuted }}>{entry.date.slice(5)}</span>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <span style={{ fontSize: 10, color: C.blue, marginLeft: 4 }}>
                      {entry.tags.map(t => `#${t}`).join(' ')}
                    </span>
                  )}
                </div>
                <button style={{
                  flexShrink: 0, padding: '4px 10px', borderRadius: 6,
                  border: 'none', background: C.blue, color: '#fff',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  fontFamily: '-apple-system, sans-serif',
                }} onClick={() => onLink(entry.id)}>연결</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
