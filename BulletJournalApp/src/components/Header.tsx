import React, { useState } from 'react';
import { styles } from '../styles/theme';
import { DAYS_KR } from '../utils/constants';
import { getWeekNumber, getMonthWeekNumber } from '../utils/date';
import { getRandomQuote, getDailyQuote } from '../utils/quotes';
import { ViewType } from '../types';

interface HeaderProps {
  curDate: Date;
  view: ViewType;
  nav: (dir: number) => void;
  goToday: () => void;
  onSettings: () => void;
  notionConnected: boolean;
  syncing: boolean;
  urgentCount?: number;
}

export function Header({ curDate, view, nav, goToday, onSettings, notionConnected, syncing, urgentCount = 0 }: HeaderProps) {
  const y = curDate.getFullYear();
  const m = curDate.getMonth();
  const d = curDate.getDate();
  const dow = DAYS_KR[curDate.getDay()];
  const [showQuote, setShowQuote] = useState(false);
  const [quote, setQuote] = useState(getDailyQuote());

  let label = '';
  if (view === 'daily') label = `${m + 1}월 ${d}일 ${dow}요일`;
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
          <h1 style={styles.logo}>B · J</h1>
          <div style={styles.headerActions as React.CSSProperties}>
            {notionConnected && (
              <span style={{ fontSize: 10, color: syncing ? '#c0883f' : '#4a8c3f', marginRight: 4 }}>
                {syncing ? '동기화 중...' : '● Notion'}
              </span>
            )}
            <button style={{
              ...styles.todayBtn,
              fontSize: 11, padding: '4px 10px',
            }} onClick={refreshQuote}>💡</button>
            <button style={styles.todayBtn} onClick={goToday}>
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
