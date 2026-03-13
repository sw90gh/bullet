import React from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { Entry } from '../types';

interface NotesScreenProps {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
}

export function NotesScreen({ entries, onEdit }: NotesScreenProps) {
  const { styles, C } = useTheme();
  const notes = entries
    .filter(e => e.type === 'note')
    .sort((a, b) => b.createdAt - a.createdAt);

  const grouped = notes.reduce<Record<string, Entry[]>>((acc, e) => {
    const key = e.date || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div style={{ ...styles.sectionHeader as React.CSSProperties, marginTop: 0 }}>
        <span style={styles.sectionTitle}>메모 모아보기</span>
        <span style={{ fontSize: 12, color: C.textMuted }}>{notes.length}개</span>
      </div>

      {notes.length === 0 ? (
        <div style={styles.emptyState as React.CSSProperties}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>—</div>
          <p style={{ color: C.textMuted, fontSize: 14 }}>메모가 없습니다</p>
          <p style={{ color: C.textLight, fontSize: 12, marginTop: 6 }}>유형을 '메모'로 선택하여 추가하세요</p>
        </div>
      ) : (
        dateKeys.map(dateKey => (
          <div key={dateKey} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: C.textMuted,
              marginBottom: 4, padding: '0 2px',
            }}>
              {dateKey.replace(/-/g, '.')}
            </div>
            {grouped[dateKey].map(entry => (
              <div key={entry.id}
                style={{
                  background: C.bgWhite, borderRadius: 10, padding: '10px 14px',
                  marginBottom: 4, boxShadow: `0 1px 2px ${C.cardShadow}`,
                  cursor: 'pointer', borderLeft: `3px solid ${C.textSecondary}`,
                }}
                onClick={() => onEdit(entry)}>
                <div style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.5 }}>{entry.text}</div>
                {entry.memo && (
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, lineHeight: 1.4 }}>{entry.memo}</div>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {entry.tags.map((tag, i) => (
                      <span key={i} style={{
                        fontSize: 10, color: C.blue, background: `${C.blue}10`,
                        padding: '1px 5px', borderRadius: 3, marginRight: 3,
                      }}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
