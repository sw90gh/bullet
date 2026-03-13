import React from 'react';
import { styles } from '../styles/theme';
import { DAYS_KR, MONTHS_KR } from '../utils/constants';
import { getWeekNumber, getMonthWeekNumber } from '../utils/date';
import { ViewType } from '../types';

interface HeaderProps {
  curDate: Date;
  view: ViewType;
  nav: (dir: number) => void;
  goToday: () => void;
  onSettings: () => void;
  notionConnected: boolean;
  syncing: boolean;
}

export function Header({ curDate, view, nav, goToday, onSettings, notionConnected, syncing }: HeaderProps) {
  const y = curDate.getFullYear();
  const m = curDate.getMonth();
  const d = curDate.getDate();
  const dow = DAYS_KR[curDate.getDay()];

  let label = '';
  if (view === 'daily') label = `${m + 1}월 ${d}일 ${dow}요일`;
  else if (view === 'weekly') label = `${m + 1}월 ${getMonthWeekNumber(curDate)}주차 (${getWeekNumber(curDate)}주차)`;
  else if (view === 'monthly') label = `${y}년 ${m + 1}월`;
  else if (view === 'gantt') label = `${y}년 ${m + 1}월 간트`;
  else label = `${y}년`;

  return (
    <header style={styles.header}>
      <div style={styles.headerTop}>
        <h1 style={styles.logo}>B · J</h1>
        <div style={styles.headerActions as React.CSSProperties}>
          {notionConnected && (
            <span style={{ fontSize: 10, color: syncing ? '#c0883f' : '#4a8c3f', marginRight: 4 }}>
              {syncing ? '동기화 중...' : '● Notion'}
            </span>
          )}
          <button style={styles.todayBtn} onClick={goToday}>오늘</button>
          <button style={styles.settingsBtn} onClick={onSettings}>⚙</button>
        </div>
      </div>
      <div style={styles.navBar}>
        <button style={styles.navBtn} onClick={() => nav(-1)}>‹</button>
        <span style={styles.navLabel}>{label}</span>
        <button style={styles.navBtn} onClick={() => nav(1)}>›</button>
      </div>
    </header>
  );
}
