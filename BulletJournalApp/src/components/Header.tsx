import React, { useState } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { DAYS_KR } from '../utils/constants';
import { getWeekNumber, getMonthWeekNumber } from '../utils/date';
import { getRandomQuote, getDailyQuote } from '../utils/quotes';
import { ViewType } from '../types';
import { SyncStatus } from '../hooks/useFirestoreSync';

interface HeaderProps {
  curDate: Date;
  view: ViewType;
  nav: (dir: number) => void;
  goToday: () => void;
  onSettings: () => void;
  urgentCount?: number;
  onSearch?: () => void;
  syncStatus?: SyncStatus;
  syncError?: string | null;
}

export function Header({ curDate, view, nav, goToday, onSettings, urgentCount = 0, onSearch, syncStatus, syncError }: HeaderProps) {
  const { styles } = useTheme();
  const y = curDate.getFullYear();
  const m = curDate.getMonth();
  const d = curDate.getDate();
  const dow = DAYS_KR[curDate.getDay()];
  const [showQuote, setShowQuote] = useState(false);
  const [quote, setQuote] = useState(getDailyQuote());

  let label = '';
  if (view === 'all') label = '전체 항목';
  else if (view === 'daily') label = `${m + 1}월 ${d}일 ${dow}요일`;
  else if (view === 'weekly') label = `${m + 1}월 ${getMonthWeekNumber(curDate)}주차 (${getWeekNumber(curDate)}주차)`;
  else if (view === 'monthly') label = `${y}년 ${m + 1}월`;
  else if (view === 'gantt') label = `${y}년 ${m + 1}월 간트`;
  else label = `${y}년`;

  const refreshQuote = () => {
    setQuote(getRandomQuote());
    setShowQuote(true);
  };

  return (
    <>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <h1 style={{ ...styles.logo, fontSize: 13, letterSpacing: 1, whiteSpace: 'nowrap' }}>BulletJournal</h1>
            {syncStatus && syncStatus !== 'idle' && (
              <span
                style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0, cursor: syncStatus === 'error' ? 'pointer' : undefined,
                  background: syncStatus === 'synced' ? '#4caf50' :
                               syncStatus === 'syncing' ? '#c0883f' : '#c0583f',
                  animation: syncStatus === 'syncing' ? 'pulse 1.2s infinite' : undefined,
                  boxShadow: syncStatus === 'synced' ? '0 0 4px #4caf5080' :
                              syncStatus === 'syncing' ? '0 0 4px #c0883f80' : '0 0 4px #c0583f80',
                }}
                title={
                  syncStatus === 'synced' ? '동기화 완료' :
                  syncStatus === 'syncing' ? '동기화 중...' :
                  `동기화 오류: ${syncError || '알 수 없는 오류'}`
                }
                onClick={syncStatus === 'error' ? () => alert(`동기화 오류:\n${syncError || '알 수 없는 오류'}`) : undefined}
              />
            )}
          </div>
          <div style={{ ...styles.headerActions as React.CSSProperties, flexShrink: 0 }}>
            <button style={{
              ...styles.todayBtn,
              fontSize: 11, padding: '4px 8px',
            }} onClick={refreshQuote}>💡</button>
            {onSearch && (
              <button style={{
                ...styles.todayBtn,
                fontSize: 12, padding: '4px 8px',
              }} onClick={onSearch}>🔍</button>
            )}
            <button style={{ ...styles.todayBtn, padding: '5px 10px', whiteSpace: 'nowrap' }} onClick={goToday}>
              오늘
              {urgentCount > 0 && (
                <span style={{
                  background: '#c0583f', color: 'white', fontSize: 9, fontWeight: 700,
                  borderRadius: '50%', width: 16, height: 16, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', marginLeft: 4,
                }}>{urgentCount}</span>
              )}
            </button>
            <button style={styles.settingsBtn} onClick={onSettings}>⚙</button>
          </div>
        </div>
        <div style={styles.navBar}>
          <button style={styles.navBtn} onClick={() => nav(-1)}>‹</button>
          <span style={styles.navLabel}>{label}</span>
          <button style={styles.navBtn} onClick={() => nav(1)}>›</button>
        </div>
      </header>

      {/* 명언 팝업 */}
      {showQuote && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => setShowQuote(false)}>
          <div style={{
            background: '#2c2416', borderRadius: 20, padding: '32px 24px',
            maxWidth: 340, width: '100%', textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 28, marginBottom: 16, opacity: 0.6 }}>💡</div>
            <p style={{
              fontSize: 16, color: '#faf6f0', lineHeight: 1.7,
              fontWeight: 500, marginBottom: 16,
              fontFamily: 'Georgia, "Noto Serif KR", serif',
            }}>"{quote.text}"</p>
            <p style={{ fontSize: 12, color: '#b8a99a' }}>— {quote.author}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'center' }}>
              <button style={{
                background: 'rgba(250,246,240,0.15)', border: '1px solid rgba(250,246,240,0.25)',
                color: '#faf6f0', fontSize: 12, padding: '8px 20px', borderRadius: 10,
                cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
              }} onClick={refreshQuote}>다른 명언</button>
              <button style={{
                background: '#faf6f0', border: 'none',
                color: '#2c2416', fontSize: 12, fontWeight: 600,
                padding: '8px 20px', borderRadius: 10,
                cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
              }} onClick={() => setShowQuote(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
