import React, { useState } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { STATUS, TYPES, PRIORITY } from '../utils/constants';
import { getTodayStr } from '../utils/date';
import { ModalState, Entry, RecurringConfig } from '../types';

interface EntryModalProps {
  modal: ModalState;
  onClose: () => void;
  onSaveEntry: (data: Partial<Entry>) => void;
  allTags?: string[];
}

const ENTRY_TYPES = {
  task:  TYPES.task,
  event: TYPES.event,
  note:  TYPES.note,
};

export function EntryModal({ modal, onClose, onSaveEntry, allTags = [] }: EntryModalProps) {
  const { styles, C } = useTheme();
  const existing = modal.entry;

  const [text, setText] = useState(existing?.text || '');
  const [type, setType] = useState<string>(existing?.type || 'task');
  const [status, setStatus] = useState<string>(existing?.status || 'todo');
  const [priority, setPriority] = useState<string>(existing?.priority || 'none');
  const [date, setDate] = useState<string>(existing?.date || modal.date || getTodayStr());
  const [endDate, setEndDate] = useState<string>(existing?.endDate || '');
  const [time, setTime] = useState<string>(existing?.time || '');
  const [endTime, setEndTime] = useState<string>(existing?.endTime || '');
  const [tags, setTags] = useState<string>(existing?.tags?.join(', ') || '');
  const [memo, setMemo] = useState<string>(existing?.memo || '');
  const [recurringType, setRecurringType] = useState<string>(existing?.recurring?.type || 'none');
  const [recurringInterval, setRecurringInterval] = useState<number>(existing?.recurring?.interval || 1);
  const [recurringEndDate, setRecurringEndDate] = useState<string>(existing?.recurring?.endDate || '');

  const isGoalType = type === 'goal-yearly' || type === 'goal-monthly';

  const handleSave = () => {
    if (!text.trim()) return;
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    const recurring: RecurringConfig | undefined = recurringType !== 'none'
      ? { type: recurringType as RecurringConfig['type'], interval: recurringInterval, endDate: recurringEndDate || undefined }
      : undefined;
    const isMultiDay = endDate && endDate !== date;
    onSaveEntry({
      text: text.trim(),
      type: type as Entry['type'],
      status: status as Entry['status'],
      priority: priority as Entry['priority'],
      date,
      endDate: endDate || undefined,
      time: isMultiDay || isGoalType ? undefined : (time || undefined),
      endTime: isMultiDay || isGoalType ? undefined : (endTime || undefined),
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      memo: memo.trim() || undefined,
      recurring: isGoalType ? undefined : recurring,
    });
  };

  // 태그 자동완성
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

  const saveLabel = modal.mode === 'edit' ? '수정' : '추가';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 0 8px', borderBottom: `1px solid ${C.borderLight}`,
          position: 'sticky', top: 0, background: C.bg, zIndex: 1,
        }}>
          <h3 style={styles.modalTitle}>
            {isGoalType
              ? (modal.mode === 'edit' ? '목표 수정' : '목표 추가')
              : (modal.mode === 'edit' ? '항목 수정' : '새 항목')}
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={{
              background: C.primary, color: C.headerText, border: 'none',
              padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
            }} onClick={handleSave}>{saveLabel}</button>
            <button style={styles.modalClose} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ ...styles.modalBody, padding: '8px 0' }}>
          <input
            style={{ ...styles.input, padding: '8px 14px', fontSize: 14 }}
            placeholder={isGoalType ? '목표를 입력하세요' : '내용을 입력하세요'}
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />

          {/* 유형 + 우선순위 한 줄 */}
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={labelSmall}>유형</label>
              <div style={{ ...styles.chipRow as React.CSSProperties, flexWrap: 'nowrap' }}>
                {Object.entries(ENTRY_TYPES).map(([k, v]) => (
                  <button key={k}
                    style={{ ...styles.chip, ...(type === k ? styles.chipActive : {}), padding: '4px 6px', fontSize: 10 }}
                    onClick={() => setType(k)}>
                    <span style={{ marginRight: 3 }}>{v.symbol}</span>{v.label}
                  </button>
                ))}
                <button
                  style={{ ...styles.chip, ...(isGoalType ? styles.chipActive : {}), padding: '4px 6px', fontSize: 10 }}
                  onClick={() => setType(type === 'goal-monthly' ? 'goal-monthly' : 'goal-yearly')}>
                  <span style={{ marginRight: 3 }}>◎</span>목표
                </button>
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

          {/* 목표 범위 (연간/월간) */}
          {isGoalType && (
            <div style={{ marginTop: 4 }}>
              <label style={labelSmall}>목표 범위</label>
              <div style={styles.chipRow as React.CSSProperties}>
                <button
                  style={{ ...styles.chip, ...(type === 'goal-yearly' ? styles.chipActive : {}), padding: '4px 8px', fontSize: 10 }}
                  onClick={() => setType('goal-yearly')}>연간</button>
                <button
                  style={{ ...styles.chip, ...(type === 'goal-monthly' ? styles.chipActive : {}), padding: '4px 8px', fontSize: 10 }}
                  onClick={() => setType('goal-monthly')}>월간</button>
              </div>
            </div>
          )}

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

          {/* 날짜/시간 (목표가 아닌 경우) */}
          {!isGoalType && (
            <>
              {/* 시작일 + 종료일 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={labelSmall}>시작일</label>
                  <input type="date" style={inputSmall} value={date}
                    onChange={e => {
                      const newDate = e.target.value;
                      setDate(newDate);
                      if (endDate && endDate !== newDate) { setTime(''); setEndTime(''); }
                    }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={labelSmall}>종료일</label>
                  <div style={{ position: 'relative' }}>
                    <input type="date" style={inputSmall} value={endDate}
                      onChange={e => {
                        const newEnd = e.target.value;
                        setEndDate(newEnd);
                        if (newEnd && newEnd !== date) { setTime(''); setEndTime(''); }
                      }} />
                    {endDate && (
                      <button style={{
                        position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', padding: '2px 4px',
                        fontSize: 14, color: C.textMuted, cursor: 'pointer', lineHeight: 1,
                      }} onClick={() => setEndDate('')}>✕</button>
                    )}
                  </div>
                </div>
              </div>

              {/* 시간 (다일간이면 숨김) */}
              {!(endDate && endDate !== date) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={labelSmall}>시작 시간</label>
                    <div style={{ position: 'relative' }}>
                      <input type="time" style={inputSmall} value={time} onChange={e => setTime(e.target.value)} />
                      {time && (
                        <button style={{
                          position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', padding: '2px 4px',
                          fontSize: 14, color: C.textMuted, cursor: 'pointer', lineHeight: 1,
                        }} onClick={() => setTime('')}>✕</button>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={labelSmall}>종료 시간</label>
                    <div style={{ position: 'relative' }}>
                      <input type="time" style={inputSmall} value={endTime} onChange={e => setEndTime(e.target.value)} />
                      {endTime && (
                        <button style={{
                          position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', padding: '2px 4px',
                          fontSize: 14, color: C.textMuted, cursor: 'pointer', lineHeight: 1,
                        }} onClick={() => setEndTime('')}>✕</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {endDate && endDate !== date && (
                <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 8, background: `${C.blue}10`, fontSize: 11, color: C.blue }}>
                  다일간 항목은 시간 설정이 적용되지 않습니다.
                </div>
              )}
            </>
          )}

          {/* 목표일 경우 간단한 날짜 표시 */}
          {isGoalType && (
            <div style={{ marginTop: 4 }}>
              <label style={labelSmall}>기준 날짜</label>
              <input type="date" style={inputSmall} value={date}
                onChange={e => setDate(e.target.value)} />
            </div>
          )}

          {/* 태그 */}
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
                      border: `1px solid ${C.blue}30`, background: `${C.blue}08`,
                      color: C.blue, cursor: 'pointer',
                      fontFamily: '-apple-system, sans-serif',
                    }}
                    onClick={() => addTag(tag)}>#{tag}</button>
                ))}
              </div>
            )}
          </div>

          {/* 메모 */}
          <div style={{ marginTop: 4 }}>
            <label style={labelSmall}>메모</label>
            <input style={inputSmall} value={memo}
              placeholder="세부 내용이나 참고사항"
              onChange={e => setMemo(e.target.value)} />
          </div>

          {/* 반복 (목표가 아닌 경우) */}
          {!isGoalType && (
            <div style={{ marginTop: 4 }}>
              <label style={labelSmall}>반복</label>
              <div style={{ ...styles.chipRow as React.CSSProperties, flexWrap: 'nowrap' }}>
                {([
                  { key: 'none', label: '없음' },
                  { key: 'daily', label: '매일' },
                  { key: 'weekly', label: '매주' },
                  { key: 'monthly', label: '매월' },
                ]).map(opt => (
                  <button key={opt.key}
                    style={{ ...styles.chip, ...(recurringType === opt.key ? styles.chipActive : {}), padding: '4px 6px', fontSize: 10 }}
                    onClick={() => setRecurringType(opt.key)}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {recurringType !== 'none' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={labelSmall}>간격</label>
                    <input type="number" style={inputSmall} value={recurringInterval} min={1} max={99}
                      onChange={e => setRecurringInterval(Math.max(1, parseInt(e.target.value) || 1))} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={labelSmall}>반복 종료일</label>
                    <input type="date" style={inputSmall} value={recurringEndDate}
                      onChange={e => setRecurringEndDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
