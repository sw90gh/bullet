import React from 'react';
import { styles } from '../styles/theme';
import { Entry } from '../types';

interface NotesScreenProps {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
}

export function NotesScreen({ entries, onEdit }: NotesScreenProps) {
  const notes = entries
    .filter(e => e.type === 'note')
    .sort((a, b) => b.createdAt - a.createdAt);

  // 날짜별 그룹
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
        <span style={{ fontSize: 12, color: '#b8a99a' }}>{notes.length}개</span>
      </div>

      {notes.length === 0 ? (
        <div style={styles.emptyState as React.CSSProperties}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>—</div>
          <p style={{ color: '#b8a99a', fontSize: 14 }}>메모가 없습니다</p>
          <p style={{ color: '#ccc4b8', fontSize: 12, marginTop: 6 }}>유형을 '메모'로 선택하여 추가하세요</p>
        </div>
      ) : (
        dateKeys.map(dateKey => (
          <div key={dateKey} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#b8a99a',
              marginBottom: 4, padding: '0 2px',
            }}>
              {dateKey.replace(/-/g, '.')}
            </div>
            {grouped[dateKey].map(entry => (
              <div key={entry.id}
                style={{
                  background: 'white', borderRadius: 10, padding: '10px 14px',
                  marginBottom: 4, boxShadow: '0 1px 2px rgba(44,36,22,0.04)',
                  cursor: 'pointer', borderLeft: '3px solid #6b5d4d',
                }}
                onClick={() => onEdit(entry)}>
                <div style={{ fontSize: 13, color: '#2c2416', lineHeight: 1.5 }}>{entry.text}</div>
                {entry.memo && (
                  <div style={{ fontSize: 11, color: '#b8a99a', marginTop: 3, lineHeight: 1.4 }}>{entry.memo}</div>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {entry.tags.map((tag, i) => (
                      <span key={i} style={{
                        fontSize: 10, color: '#3a7ca5', background: '#3a7ca510',
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
