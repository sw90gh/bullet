import React, { useState } from 'react';
import { styles } from '../styles/theme';
import { exportAllData, importAllData } from '../utils/storage';
import { NotionConfig } from '../types';

interface TagInfo {
  name: string;
  count: number;
}

interface SettingsScreenProps {
  onClose: () => void;
  notionConfig: NotionConfig | null;
  onNotionConnect: (token: string, dbId: string) => void;
  onNotionDisconnect: () => void;
  onNotionSync: () => void;
  syncing: boolean;
  lastError: string | null;
  tagList?: TagInfo[];
  onDeleteTag?: (tag: string) => void;
}

export function SettingsScreen({
  onClose, notionConfig, onNotionConnect, onNotionDisconnect, onNotionSync, syncing, lastError,
  tagList = [], onDeleteTag,
}: SettingsScreenProps) {
  const [token, setToken] = useState('');
  const [dbId, setDbId] = useState('');
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
          {/* Tag Management */}
          {tagList.length > 0 && (
            <div style={styles.settingsSection}>
              <div style={styles.settingsLabel}>태그 관리 ({tagList.length}개)</div>
              <p style={{ fontSize: 11, color: '#b8a99a', marginBottom: 8 }}>
                사용 빈도순 정렬. 삭제하면 모든 항목에서 해당 태그가 제거됩니다.
              </p>
              {tagList.map(t => (
                <div key={t.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0', borderBottom: '1px solid #f5f0e8',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 12, color: '#3a7ca5', background: '#3a7ca510',
                      padding: '2px 8px', borderRadius: 6,
                    }}>#{t.name}</span>
                    <span style={{ fontSize: 10, color: '#b8a99a' }}>{t.count}개</span>
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

          {/* Notion Integration */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsLabel}>Notion 캘린더 연동</div>
            {notionConfig?.connected ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: '#4a8c3f', fontWeight: 600 }}>● 연결됨</span>
                  <span style={{ fontSize: 11, color: '#b8a99a' }}>
                    {notionConfig.lastSync
                      ? `마지막 동기화: ${new Date(notionConfig.lastSync).toLocaleString('ko-KR')}`
                      : '아직 동기화하지 않음'}
                  </span>
                </div>
                {lastError && (
                  <p style={{ fontSize: 12, color: '#c0583f', marginBottom: 8 }}>{lastError}</p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={styles.successBtn} onClick={onNotionSync} disabled={syncing}>
                    {syncing ? '동기화 중...' : '지금 동기화'}
                  </button>
                  <button style={styles.dangerBtn} onClick={onNotionDisconnect}>연결 해제</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 12, color: '#6b5d4d', marginBottom: 12, lineHeight: 1.6 }}>
                  Notion Integration Token과 Database ID를 입력하여 연동합니다.
                  <br />
                  Notion에서 Integration을 생성한 후, 대상 데이터베이스에 연결해주세요.
                </p>
                <label style={styles.fieldLabel}>Integration Token</label>
                <input
                  style={{ ...styles.input, marginBottom: 8, fontSize: 13 }}
                  placeholder="secret_..."
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  type="password"
                />
                <label style={styles.fieldLabel}>Database ID</label>
                <input
                  style={{ ...styles.input, marginBottom: 12, fontSize: 13 }}
                  placeholder="32자리 ID"
                  value={dbId}
                  onChange={e => setDbId(e.target.value)}
                />
                <button
                  style={{ ...styles.saveBtn, opacity: token && dbId ? 1 : 0.5 }}
                  onClick={() => { if (token && dbId) onNotionConnect(token, dbId); }}
                >
                  연결하기
                </button>
              </div>
            )}
          </div>

          {/* Data Management */}
          <div style={styles.settingsSection}>
            <div style={styles.settingsLabel}>데이터 관리</div>
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
            <p style={{ fontSize: 12, color: '#6b5d4d', lineHeight: 1.6 }}>
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
