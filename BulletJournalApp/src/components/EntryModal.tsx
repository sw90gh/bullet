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
  allTags?: string[];
}

export function EntryModal({ modal, onClose, onSaveEntry, onSaveGoal, allTags = [] }: EntryModalProps) {
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
  const [tags, setTags] = useState<string>((modal.entry as Entry)?.tags?.join(', ') || '');
  const [memo, setMemo] = useState<string>((modal.entry as Entry)?.memo || '');

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
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      onSaveEntry({
        text: text.trim(),
        type: type as Entry['type'],
        status: status as Entry['status'],
        priority: priority as Entry['priority'],
        date,
        endDate: endDate || undefined,
        time: time || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        memo: memo.trim() || undefined,
      });
    }
  };

  // 현재 입력 중인 마지막 태그로 기존 태그 필터링
  const currentInput = tags.split(',').pop()?.trim().toLowerCase() || '';
  const currentTags = tags.split(',').map(t => t.trim()).filter(Boolean);
  const suggestedTags = allTags.filter(t =>
    !currentTags.includes(t) && (currentInput === '' || t.toLowerCase().includes(currentInput))
  );

  const addTag = (tag: string) => {
    const parts = tags.split(',').map(t => t.trim()).filter(Boolean);
    const before = parts.slice(0, -1);
    if (currentInput && parts[parts.length - 1]?.toLowerCase().includes(currentInput)) {
      setTags([...before, tag].join(', ') + ', ');
    } else {
      setTags([...parts, tag].join(', ') + ', ');
    }
  };

  const inputSmall: React.CSSProperties = {
    ...styles.input,
    padding: '0 8px',
    fontSize: 13,
    display: 'block',
    boxSizing: 'border-box',
    width: '100%',
    height: 34,
    lineHeight: '34px',
    margin: 0,
  };

  const labelSmall: React.CSSProperties = { ...styles.fieldLabel, marginTop: 0, marginBottom: 2, fontSize: 11 };

  const saveLabel = modal.mode === 'edit' || modal.mode === 'edit-goal' ? '수정' : '추가';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 헤더: 제목 + 추가/수정 버튼 + 닫기 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 0 8px', borderBottom: '1px solid #ebe5dc',
          position: 'sticky', top: 0, background: '#faf6f0', zIndex: 1,
        }}>
          <h3 style={styles.modalTitle}>
            {isGoal
              ? (modal.mode === 'edit-goal' ? '목표 수정' : '목표 추가')
              : (modal.mode === 'edit' ? '항목 수정' : '새 항목')}
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={{
              background: '#2c2416', color: 'white', border: 'none',
              padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
            }} onClick={handleSave}>{saveLabel}</button>
            <button style={styles.modalClose} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ ...styles.modalBody, padding: '8px 0' }}>
          <input
            style={{ ...styles.input, padding: '8px 14px', fontSize: 14 }}
            placeholder={isGoal ? '목표를 입력하세요' : '내용을 입력하세요'}
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />

          {isGoal ? (
            <>
              <label style={{ ...styles.fieldLabel, marginTop: 8, marginBottom: 2, fontSize: 11 }}>범위</label>
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
              <label style={{ ...styles.fieldLabel, marginTop: 8, marginBottom: 2, fontSize: 11 }}>상태</label>
              <div style={styles.chipRow as React.CSSProperties}>
                <button style={{ ...styles.chip, ...(!done ? styles.chipActive : {}) }}
                  onClick={() => setDone(false)}>진행 중</button>
                <button style={{ ...styles.chip, ...(done ? { ...styles.chipActive, background: '#4a8c3f' } : {}) }}
                  onClick={() => setDone(true)}>완료</button>
              </div>
            </>
          ) : (
            <>
              {/* 유형 + 우선순위 한 줄 */}
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={labelSmall}>유형</label>
                  <div style={{ ...styles.chipRow as React.CSSProperties, flexWrap: 'nowrap' }}>
                    {Object.entries(TYPES).map(([k, v]) => (
                      <button key={k}
                        style={{ ...styles.chip, ...(type === k ? styles.chipActive : {}), padding: '4px 6px', fontSize: 10 }}
                        onClick={() => setType(k)}>
                        <span style={{ marginRight: 3 }}>{v.symbol}</span>{v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={labelSmall}>우선순위</label>
                  <div style={{ ...styles.chipRow as React.CSSProperties, flexWrap: 'nowrap' }}>
                    {Object.entries(PRIORITY).map(([k, v]) => (
                      <button key={k}
                        style={{ ...styles.chip, ...(priority === k ? styles.chipActive : {}), padding: '4px 6px', fontSize: 10 }}
                        onClick={() => setPriority(k)}>
                        {v.symbol ? <span style={{ marginRight: 2 }}>{v.symbol}</span> : null}{v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 상태 */}
              <div style={{ marginTop: 4 }}>
                <label style={labelSmall}>상태</label>
                <div style={styles.chipRow as React.CSSProperties}>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <button key={k}
                      style={{ ...styles.chip, ...(status === k ? { ...styles.chipActive, background: v.color } : {}), padding: '4px 6px', fontSize: 10 }}
                      onClick={() => setStatus(k)}>
                      <span style={{ marginRight: 3 }}>{v.symbol}</span>{v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 시작일 + 종료일 한 줄 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={labelSmall}>시작일</label>
                  <input type="date" style={inputSmall} value={date}
                    onChange={e => setDate(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={labelSmall}>종료일</label>
                  <input type="date" style={inputSmall} value={endDate}
                    onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* 시간 + 태그 + 메모 한 줄씩 */}
              <div style={{ marginTop: 4 }}>
                <label style={labelSmall}>시간</label>
                <input type="time" style={inputSmall} value={time}
                  onChange={e => setTime(e.target.value)} />
              </div>

              <div style={{ marginTop: 4 }}>
                <label style={labelSmall}>태그</label>
                <input style={inputSmall} value={tags}
                  placeholder="업무, 개인 (쉼표로 구분)"
                  onChange={e => setTags(e.target.value)} />
                {suggestedTags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                    {suggestedTags.slice(0, 8).map(tag => (
                      <button key={tag}
                        style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 10,
                          border: '1px solid #3a7ca530', background: '#3a7ca508',
                          color: '#3a7ca5', cursor: 'pointer',
                          fontFamily: '-apple-system, sans-serif',
                        }}
                        onClick={() => addTag(tag)}>#{tag}</button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 4 }}>
                <label style={labelSmall}>메모</label>
                <input style={inputSmall} value={memo}
                  placeholder="세부 내용이나 참고사항"
                  onChange={e => setMemo(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
