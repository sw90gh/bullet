import React, { useState, useRef } from 'react';
import { styles } from '../styles/theme';
import { STATUS, TYPES, PRIORITY } from '../utils/constants';
import { Entry } from '../types';

interface EntryRowProps {
  entry: Entry;
  cycleStatus: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMigrate?: () => void;
  onMigrateUp?: () => void;
  compact?: boolean;
}

export function EntryRow({ entry, cycleStatus, onEdit, onDelete, onMigrate, onMigrateUp, compact }: EntryRowProps) {
  const [swiped, setSwiped] = useState(false);
  const st = STATUS[entry.status] || STATUS.todo;
  const pr = PRIORITY[entry.priority] || PRIORITY.none;
  const isStrike = ('strike' in st && st.strike) || entry.status === 'done';

  const touchStart = useRef<{ x: number; time: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, time: Date.now() };
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onEdit();
    }, 500);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current && Math.abs(e.touches[0].clientX - touchStart.current.x) > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (didLongPress.current || touchStart.current === null) {
      touchStart.current = null;
      return;
    }
    const diff = e.changedTouches[0].clientX - touchStart.current.x;
    if (diff < -60) setSwiped(true);
    else if (diff > 60) setSwiped(false);
    touchStart.current = null;
  };

  if (compact) {
    return (
      <div style={styles.weekEntry as React.CSSProperties}
        onClick={() => cycleStatus(entry.id)}
        onContextMenu={(e) => { e.preventDefault(); onEdit(); }}>
        {pr.symbol ? <span style={{ color: '#c0583f', fontSize: 11, marginRight: 2 }}>{pr.symbol}</span> : null}
        {entry.type === 'event' ? (
          <span style={{ color: '#c0583f', fontSize: 12, marginRight: 6 }}>○</span>
        ) : (
          <span style={{
            color: st.color, fontSize: 14, fontWeight: 800, marginRight: 6,
            textDecoration: ('strike' in st && st.strike) ? 'line-through' : 'none',
          }}>{st.symbol}</span>
        )}
        <span style={{
          fontSize: 13, color: isStrike ? '#b8a99a' : '#3d3427',
          textDecoration: isStrike ? 'line-through' : 'none',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{entry.text}</span>
        {entry.time && <span style={{ fontSize: 11, color: '#b8a99a', marginLeft: 4 }}>{entry.time}</span>}
        {entry.notionPageId && <span style={styles.notionBadge}>N</span>}
      </div>
    );
  }

  return (
    <div style={styles.entryOuter as React.CSSProperties}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 200,
        display: 'flex', transition: 'opacity 0.2s',
        opacity: swiped ? 1 : 0,
      }}>
        {onMigrate && entry.status !== 'migrated' && entry.status !== 'migrated_up' && (
          <button style={{ flex: 1, background: '#c0883f', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif' }}
            onClick={() => { onMigrate(); setSwiped(false); }}>이관 →</button>
        )}
        {onMigrateUp && entry.status !== 'migrated' && entry.status !== 'migrated_up' && (
          <button style={{ flex: 1, background: '#3a7ca5', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif' }}
            onClick={() => { onMigrateUp(); setSwiped(false); }}>상위 ←</button>
        )}
        <button style={{ flex: 1, background: '#6b5d4d', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif' }}
          onClick={() => { onEdit(); setSwiped(false); }}>수정</button>
        <button style={{ flex: 1, background: '#c0583f', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif' }}
          onClick={() => { onDelete(); setSwiped(false); }}>삭제</button>
      </div>
      <div style={{
        ...styles.entryRow as React.CSSProperties,
        transform: swiped ? 'translateX(-200px)' : 'translateX(0)',
        transition: 'transform 0.25s ease',
      }}
        onClick={() => !swiped && cycleStatus(entry.id)}
      >
        {pr.symbol ? <span style={{ ...styles.prMark, color: entry.priority === 'urgent' ? '#c0583f' : '#c0883f' }}>{pr.symbol}</span> : null}
        {entry.type === 'event' ? (
          <span style={{ ...styles.entrySym, color: '#c0583f', fontSize: 18 }}>○</span>
        ) : entry.type === 'note' ? (
          <span style={{ ...styles.entrySym, color: '#6b5d4d', fontSize: 16 }}>—</span>
        ) : (
          <span style={{
            ...styles.entrySym,
            color: st.color,
            textDecoration: ('strike' in st && st.strike) ? 'line-through' : 'none',
            fontSize: entry.status === 'done' ? 20 : 22,
            fontWeight: 800,
          }}>{st.symbol}</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            ...styles.entryText,
            textDecoration: isStrike ? 'line-through' : 'none',
            color: isStrike ? '#b8a99a' : '#2c2416',
          }}>{entry.text}</span>
          {entry.time && <span style={styles.timeTag}>{entry.time}</span>}
          {entry.notionPageId && <span style={styles.notionBadge}>N</span>}
          {entry.tags && entry.tags.length > 0 && (
            <div style={{ marginTop: 2 }}>
              {entry.tags.map((tag, i) => (
                <span key={i} style={{
                  fontSize: 10, color: '#3a7ca5', background: '#3a7ca510',
                  padding: '1px 5px', borderRadius: 3, marginRight: 3,
                }}>#{tag}</span>
              ))}
            </div>
          )}
          {entry.memo && (
            <div style={{ fontSize: 11, color: '#b8a99a', marginTop: 2, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.memo}
            </div>
          )}
        </div>
        <span style={{ ...styles.statusBadge, background: st.color + '18', color: st.color }}>
          {st.label}
        </span>
      </div>
    </div>
  );
}
