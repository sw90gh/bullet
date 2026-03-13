import React, { useState } from 'react';
import { styles } from '../styles/theme';
import { STATUS, TYPES, PRIORITY, MONTHS_KR } from '../utils/constants';
import { getTodayStr } from '../utils/date';
import { ModalState, Entry, Goal } from '../types';

interface EntryModalProps {
  modal: ModalState;
  onClose: () => void;
  onSaveEntry: (data: Partial<Entry>) => void;
  onSaveGoal: (data: Omit<Goal, 'id'>) => void;
}

export function EntryModal({ modal, onClose, onSaveEntry, onSaveGoal }: EntryModalProps) {
  const isGoal = modal.scope === 'goal' || modal.mode === 'edit-goal' || modal.mode === 'add-goal';
  const existing = modal.entry || modal.goal;

  const [text, setText] = useState(existing?.text || '');
  const [type, setType] = useState<string>((modal.entry as Entry)?.type || 'task');
  const [status, setStatus] = useState<string>((modal.entry as Entry)?.status || 'todo');
  const [priority, setPriority] = useState<string>((modal.entry as Entry)?.priority || 'none');
  const [date, setDate] = useState<string>((modal.entry as Entry)?.date || modal.date || getTodayStr());
  const [endDate, setEndDate] = useState<string>((modal.entry as Entry)?.endDate || '');
  const [time, setTime] = useState<string>((modal.entry as Entry)?.time || '');
  const [done, setDone] = useState((modal.goal as Goal)?.done || false);
  const [month, setMonth] = useState<number | null | undefined>((modal.goal as Goal)?.month ?? modal.month ?? null);

  const handleSave = () => {
    if (!text.trim()) return;
    if (isGoal) {
      onSaveGoal({
        text: text.trim(),
        year: modal.year || (modal.goal as Goal)?.year || new Date().getFullYear(),
        month: month ?? undefined,
        done,
      });
    } else {
      onSaveEntry({
        text: text.trim(),
        type: type as Entry['type'],
        status: status as Entry['status'],
        priority: priority as Entry['priority'],
        date,
        endDate: endDate || undefined,
        time: time || undefined,
      });
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader as React.CSSProperties}>
          <h3 style={styles.modalTitle}>
            {isGoal
              ? (modal.mode === 'edit-goal' ? '목표 수정' : '목표 추가')
              : (modal.mode === 'edit' ? '항목 수정' : '새 항목')}
          </h3>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          <input
            style={styles.input}
            placeholder={isGoal ? '목표를 입력하세요' : '내용을 입력하세요'}
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />

          {isGoal ? (
            <>
              <label style={styles.fieldLabel}>범위</label>
              <div style={styles.chipRow as React.CSSProperties}>
                <button
                  style={{ ...styles.chip, ...(month == null ? styles.chipActive : {}) }}
                  onClick={() => setMonth(null)}>연간</button>
                {MONTHS_KR.map((ml, i) => (
                  <button key={i}
                    style={{ ...styles.chip, ...(month === i ? styles.chipActive : {}) }}
                    onClick={() => setMonth(i)}>{ml}</button>
                ))}
              </div>
              <label style={styles.fieldLabel}>상태</label>
              <div style={styles.chipRow as React.CSSProperties}>
                <button style={{ ...styles.chip, ...(!done ? styles.chipActive : {}) }}
                  onClick={() => setDone(false)}>진행 중</button>
                <button style={{ ...styles.chip, ...(done ? { ...styles.chipActive, background: '#4a8c3f' } : {}) }}
                  onClick={() => setDone(true)}>완료</button>
              </div>
            </>
          ) : (
            <>
              <label style={styles.fieldLabel}>유형</label>
              <div style={styles.chipRow as React.CSSProperties}>
                {Object.entries(TYPES).map(([k, v]) => (
                  <button key={k}
                    style={{ ...styles.chip, ...(type === k ? styles.chipActive : {}) }}
                    onClick={() => setType(k)}>
                    <span style={{ marginRight: 4 }}>{v.symbol}</span>{v.label}
                  </button>
                ))}
              </div>

              <label style={styles.fieldLabel}>상태</label>
              <div style={styles.chipRow as React.CSSProperties}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <button key={k}
                    style={{ ...styles.chip, ...(status === k ? { ...styles.chipActive, background: v.color } : {}) }}
                    onClick={() => setStatus(k)}>
                    <span style={{ marginRight: 3 }}>{v.symbol}</span>{v.label}
                  </button>
                ))}
              </div>

              <label style={styles.fieldLabel}>우선순위</label>
              <div style={styles.chipRow as React.CSSProperties}>
                {Object.entries(PRIORITY).map(([k, v]) => (
                  <button key={k}
                    style={{ ...styles.chip, ...(priority === k ? styles.chipActive : {}) }}
                    onClick={() => setPriority(k)}>
                    {v.symbol ? <span style={{ marginRight: 3 }}>{v.symbol}</span> : null}{v.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 4, overflow: 'hidden' }}>
                <label style={styles.fieldLabel}>시작일</label>
                <input type="date" style={{ ...styles.input, marginBottom: 8, display: 'block' }} value={date}
                  onChange={e => setDate(e.target.value)} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <label style={styles.fieldLabel}>종료일 (선택)</label>
                <input type="date" style={{ ...styles.input, marginBottom: 8, display: 'block' }} value={endDate}
                  onChange={e => setEndDate(e.target.value)} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <label style={styles.fieldLabel}>시간 (선택)</label>
                <input type="time" style={{ ...styles.input, display: 'block' }} value={time}
                  onChange={e => setTime(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <button style={styles.saveBtn} onClick={handleSave}>
          {modal.mode === 'edit' || modal.mode === 'edit-goal' ? '수정 완료' : '추가'}
        </button>
      </div>
    </div>
  );
}
