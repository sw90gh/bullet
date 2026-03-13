import React, { useState } from 'react';
import { styles } from '../styles/theme';
import { MONTHS_KR } from '../utils/constants';
import { getTodayStr, addDays } from '../utils/date';
import { Entry } from '../types';

interface MigrateModalProps {
  entry: Entry;
  type: 'migrated' | 'migrated_up';
  onClose: () => void;
  onMigrate: (targetDate: string) => void;
  onMigrateUp: (goalText: string, year: number, month?: number) => void;
}

export function MigrateModal({ entry, type, onClose, onMigrate, onMigrateUp }: MigrateModalProps) {
  const today = getTodayStr();
  const [targetDate, setTargetDate] = useState(addDays(today, 1));
  const [goalYear, setGoalYear] = useState(new Date().getFullYear());
  const [goalMonth, setGoalMonth] = useState<number | null>(new Date().getMonth());

  if (type === 'migrated') {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader as React.CSSProperties}>
            <h3 style={styles.modalTitle}>이관 → 날짜 선택</h3>
            <button style={styles.modalClose} onClick={onClose}>✕</button>
          </div>
          <div style={styles.modalBody}>
            <p style={{ fontSize: 13, color: '#6b5d4d', marginBottom: 12 }}>
              "{entry.text}"을(를) 어느 날짜로 이관할까요?
            </p>

            {/* 빠른 선택 */}
            <label style={styles.fieldLabel}>빠른 선택</label>
            <div style={styles.chipRow as React.CSSProperties}>
              <button style={styles.chip}
                onClick={() => setTargetDate(addDays(today, 1))}>내일</button>
              <button style={styles.chip}
                onClick={() => setTargetDate(addDays(today, 2))}>모레</button>
              <button style={styles.chip}
                onClick={() => setTargetDate(addDays(today, 7))}>다음 주</button>
              <button style={styles.chip}
                onClick={() => setTargetDate(addDays(today, 14))}>2주 후</button>
            </div>

            <label style={styles.fieldLabel}>이관할 날짜</label>
            <input
              type="date"
              style={styles.input}
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          </div>
          <button style={styles.saveBtn} onClick={() => onMigrate(targetDate)}>
            이관하기
          </button>
        </div>
      </div>
    );
  }

  // 상위 이관 (migrated_up)
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader as React.CSSProperties}>
          <h3 style={styles.modalTitle}>상위 이관 → 목표로 등록</h3>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <p style={{ fontSize: 13, color: '#6b5d4d', marginBottom: 12 }}>
            "{entry.text}"을(를) 월간/연간 목표로 격상합니다.
          </p>

          <label style={styles.fieldLabel}>범위</label>
          <div style={styles.chipRow as React.CSSProperties}>
            <button
              style={{ ...styles.chip, ...(goalMonth === null ? styles.chipActive : {}) }}
              onClick={() => setGoalMonth(null)}>
              {goalYear}년 연간 목표
            </button>
            {MONTHS_KR.map((ml, i) => (
              <button key={i}
                style={{ ...styles.chip, ...(goalMonth === i ? styles.chipActive : {}) }}
                onClick={() => setGoalMonth(i)}>
                {ml}
              </button>
            ))}
          </div>
        </div>
        <button style={styles.saveBtn} onClick={() => {
          onMigrateUp(entry.text, goalYear, goalMonth ?? undefined);
        }}>
          목표로 등록
        </button>
      </div>
    </div>
  );
}
