import React, { useState } from 'react';
import { getStyles } from '../styles/theme';
import { exportAllData, importAllData, getAutoBackup, restoreAutoBackup, shareBackup, getStorageUsage } from '../utils/storage';

type DarkModePref = 'system' | 'light' | 'dark';

interface TagInfo {
  name: string;
  count: number;
}

interface SettingsScreenProps {
  onClose: () => void;
  tagList?: TagInfo[];
  onDeleteTag?: (tag: string) => void;
  isDark?: boolean;
  darkModePref?: DarkModePref;
  onDarkModeChange?: (pref: DarkModePref) => void;
}

export function SettingsScreen({
  onClose, tagList = [], onDeleteTag, isDark = false, darkModePref = 'system', onDarkModeChange,
}: SettingsScreenProps) {
  const styles = getStyles(isDark);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bullet-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    try {
      importAllData(importText);
      alert('데이터를 가져왔습니다. 페이지를 새로고침합니다.');
      window.location.reload();
    } catch {
      alert('잘못된 형식입니다.');
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxHeight: '90vh' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader as React.CSSProperties}>
          <h3 style={styles.modalTitle}>설정</h3>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {/* Dark Mode */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsLabel}>화면 모드</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { key: 'system' as DarkModePref, label: '시스템' },
                { key: 'light' as DarkModePref, label: '라이트' },
                { key: 'dark' as DarkModePref, label: '다크' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
                    border: darkModePref === opt.key ? 'none' : `1.5px solid ${isDark ? '#3a3530' : '#ddd5c9'}`,
                    background: darkModePref === opt.key ? (isDark ? '#e8e0d4' : '#2c2416') : 'transparent',
                    color: darkModePref === opt.key ? (isDark ? '#1a1a1a' : 'white') : (isDark ? '#a89888' : '#6b5d4d'),
                    transition: 'all 0.2s',
                  }}
                  onClick={() => onDarkModeChange?.(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Management */}
          {tagList.length > 0 && (
            <div style={styles.settingsSection}>
              <div style={styles.settingsLabel}>태그 관리 ({tagList.length}개)</div>
              <p style={{ fontSize: 11, color: isDark ? '#6b5d4d' : '#b8a99a', marginBottom: 8 }}>
                사용 빈도순 정렬. 삭제하면 모든 항목에서 해당 태그가 제거됩니다.
              </p>
              {tagList.map(t => (
                <div key={t.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0', borderBottom: `1px solid ${isDark ? '#3a3530' : '#f5f0e8'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 12, color: '#3a7ca5', background: '#3a7ca510',
                      padding: '2px 8px', borderRadius: 6,
                    }}>#{t.name}</span>
                    <span style={{ fontSize: 10, color: isDark ? '#6b5d4d' : '#b8a99a' }}>{t.count}개</span>
                  </div>
                  {onDeleteTag && (
                    <button style={{
                      background: 'none', border: '1px solid #c0583f40', color: '#c0583f',
                      fontSize: 10, padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                      fontFamily: '-apple-system, sans-serif',
                    }} onClick={() => {
                      if (confirm(`"${t.name}" 태그를 모든 항목에서 제거하시겠습니까?`)) {
                        onDeleteTag(t.name);
                      }
                    }}>삭제</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Data Management */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsLabel}>데이터 관리</div>
            {(() => {
              const { usedKB, pct } = getStorageUsage();
              return (
                <div style={{
                  marginBottom: 8, padding: '8px 12px', borderRadius: 8,
                  background: isDark ? '#333' : '#f5f0e8',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: isDark ? '#a89888' : '#6b5d4d', marginBottom: 4 }}>
                    <span>저장소 사용량</span>
                    <span style={{ color: pct > 80 ? '#c0583f' : undefined }}>{usedKB}KB / 5,120KB ({pct}%)</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: isDark ? '#555' : '#ddd5c9' }}>
                    <div style={{
                      height: '100%', borderRadius: 2, width: `${Math.min(100, pct)}%`,
                      background: pct > 80 ? '#c0583f' : pct > 50 ? '#c0883f' : '#3a7ca5',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  {pct > 80 && (
                    <div style={{ fontSize: 10, color: '#c0583f', marginTop: 4 }}>
                      ⚠ 저장 공간이 부족합니다. 백업 후 오래된 데이터를 정리해주세요.
                    </div>
                  )}
                </div>
              );
            })()}
            <p style={{ fontSize: 11, color: isDark ? '#6b5d4d' : '#b8a99a', marginBottom: 8, lineHeight: 1.5 }}>
              데이터는 기기의 로컬 저장소에 보관됩니다.
              Safari 데이터를 삭제하면 모든 기록이 사라질 수 있으니 정기적으로 백업해주세요.
            </p>
            {(() => {
              const backup = getAutoBackup();
              return backup ? (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, marginBottom: 10,
                  background: isDark ? '#333' : '#f5f0e8', fontSize: 11, color: isDark ? '#a89888' : '#6b5d4d',
                }}>
                  자동 백업: {new Date(backup.time).toLocaleString('ko-KR')}
                  <button style={{
                    marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 6,
                    border: '1px solid #3a7ca540', background: 'transparent', color: '#3a7ca5',
                    cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
                  }} onClick={() => {
                    if (confirm('자동 백업 데이터를 복원하시겠습니까? 현재 데이터가 덮어씌워집니다.')) {
                      if (restoreAutoBackup()) {
                        alert('복원되었습니다. 페이지를 새로고침합니다.');
                        window.location.reload();
                      }
                    }
                  }}>복원</button>
                </div>
              ) : null;
            })()}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button style={{
                ...styles.successBtn, background: '#c0883f',
              }} onClick={() => shareBackup()}>
                📤 공유로 백업
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button style={styles.successBtn} onClick={handleExport}>
                데이터 내보내기 (JSON)
              </button>
              <button style={{
                ...styles.successBtn, background: '#3a7ca5',
              }} onClick={() => setShowImport(!showImport)}>
                데이터 가져오기
              </button>
            </div>
            {showImport && (
              <div>
                <textarea
                  style={{
                    ...styles.input, minHeight: 100, resize: 'vertical',
                    fontFamily: 'monospace', fontSize: 12,
                  }}
                  placeholder="내보낸 JSON 데이터를 붙여넣기 하세요"
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                />
                <button style={{ ...styles.saveBtn, marginTop: 8 }} onClick={handleImport}>
                  가져오기 실행
                </button>
              </div>
            )}
          </div>

          {/* About */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsLabel}>정보</div>
            <p style={{ fontSize: 12, color: isDark ? '#a89888' : '#6b5d4d', lineHeight: 1.6 }}>
              Bullet Journal v1.0
              <br />
              개인용 불렛저널 PWA
              <br />
              아이폰에서 Safari로 접속 → 공유 → "홈 화면에 추가"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
