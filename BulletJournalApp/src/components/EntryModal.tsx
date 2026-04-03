import React, { useState, useRef, useCallback } from 'react';
import { useTheme } from '../hooks/useDarkModeContext';
import { STATUS, TYPES, PRIORITY, STATUS_CYCLE_BY_TYPE, STATUS_LABEL_BY_TYPE } from '../utils/constants';
import { getTodayStr } from '../utils/date';
import { ModalState, Entry, RecurringConfig, Subtask } from '../types';
import { uid as genId } from '../utils/date';

interface EntryModalProps {
  modal: ModalState;
  onClose: () => void;
  onSaveEntry: (data: Partial<Entry>) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (data: Partial<Entry>) => void;
  onRequestMigrate?: (entry: Entry) => void;
  allTags?: string[];
  allEntries?: Entry[];  // 목표 연결용
}

const ENTRY_TYPES = {
  task:  TYPES.task,
  event: TYPES.event,
  note:  TYPES.note,
};

export function EntryModal({ modal, onClose, onSaveEntry, onDelete, onDuplicate, onRequestMigrate, allTags = [], allEntries = [] }: EntryModalProps) {
  const { styles, C } = useTheme();
  const existing = modal.entry;

  const [text, setText] = useState(existing?.text || '');
  const [type, setType] = useState<string>(existing?.type || modal.defaultType || 'task');
  const [status, setStatus] = useState<string>(existing?.status || 'todo');
  const [priority, setPriority] = useState<string>(existing?.priority || 'none');
  const [date, setDate] = useState<string>(existing?.date || modal.date || getTodayStr());
  const [endDate, setEndDate] = useState<string>(existing?.endDate || '');
  const [time, setTime] = useState<string>(existing?.time || modal.defaultTime || '');
  const [endTime, setEndTime] = useState<string>(existing?.endTime || '');
  const [allDay, setAllDay] = useState<boolean>(existing?.allDay || false);
  const savedTime = useRef<{ time: string; endTime: string }>({ time: '', endTime: '' });
  const [tags, setTags] = useState<string>(existing?.tags?.join(', ') || '');
  const [memo, setMemo] = useState<string>(existing?.memo || '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(existing?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [recurringType, setRecurringType] = useState<string>(existing?.recurring?.type || 'none');
  const [recurringInterval, setRecurringInterval] = useState<number>(existing?.recurring?.interval || 1);
  const [recurringEndDate, setRecurringEndDate] = useState<string>(existing?.recurring?.endDate || '');

  // 체크리스트 드래그 상태
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const dragItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleDragReorder = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const updated = [...subtasks];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setSubtasks(updated);
  }, [subtasks]);

  // 터치 드래그
  const handleSubtaskTouchStart = useCallback((e: React.TouchEvent, idx: number) => {
    dragStartY.current = e.touches[0].clientY;
    setDragIdx(idx);
    setDragOverIdx(idx);
  }, []);

  const handleSubtaskTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragIdx === null) return;
    const y = e.touches[0].clientY;
    for (let i = 0; i < dragItemRefs.current.length; i++) {
      const el = dragItemRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setDragOverIdx(i);
        break;
      }
    }
  }, [dragIdx]);

  const handleSubtaskTouchEnd = useCallback(() => {
    if (dragIdx !== null && dragOverIdx !== null) {
      handleDragReorder(dragIdx, dragOverIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, dragOverIdx, handleDragReorder]);

  // 마우스 드래그
  const handleSubtaskMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    setDragIdx(idx);
    setDragOverIdx(idx);

    const onMouseMove = (ev: MouseEvent) => {
      for (let i = 0; i < dragItemRefs.current.length; i++) {
        const el = dragItemRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          setDragOverIdx(i);
          break;
        }
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // use latest values via refs workaround — trigger end via state
      setDragIdx(prev => {
        setDragOverIdx(prevOver => {
          if (prev !== null && prevOver !== null) {
            setSubtasks(st => {
              if (prev === prevOver) return st;
              const updated = [...st];
              const [moved] = updated.splice(prev, 1);
              updated.splice(prevOver, 0, moved);
              return updated;
            });
          }
          return null;
        });
        return null;
      });
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);
  const [targetCount, setTargetCount] = useState<number>(existing?.targetCount || 0);
  const [linkedGoalId, setLinkedGoalId] = useState<string>(existing?.linkedGoalId || '');

  const isGoalType = type === 'goal-yearly' || type === 'goal-monthly';
  const activeGoals = allEntries.filter(e => (e.type === 'goal-yearly' || e.type === 'goal-monthly') && e.status !== 'done' && e.status !== 'cancelled');

  const handleSave = () => {
    if (!text.trim()) return;
    // 수정 모드에서 이관 상태로 변경 시 → MigrateModal로 위임
    if (modal.mode === 'edit' && existing && (status === 'migrated' || status === 'migrated_up')
      && existing.status !== 'migrated' && existing.status !== 'migrated_up' && onRequestMigrate) {
      onRequestMigrate(existing);
      onClose();
      return;
    }
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
      allDay: allDay || undefined,
      time: isMultiDay || isGoalType || allDay ? undefined : (time || undefined),
      endTime: isMultiDay || isGoalType || allDay ? undefined : (endTime || undefined),
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      memo: memo.trim() || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      recurring: isGoalType ? undefined : recurring,
      targetCount: isGoalType && targetCount > 0 ? targetCount : undefined,
      linkedGoalId: !isGoalType && linkedGoalId ? linkedGoalId : undefined,
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
                {!modal.hideGoalType && (
                  <button
                    style={{ ...styles.chip, ...(isGoalType ? styles.chipActive : {}), padding: '4px 6px', fontSize: 10 }}
                    onClick={() => setType('goal-yearly')}>
                    <span style={{ marginRight: 3 }}>◎</span>목표
                  </button>
                )}
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

          {/* 목표는 항상 goal-yearly */}

          {/* 상태 (메모는 상태 없음) */}
          {type !== 'note' && (
          <div style={{ marginTop: 4 }}>
            <label style={labelSmall}>상태</label>
            <div style={styles.chipRow as React.CSSProperties}>
              {(() => {
                const cycle = STATUS_CYCLE_BY_TYPE[type] || Object.keys(STATUS);
                const allowedStatuses = new Set([...cycle, 'migrated', 'migrated_up']);
                return Object.entries(STATUS)
                  .filter(([k]) => allowedStatuses.has(k))
                  .map(([k, v]) => {
                    const label = STATUS_LABEL_BY_TYPE[type]?.[k] || v.label;
                    return (
                      <button key={k}
                        style={{ ...styles.chip, ...(status === k ? { ...styles.chipActive, background: v.color } : {}), padding: '4px 6px', fontSize: 10 }}
                        onClick={() => setStatus(k)}>
                        <span style={{ marginRight: 3 }}>{v.symbol}</span>{label}
                      </button>
                    );
                  });
              })()}
            </div>
          </div>
          )}

          {/* 날짜/시간 (목표가 아닌 경우) */}
          {!isGoalType && (
            <>
              {/* 종일 토글 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <label style={{ ...labelSmall, margin: 0 }}>종일</label>
                <button style={{
                  width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: allDay ? C.blue : C.borderLight, position: 'relative', padding: 2,
                }} onClick={() => {
                  if (!allDay) {
                    savedTime.current = { time, endTime };
                    setTime('');
                    setEndTime('');
                  } else {
                    setTime(savedTime.current.time);
                    setEndTime(savedTime.current.endTime);
                  }
                  setAllDay(!allDay);
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: 'white',
                    transition: 'transform 0.2s', transform: allDay ? 'translateX(16px)' : 'translateX(0)',
                  }} />
                </button>
              </div>

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

              {/* 시간 (다일간/종일이면 숨김) */}
              {!allDay && !(endDate && endDate !== date) && (
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
              <label style={labelSmall}>목표 달성 시점</label>
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

          {/* 목표: 달성 목표 횟수 */}
          {isGoalType && (
            <div style={{ marginTop: 4 }}>
              <label style={labelSmall}>달성 목표 횟수 (0=횟수 무관)</label>
              <input type="number" style={inputSmall} value={targetCount} min={0} max={9999}
                placeholder="예: 40"
                onChange={e => setTargetCount(Math.max(0, parseInt(e.target.value) || 0))} />
              {modal.mode === 'edit' && existing && (() => {
                const linked = allEntries.filter(e => e.linkedGoalId === existing.id);
                const doneCount = linked.filter(e => e.status === 'done').length;
                return linked.length > 0 ? (
                  <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 4 }}>
                    연결된 항목: {linked.length}건 ({doneCount}건 완료)
                    {targetCount > 0 && ` — ${Math.round((doneCount / targetCount) * 100)}% 달성`}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* 일반 항목: 목표 연결 */}
          {!isGoalType && activeGoals.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <label style={labelSmall}>목표 연결</label>
              <select style={{ ...inputSmall, height: 34 }} value={linkedGoalId}
                onChange={e => setLinkedGoalId(e.target.value)}>
                <option value="">연결 안 함</option>
                {activeGoals.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.type === 'goal-yearly' ? '연간' : '월간'}: {g.text}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 서브태스크 (체크리스트) */}
          <div style={{ marginTop: 4 }}>
            <label style={labelSmall}>체크리스트</label>
            {subtasks.map((st, idx) => (
              <div key={st.id}
                ref={el => { dragItemRefs.current[idx] = el; }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
                  background: dragIdx === idx ? `${C.blue}15` : dragOverIdx === idx && dragIdx !== null && dragIdx !== idx ? `${C.blue}08` : 'transparent',
                  opacity: dragIdx === idx ? 0.7 : 1,
                  borderRadius: 6, padding: '1px 0',
                  borderTop: dragOverIdx === idx && dragIdx !== null && dragIdx > idx ? `2px solid ${C.blue}` : '2px solid transparent',
                  borderBottom: dragOverIdx === idx && dragIdx !== null && dragIdx < idx ? `2px solid ${C.blue}` : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
                onTouchMove={handleSubtaskTouchMove}
                onTouchEnd={handleSubtaskTouchEnd}
              >
                <span style={{
                  fontSize: 14, color: C.textMuted, cursor: 'grab', padding: '2px 2px',
                  flexShrink: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
                } as React.CSSProperties}
                  onTouchStart={e => handleSubtaskTouchStart(e, idx)}
                  onMouseDown={e => handleSubtaskMouseDown(e, idx)}
                >⠿</span>
                <input type="checkbox" checked={st.done}
                  style={{ width: 16, height: 16, accentColor: C.green, flexShrink: 0 }}
                  onChange={() => {
                    const updated = [...subtasks];
                    updated[idx] = { ...st, done: !st.done };
                    setSubtasks(updated);
                  }} />
                <input style={{ ...inputSmall, flex: 1, textDecoration: st.done ? 'line-through' : 'none', color: st.done ? C.textMuted : C.textPrimary }}
                  value={st.text}
                  onChange={e => {
                    const updated = [...subtasks];
                    updated[idx] = { ...st, text: e.target.value };
                    setSubtasks(updated);
                  }} />
                <button style={{
                  background: 'none', border: 'none', fontSize: 14, color: C.textMuted,
                  cursor: 'pointer', padding: '2px 4px', flexShrink: 0,
                }} onClick={() => setSubtasks(subtasks.filter((_, j) => j !== idx))}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...inputSmall, flex: 1 }}
                placeholder="새 항목 추가..."
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSubtask.trim()) {
                    setSubtasks([...subtasks, { id: genId(), text: newSubtask.trim(), done: false }]);
                    setNewSubtask('');
                  }
                }} />
              <button style={{
                background: C.primary, color: C.headerText, border: 'none',
                borderRadius: 6, padding: '0 10px', fontSize: 14, cursor: 'pointer',
                fontFamily: '-apple-system, sans-serif',
              }} onClick={() => {
                if (newSubtask.trim()) {
                  setSubtasks([...subtasks, { id: genId(), text: newSubtask.trim(), done: false }]);
                  setNewSubtask('');
                }
              }}>+</button>
            </div>
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

          {/* 삭제 버튼 (수정 모드에서만) */}
          {modal.mode === 'edit' && modal.entry && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {onDuplicate && (
                <button
                  style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    border: `1.5px solid ${C.border}`, background: 'transparent',
                    color: C.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: '-apple-system, sans-serif',
                  }}
                  onClick={() => {
                    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
                    onDuplicate({
                      text: text.trim(), type: type as Entry['type'],
                      status: 'todo' as Entry['status'], priority: priority as Entry['priority'],
                      date, endDate: endDate || undefined,
                      time: time || undefined, endTime: endTime || undefined,
                      tags: parsedTags.length > 0 ? parsedTags : undefined,
                      memo: memo.trim() || undefined,
                    });
                    onClose();
                  }}
                >복제</button>
              )}
              {onDelete && (
                <button
                  style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    border: `1.5px solid ${C.accent}`, background: 'transparent',
                    color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: '-apple-system, sans-serif',
                  }}
                  onClick={() => {
                    if (confirm('이 항목을 삭제하시겠습니까?')) {
                      onDelete(modal.entry!.id);
                      onClose();
                    }
                  }}
                >삭제</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
